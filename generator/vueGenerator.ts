import type {
  XFormDatePickerProps,
  XFormInputProps,
  XFormSelectProps,
  XButtonProps,
  XFieldGroupProps,
  XInputProps,
  XQueryFormProps,
  XTableProps,
} from "../src/core/metadata/metadata.types";
import type {
  IRComponentNode,
  IRContainerNode,
  IRDocument,
  IRLayout,
  IRLayoutChild,
  IRNode,
  IRPaint,
  IRStyle,
} from "../src/core/ir/ir.types";

export interface VueGeneratorOptions {
  componentPrefix?: string;
}

/** Escapes text before it is placed into generated Vue markup. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Escapes a JSON expression for a single-quoted Vue template attribute. */
function escapeVueExpressionAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("'", "&#39;");
}

/** Converts arbitrary design names into safe JavaScript identifiers. */
function toIdentifier(value: string, fallback: string): string {
  const identifier = value.replace(/[^A-Za-z0-9_$]/g, "");
  if (!identifier) return fallback;
  return /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;
}

/** Converts an action name into a handler name used by generated Vue code. */
function toHandlerName(action: string): string {
  const words = action.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const suffix = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return `handle${suffix || "Action"}`;
}

/** Adds indentation to every line of a generated markup fragment. */
function indent(text: string, level: number): string {
  const prefix = "  ".repeat(level);
  return text
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");
}

interface RenderContext {
  styleRules: string[];
  registeredStyles: Set<string>;
  classNames: Map<string, string>;
  layoutIndex: number;
  itemIndex: number;
  structureIndex: number;
}

