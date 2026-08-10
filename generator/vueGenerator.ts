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
  IRDocument,
  IRLayout,
  IRLayoutChild,
  IRNode,
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
}

/** Formats a numeric Penpot value as a compact CSS pixel value. */
function px(value: number): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(3))}px`;
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

  return `.${className} {\n${declarations.map((declaration) => `  ${declaration}`).join("\n")}\n}`;
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
  const itemClass = parent ? registerLayoutChildStyle(node, parent, context) : null;
  let content: string;

  if (node.nodeType === "component") {
    content = renderComponent(node, level, options, context);
  } else if (node.layout) {
    const className = registerLayoutStyle(node, context);
    const children = node.children.length
      ? node.children
          .map((child) => renderNode(child, level + 1, options, context, node))
          .join("\n")
      : indent(`<!-- ${escapeHtml(node.name || "empty container")} -->`, level + 1);
    content = `${indent(`<div class="${className}">`, level)}\n${children}\n${indent("</div>", level)}`;
  } else if (node.children.length === 0) {
    content = indent(`<!-- ${escapeHtml(node.name || "empty container")} -->`, level);
  } else {
    content = node.children
      .map((child) => renderNode(child, level, options, context, node))
      .join("\n");
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