/** Formats a numeric Penpot value as a compact CSS pixel value. */
function px(value: number): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(3))}px`;
}

/** Converts a Penpot paint into a CSS color while preserving solid opacity. */
function cssColor(paint: IRPaint | undefined): string | null {
  if (!paint?.color) return null;

  const normalized = paint.color.trim();
  const match = normalized.match(/^#([0-9a-f]{3,8})$/i);
  if (paint.opacity >= 0.999 || !match) return normalized;

  const hex = match[1];
  const expand = (value: string): string => value.length === 1 ? `${value}${value}` : value;
  const rgb = hex.length <= 4
    ? [hex[0], hex[1], hex[2]].map((value) => parseInt(expand(value), 16))
    : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((value) => parseInt(value, 16));
  const sourceAlpha = hex.length === 4
    ? parseInt(expand(hex[3]), 16) / 255
    : hex.length === 8
      ? parseInt(hex.slice(6, 8), 16) / 255
      : 1;
  const alpha = Math.max(0, Math.min(1, sourceAlpha * paint.opacity));
  return `rgba(${rgb.join(", ")}, ${Number(alpha.toFixed(3))})`;
}

/** Normalizes Penpot numeric text values into valid CSS lengths. */
function cssTextLength(value: string | undefined, property: "font-size" | "line-height" | "letter-spacing"): string | null {
  if (!value || value === "mixed") return null;
  if (value === "auto") return property === "line-height" ? "normal" : null;
  if (property === "line-height" && /^\d*\.\d+$/.test(value)) return value;
  return /^-?(?:\d+\.?\d*|\.\d+)$/.test(value) ? `${value}px` : value;
}

/** Formats visual IR fields as CSS declarations shared by all generated nodes. */
function buildVisualStyleDeclarations(style: IRStyle | undefined): string[] {
  if (!style) return [];

  const declarations: string[] = [];
  const fill = cssColor(style.fill);
  const stroke = style.stroke;
  const strokeColor = cssColor(stroke ? { color: stroke.color, opacity: stroke.opacity } : undefined);

  if (fill) declarations.push(`background-color: ${fill};`);
  if (stroke && strokeColor) {
    declarations.push(`border: ${px(stroke.width)} ${stroke.style} ${strokeColor};`);
  }
  if (style.borderRadius) {
    const radius = style.borderRadius;
    declarations.push(
      `border-radius: ${px(radius.topLeft)} ${px(radius.topRight)} ${px(radius.bottomRight)} ${px(radius.bottomLeft)};`,
    );
  }
  if (style.opacity !== undefined) declarations.push(`opacity: ${style.opacity};`);
  if (style.shadow) {
    const shadow = style.shadow;
    const shadowColor = cssColor({ color: shadow.color, opacity: shadow.opacity }) ?? shadow.color;
    const inset = shadow.style === "inner-shadow" ? "inset " : "";
    declarations.push(
      `box-shadow: ${inset}${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadowColor};`,
    );
  }
  if (style.blur) declarations.push(`filter: blur(${px(style.blur)});`);

  const text = style.text;
  if (!text) return declarations;

  const textColor = cssColor(text.color);
  if (textColor) declarations.push(`color: ${textColor};`);
  if (text.fontFamily) declarations.push(`font-family: ${JSON.stringify(text.fontFamily)};`);
  const fontSize = cssTextLength(text.fontSize, "font-size");
  if (fontSize) declarations.push(`font-size: ${fontSize};`);
  if (text.fontWeight) declarations.push(`font-weight: ${text.fontWeight};`);
  if (text.fontStyle) declarations.push(`font-style: ${text.fontStyle};`);
  const lineHeight = cssTextLength(text.lineHeight, "line-height");
  if (lineHeight) declarations.push(`line-height: ${lineHeight};`);
  const letterSpacing = cssTextLength(text.letterSpacing, "letter-spacing");
  if (letterSpacing) declarations.push(`letter-spacing: ${letterSpacing};`);
  if (text.textTransform) declarations.push(`text-transform: ${text.textTransform};`);
  if (text.textDecoration) declarations.push(`text-decoration: ${text.textDecoration};`);
  if (text.align) declarations.push(`text-align: ${text.align};`);
  if (text.verticalAlign) declarations.push(`vertical-align: ${text.verticalAlign};`);

  return declarations;
}

/** Formats one generated class rule from a list of CSS declarations. */
function cssRule(className: string, declarations: string[]): string {
  return `.${className} {\n${declarations.map((declaration) => `  ${declaration}`).join("\n")}\n}`;
}

/** Maps Penpot alignment keywords to broadly compatible CSS values. */
function cssAlign(value: string): string {
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  return value;
}

/** Converts a Penpot layout sizing mode into a CSS dimension declaration. */
function cssSizing(
  property: "width" | "height",
  sizing: string | null | undefined,
  sourceValue: number,
): string | null {
  if (sizing === "fill") return `${property}: 100%;`;
  if (sizing === "fit-content") return `${property}: fit-content;`;
  if (sizing === "fix") return `${property}: ${px(sourceValue)};`;
  return sizing === "auto" ? `${property}: auto;` : null;
}

/** Converts one grid track definition into the matching CSS track value. */
function cssGridTrack(track: { type: string; value: number | null }): string {
  if (track.type === "fixed") return px(track.value ?? 0);
  if (track.type === "percent") return `${track.value ?? 0}%`;
  if (track.type === "flex") return `${track.value ?? 1}fr`;
  return "auto";
}

/** Builds CSS declarations for a container's Penpot layout system. */
function buildLayoutRule(
  className: string,
  layout: IRLayout,
  source: IRNode["source"],
): string {
  const declarations = [
    "box-sizing: border-box;",
    layout.type === "flex" ? "display: flex;" : "display: grid;",
    `row-gap: ${px(layout.rowGap)};`,
    `column-gap: ${px(layout.columnGap)};`,
    `padding: ${px(layout.padding.top)} ${px(layout.padding.right)} ${px(layout.padding.bottom)} ${px(layout.padding.left)};`,
    cssSizing("width", layout.horizontalSizing, source.width),
    cssSizing("height", layout.verticalSizing, source.height),
    ...buildVisualStyleDeclarations(source.style),
  ].filter((declaration): declaration is string => Boolean(declaration));

  if (layout.type === "flex") {
    declarations.push(`flex-direction: ${layout.direction};`);
    if (layout.wrap) declarations.push(`flex-wrap: ${layout.wrap};`);
    if (layout.alignItems) declarations.push(`align-items: ${cssAlign(layout.alignItems)};`);
    if (layout.alignContent) declarations.push(`align-content: ${cssAlign(layout.alignContent)};`);
    if (layout.justifyContent) declarations.push(`justify-content: ${cssAlign(layout.justifyContent)};`);
  } else {
    declarations.push(`grid-auto-flow: ${layout.direction};`);
    if (layout.rows.length) {
      declarations.push(`grid-template-rows: ${layout.rows.map(cssGridTrack).join(" ")};`);
    }
    if (layout.columns.length) {
      declarations.push(`grid-template-columns: ${layout.columns.map(cssGridTrack).join(" ")};`);
    }
    if (layout.alignItems) declarations.push(`align-items: ${cssAlign(layout.alignItems)};`);
    if (layout.alignContent) declarations.push(`align-content: ${cssAlign(layout.alignContent)};`);
    if (layout.justifyItems) declarations.push(`justify-items: ${cssAlign(layout.justifyItems)};`);
    if (layout.justifyContent) declarations.push(`justify-content: ${cssAlign(layout.justifyContent)};`);
  }

  return cssRule(className, declarations);
}

/** Builds CSS declarations for one child inside a Penpot layout. */
function buildLayoutChildRule(
  className: string,
  layoutChild: IRLayoutChild,
  node: IRNode,
  parent: IRNode,
): string {
  const declarations = [
    "box-sizing: border-box;",
    cssSizing("width", layoutChild.horizontalSizing, node.source.width),
    cssSizing("height", layoutChild.verticalSizing, node.source.height),
    layoutChild.alignSelf !== "auto"
      ? `align-self: ${cssAlign(layoutChild.alignSelf)};`
      : null,
    `margin: ${px(layoutChild.margin.top)} ${px(layoutChild.margin.right)} ${px(layoutChild.margin.bottom)} ${px(layoutChild.margin.left)};`,
    layoutChild.zIndex ? `z-index: ${layoutChild.zIndex};` : null,
  ].filter((declaration): declaration is string => Boolean(declaration));

  if (layoutChild.absolute) {
    declarations.unshift(
      "position: absolute;",
      `left: ${px(node.source.x - parent.source.x)};`,
      `top: ${px(node.source.y - parent.source.y)};`,
    );
  }

  return `.${className} {\n${declarations.map((declaration) => `  ${declaration}`).join("\n")}\n}`;
}

/** Registers a layout rule once so nested rendering can share one style block. */
function registerLayoutStyle(
  node: IRNode,
  context: RenderContext,
): string {
  const key = `layout:${node.id}`;
  const className = context.classNames.get(key) ?? `p-layout-${++context.layoutIndex}`;
  context.classNames.set(key, className);
  if (node.layout && !context.registeredStyles.has(className)) {
    context.registeredStyles.add(className);
    context.styleRules.push(buildLayoutRule(className, node.layout, node.source));
  }
  return className;
}

/** Registers a child layout rule once and returns its CSS class name. */
function registerLayoutChildStyle(
  node: IRNode,
  parent: IRNode,
  context: RenderContext,
): string | null {
  if (!node.layoutChild) return null;

  const key = `item:${node.id}`;
  const className = context.classNames.get(key) ?? `p-item-${++context.itemIndex}`;
  context.classNames.set(key, className);
  if (!context.registeredStyles.has(className)) {
    context.registeredStyles.add(className);
    context.styleRules.push(
      buildLayoutChildRule(className, node.layoutChild, node, parent),
    );
  }
  return className;
}

/** Registers a relative box for an unmarked container with freeform children. */
function registerStructureStyle(node: IRContainerNode, context: RenderContext): string {
  const key = `structure:${node.id}`;
  const className = context.classNames.get(key) ?? `p-structure-${++context.structureIndex}`;
  context.classNames.set(key, className);
  if (!context.registeredStyles.has(className)) {
    context.registeredStyles.add(className);
    context.styleRules.push(cssRule(className, [
      "box-sizing: border-box;",
      "position: relative;",
      `width: ${px(node.source.width)};`,
      `height: ${px(node.source.height)};`,
      "flex: 0 0 auto;",
      ...buildVisualStyleDeclarations(node.source.style),
    ]));
  }
  return className;
}

/** Registers absolute geometry for any child inside a freeform container. */
function registerFreeformNodeStyle(
  node: IRNode,
  parent: IRNode,
  context: RenderContext,
): string {
  const key = `node:${node.id}`;
  const className = context.classNames.get(key) ?? `p-node-${++context.structureIndex}`;
  context.classNames.set(key, className);
  if (!context.registeredStyles.has(className)) {
    context.registeredStyles.add(className);
    context.styleRules.push(cssRule(className, [
      "box-sizing: border-box;",
      "position: absolute;",
      `left: ${px(node.source.x - parent.source.x)};`,
      `top: ${px(node.source.y - parent.source.y)};`,
      `width: ${px(node.source.width)};`,
      `height: ${px(node.source.height)};`,
      ...buildVisualStyleDeclarations(node.source.style),
    ]));
  }
  return className;
}

/** Registers visual-only styles for a leaf that participates in Flex or Grid. */
function registerVisualStyle(node: IRNode, context: RenderContext): string | null {
  const declarations = buildVisualStyleDeclarations(node.source.style);
  if (!declarations.length) return null;

  const key = `visual:${node.id}`;
  const className = context.classNames.get(key) ?? `p-visual-${++context.structureIndex}`;
  context.classNames.set(key, className);
  if (!context.registeredStyles.has(className)) {
    context.registeredStyles.add(className);
    context.styleRules.push(cssRule(className, declarations));
  }
  return className;
}

/** Wraps generated content so a child layout rule can control its box. */
function wrapWithClass(content: string, className: string, level: number): string {
  return `${indent(`<div class="${className}">`, level)}\n${indent(content, 1)}\n${indent("</div>", level)}`;
}

/** Renders the shared v-model and placeholder attributes for a Form control. */
function renderFormControl(
  tag: string,
  props: { model: string; prop: string; placeholder?: string },
  extraAttributes = "",
): string {
  const model = toIdentifier(props.model, "query");
  const prop = toIdentifier(props.prop, "field");
  const binding = `${model}.${prop}`;
  const placeholder = props.placeholder
    ? ` placeholder="${escapeHtml(props.placeholder)}"`
    : "";
  return `<${tag} v-model="${binding}"${placeholder}${extraAttributes} />`;
}

/** Reads visible text captured from a Penpot text shape. */
function readNodeText(node: IRNode): string {
  return node.source.text?.trim() ?? "";
}

/** Flattens descendants so field inference can inspect nested control groups. */
function getDescendants(node: IRNode): IRNode[] {
  return node.children.flatMap((child) => [child, ...getDescendants(child)]);
}

/** Returns the semantic suffix from a dotted Penpot layer name. */
function readNameSuffix(name: string, prefix: string): string {
  const normalizedPrefix = `${prefix.toLowerCase()}.`;
  return name.toLowerCase().startsWith(normalizedPrefix)
    ? name.slice(normalizedPrefix.length)
    : "";
}

interface InferredField {
  model: string;
  prop: string;
  label: string;
  placeholder?: string;
  control: "input" | "select" | "date";
}

/** Infers a form control kind from layer names and visible placeholder text. */
function inferControlType(
  fieldNode: IRNode,
  controlNode: IRNode | undefined,
  surfaceNode: IRNode | undefined,
  controlDescendants: IRNode[],
): InferredField["control"] | null {
  const surfacePrefix = surfaceNode?.name.split(".")[0].toLowerCase();
  if (surfacePrefix === "select") return "select";
  if (surfacePrefix === "date") return "date";
  if (surfacePrefix === "input") return "input";

  const visibleText = controlDescendants.map(readNodeText).filter(Boolean).join(" ");
  const fieldName = `${fieldNode.name} ${controlNode?.name ?? ""}`.toLowerCase();
  if (visibleText.includes("日期") || /date/.test(fieldName)) return "date";
  if (visibleText.includes("⌄") || visibleText.includes("请选择状态") || /select/.test(fieldName)) {
    return "select";
  }

  return controlNode ? "input" : null;
}

/** Infers a basic form field from the project's layer naming convention. */
function inferField(node: IRNode): InferredField | null {
  if (node.nodeType !== "container") return null;

  const labelNode = node.children.find((child) => /^label\./i.test(child.name));
  const controlNode = node.children.find((child) => /^control\./i.test(child.name));
  const searchRoot = controlNode ?? node;
  const controlDescendants = [searchRoot, ...getDescendants(searchRoot)];
  const surfaceNode = controlDescendants.find((child) => /^(input|select|date)\.surface$/i.test(child.name));
  if (!labelNode || (!controlNode && !surfaceNode)) return null;

  const control = inferControlType(node, controlNode, surfaceNode, controlDescendants);
  if (!control) return null;

  const surfacePrefix = surfaceNode?.name.split(".")[0].toLowerCase();
  const labelSuffix = readNameSuffix(labelNode.name, "label");
  const fieldSuffix = labelSuffix || node.name.split(".").at(-1) || "field";
  const placeholderNode = controlDescendants.find((child) => {
    const childName = child.name.toLowerCase();
    return (
      (surfacePrefix && childName === `${surfacePrefix}.placeholder`) ||
      childName === "input.placeholder" ||
      childName === "select.placeholder" ||
      childName === "date.placeholder"
    );
  }) ?? controlDescendants.find((child) => /^(请输入|请选择)/.test(readNodeText(child)));

  return {
    model: "form",
    prop: toIdentifier(fieldSuffix, "field"),
    label: readNodeText(labelNode) || fieldSuffix,
    placeholder: placeholderNode ? readNodeText(placeholderNode) || undefined : undefined,
    control,
  };
}

/** Renders a field inferred from label and control surface layers. */
function renderInferredField(
  field: InferredField,
  level: number,
  options: Required<VueGeneratorOptions>,
): string {
  const prefix = options.componentPrefix;
  const tag =
    field.control === "select"
      ? `${prefix}Select`
      : field.control === "date"
        ? `${prefix}DatePicker`
        : `${prefix}Input`;
  const extraAttributes = field.control === "date" ? ' type="date"' : "";
  const control = renderFormControl(
    tag,
    { model: field.model, prop: field.prop, placeholder: field.placeholder },
    extraAttributes,
  );

  return [
    indent(`<${prefix}FormItem label="${escapeHtml(field.label)}" prop="${escapeHtml(field.prop)}">`, level),
    indent(control, level + 1),
    indent(`</${prefix}FormItem>`, level),
  ].join("\n");
}

/** Renders an unmarked leaf as visible text or a geometry-preserving element. */
function renderGenericLeaf(
  node: IRNode,
  level: number,
  context: RenderContext,
  parent?: IRNode,
): string {
  const visualClassName = parent?.layout ? registerVisualStyle(node, context) : null;
  const classNames = [visualClassName].filter(Boolean).join(" ");
  const classAttribute = classNames ? ` class="${classNames}"` : "";

  if (node.source.shapeType === "text") {
    const text = readNodeText(node) || readNameSuffix(node.name, "label") || node.name;
    return indent(`<span${classAttribute}>${escapeHtml(text)}</span>`, level);
  }

  return indent(`<div${classAttribute} aria-hidden="true"></div>`, level);
}

/** Renders one semantic component node into the generic Vue POC vocabulary. */
function renderComponent(
  node: IRComponentNode,
  level: number,
  options: Required<VueGeneratorOptions>,
  context: RenderContext,
): string {
  const prefix = options.componentPrefix;

  if (node.component === "XButton") {
    const props = node.props as XButtonProps;
    const type = props.type ? ` type="${escapeHtml(props.type)}"` : "";
    const action = props.action
      ? ` @click="${toHandlerName(props.action)}"`
      : "";
    return indent(
      `<${prefix}Button${type}${action}>${escapeHtml(props.text)}</${prefix}Button>`,
      level,
    );
  }

  if (node.component === "XInput") {
    const props = node.props as XInputProps;
    const model = toIdentifier(props.model, "query");
    const prop = toIdentifier(props.prop, "field");
    const binding = `${model}.${prop}`;
    const placeholder = props.placeholder
      ? ` placeholder="${escapeHtml(props.placeholder)}"`
      : "";
    const tag = props.controlType === "select" ? `${prefix}Select` : `${prefix}Input`;
    return indent(`<${tag} v-model="${binding}"${placeholder} />`, level);
  }

  if (node.component === "XFormInput") {
    const props = node.props as XFormInputProps;
    const clearable = props.clearable ? " clearable" : "";
    return indent(renderFormControl(`${prefix}Input`, props, clearable), level);
  }

  if (node.component === "XFormSelect") {
    const props = node.props as XFormSelectProps;
    const clearable = props.clearable ? " clearable" : "";
    const options = props.options?.length
      ? ` :options='${escapeVueExpressionAttribute(JSON.stringify(props.options))}'`
      : "";
    return indent(
      renderFormControl(`${prefix}Select`, props, `${clearable}${options}`),
      level,
    );
  }

  if (node.component === "XFormDatePicker") {
    const props = node.props as XFormDatePickerProps;
    const attributes = [
      props.type ? ` type="${escapeHtml(props.type)}"` : "",
      props.format ? ` format="${escapeHtml(props.format)}"` : "",
      props.valueFormat ? ` value-format="${escapeHtml(props.valueFormat)}"` : "",
      props.clearable ? " clearable" : "",
    ].join("");
    return indent(renderFormControl(`${prefix}DatePicker`, props, attributes), level);
  }

  if (node.component === "XFieldGroup") {
    const props = node.props as XFieldGroupProps;
    const prop = props.prop ? ` prop="${escapeHtml(props.prop)}"` : "";
    if (node.children.length === 0) {
      return indent(
        `<${prefix}FormItem label="${escapeHtml(props.label)}"${prop} />`,
        level,
      );
    }

    const children = node.children
      .map((child) => renderNode(child, level + 1, options, context, node))
      .join("\n");
    return `${indent(`<${prefix}FormItem label="${escapeHtml(props.label)}"${prop}>`, level)}\n${children}\n${indent(`</${prefix}FormItem>`, level)}`;
  }

  if (node.component === "XQueryForm") {
    const props = node.props as XQueryFormProps;
    const model = toIdentifier(props.model, "query");
    const fields = props.fields
      .map((field) => {
        const binding = `${model}.${toIdentifier(field.prop, "field")}`;
        const control =
          field.type === "tableSelect"
            ? `<TableSelect v-model="${binding}" />`
            : field.type === "select"
              ? `<XSelect v-model="${binding}" />`
              : `<XInput v-model="${binding}" />`;
        return [
          `<XFormItem label="${escapeHtml(field.label)}" prop="${escapeHtml(field.prop)}">`,
          `  ${control}`,
          `</XFormItem>`,
        ].join("\n");
      })
      .join("\n");
    const body = fields ? `\n${indent(fields, level + 1)}\n` : "";
    return `${indent(`<${prefix}QueryForm :model="${model}">`, level)}${body}${indent(`</${prefix}QueryForm>`, level)}`;
  }

  const props = node.props as XTableProps;
  const dataSource = toIdentifier(props.dataSource, "tableData");
  const columns = props.columns
    .map(
      (column) =>
        `<XTableColumn label="${escapeHtml(column.label)}" prop="${escapeHtml(column.prop)}" />`,
    )
    .map((line) => indent(line, level + 1))
    .join("\n");
  const body = columns ? `\n${columns}\n` : "";
  return `${indent(`<${prefix}Table :data="${dataSource}">`, level)}${body}${indent(`</${prefix}Table>`, level)}`;
}

/** Renders containers while preserving the semantic child order from the IR. */
function renderNode(
  node: IRNode,
  level: number,
  options: Required<VueGeneratorOptions>,
  context: RenderContext,
  parent?: IRNode,
): string {
  const itemClass = parent
    ? parent.layout
      ? registerLayoutChildStyle(node, parent, context)
      : registerFreeformNodeStyle(node, parent, context)
    : null;
  let content: string;

  if (node.nodeType === "component") {
    content = renderComponent(node, level, options, context);
  } else if (inferField(node)) {
    content = renderInferredField(inferField(node)!, level, options);
  } else if (node.layout) {
    const className = registerLayoutStyle(node, context);
    const children = node.children
      .map((child) => renderNode(child, level + 1, options, context, node))
      .join("\n");
    content = `${indent(`<div class="${className}">`, level)}\n${children}\n${indent("</div>", level)}`;
  } else if (node.children.length === 0) {
    content = renderGenericLeaf(node, level, context, parent);
  } else {
    const className = registerStructureStyle(node, context);
    const children = node.children
      .map((child) => renderNode(child, level + 1, options, context, node))
      .join("\n");
    content = `${indent(`<div class="${className}">`, level)}\n${children}\n${indent("</div>", level)}`;
  }

  return itemClass ? wrapWithClass(content, itemClass, level) : content;
}

/** Collects declarations needed by generated component bindings and handlers. */
function collectBindings(node: IRNode, result: {
  models: Set<string>;
  dataSources: Set<string>;
  actions: Set<string>;
}): void {
  if (node.nodeType === "component") {
    if (node.component === "XButton") {
      const props = node.props as XButtonProps;
      if (props.action) result.actions.add(toHandlerName(props.action));
    } else if (
      node.component === "XInput" ||
      node.component === "XFormInput" ||
      node.component === "XFormSelect" ||
      node.component === "XFormDatePicker"
    ) {
      result.models.add(
        toIdentifier(
          (node.props as XInputProps | XFormInputProps | XFormSelectProps | XFormDatePickerProps).model,
          "query",
        ),
      );
    } else if (node.component === "XQueryForm") {
      result.models.add(toIdentifier((node.props as XQueryFormProps).model, "query"));
    } else if (node.component === "XTable") {
      result.dataSources.add(
        toIdentifier((node.props as XTableProps).dataSource, "tableData"),
      );
    }
  }

  const inferredField = inferField(node);
  if (inferredField) result.models.add(inferredField.model);

  node.children.forEach((child) => collectBindings(child, result));
}

/** Generates the standalone Vue SFC for one IR document. */
export function generateVueSfc(
  document: IRDocument,
  options: VueGeneratorOptions = {},
): string {
  const resolvedOptions: Required<VueGeneratorOptions> = {
    componentPrefix: options.componentPrefix ?? "X",
  };
  const bindings = { models: new Set<string>(), dataSources: new Set<string>(), actions: new Set<string>() };
  collectBindings(document.tree, bindings);
  const renderContext: RenderContext = {
    styleRules: [],
    registeredStyles: new Set<string>(),
    classNames: new Map<string, string>(),
    layoutIndex: 0,
    itemIndex: 0,
    structureIndex: 0,
  };

  const scriptLines = ["<script setup lang=\"ts\">", "import { reactive, ref } from \"vue\";", ""];
  bindings.models.forEach((model) => {
    scriptLines.push(`const ${model} = reactive<Record<string, unknown>>({});`);
  });
  bindings.dataSources.forEach((dataSource) => {
    scriptLines.push(`const ${dataSource} = ref<Record<string, unknown>[]>([]);`);
  });
  if (bindings.models.size || bindings.dataSources.size) scriptLines.push("");
  bindings.actions.forEach((action) => {
    scriptLines.push(`function ${action}(): void {`);
    scriptLines.push("  // TODO: connect this semantic action to the host page.");
    scriptLines.push("}");
  });
  scriptLines.push("</script>");

  const template = [
    "<template>",
    renderNode(document.tree, 1, resolvedOptions, renderContext),
    "</template>",
  ].join("\n");

  const style = renderContext.styleRules.length
    ? `\n\n<style scoped>\n${renderContext.styleRules.join("\n\n")}\n</style>`
    : "";
  return `${scriptLines.join("\n")}\n\n${template}${style}\n`;
}
