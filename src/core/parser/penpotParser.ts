import type { Shape } from "@penpot/plugin-types";
import { readEffectiveXuiMetadata } from "../metadata/assetMetadata.service";
import { getShapeChildren } from "../penpot/shapeTree";
import {
  IR_SCHEMA_VERSION,
  type IRGridTrack,
  type IRDocument,
  type IRLayout,
  type IRLayoutChild,
  type IRNode,
  type IRShapeType,
  type IRShapeSource,
  type IRPaint,
  type IRShadow,
  type IRStyle,
  type IRStroke,
  type IRTextStyle,
} from "../ir/ir.types";

export interface ParserDiagnostic {
  level: "warning" | "error";
  shapeId: string;
  shapeName: string;
  message: string;
}

export interface ParseResult {
  document: IRDocument;
  diagnostics: ParserDiagnostic[];
}

/** Converts the Penpot shape type into the stable IR shape type union. */
function toIRShapeType(shape: Shape): IRShapeType {
  return shape.type as IRShapeType;
}

/** Reads the first solid paint that can be represented in generated CSS. */
function readSolidPaint(
  fills: Shape["fills"] | undefined,
): IRPaint | undefined {
  if (!Array.isArray(fills)) return undefined;

  const fill = fills.find((candidate) => typeof candidate.fillColor === "string");
  if (!fill?.fillColor) return undefined;

  return {
    color: fill.fillColor,
    opacity: fill.fillOpacity ?? 1,
  };
}

/** Reads the first CSS-compatible stroke from a Penpot shape. */
function readStroke(strokes: Shape["strokes"] | undefined): IRStroke | undefined {
  if (!Array.isArray(strokes)) return undefined;

  const stroke = strokes.find(
    (candidate) =>
      typeof candidate.strokeColor === "string" &&
      candidate.strokeStyle !== "none",
  );
  if (!stroke?.strokeColor) return undefined;

  const style = stroke.strokeStyle;
  return {
    color: stroke.strokeColor,
    opacity: stroke.strokeOpacity ?? 1,
    width: stroke.strokeWidth ?? 1,
    style: style === "dotted" || style === "dashed" ? style : "solid",
  };
}

/** Reads a visible Penpot shadow into a serializable IR shadow. */
function readShadow(shadows: Shape["shadows"] | undefined): IRShadow | undefined {
  if (!Array.isArray(shadows)) return undefined;

  const shadow = shadows.find(
    (candidate) => !candidate.hidden && typeof candidate.color?.color === "string",
  );
  if (!shadow?.color?.color) return undefined;

  return {
    style: shadow.style === "inner-shadow" ? "inner-shadow" : "drop-shadow",
    offsetX: shadow.offsetX ?? 0,
    offsetY: shadow.offsetY ?? 0,
    blur: shadow.blur ?? 0,
    spread: shadow.spread ?? 0,
    color: shadow.color.color,
    opacity: shadow.color.opacity ?? 1,
  };
}

/** Keeps a text property only when Penpot provides one unambiguously. */
function readTextValue(value: string | "mixed" | null | undefined): string | undefined {
  return value && value !== "mixed" ? value : undefined;
}

/** Builds the visual style subset needed by the Vue generator. */
function buildShapeStyle(shape: Shape): IRStyle | undefined {
  const style: IRStyle = {};
  const isText = shape.type === "text";
  const fill = isText ? undefined : readSolidPaint(shape.fills);
  const stroke = isText ? undefined : readStroke(shape.strokes);
  const shadow = readShadow(shape.shadows);
  const radiusValues = [
    shape.borderRadiusTopLeft,
    shape.borderRadiusTopRight,
    shape.borderRadiusBottomRight,
    shape.borderRadiusBottomLeft,
  ];

  if (typeof shape.opacity === "number" && shape.opacity !== 1) {
    style.opacity = shape.opacity;
  }
  if (fill) style.fill = fill;
  if (stroke) style.stroke = stroke;
  if (radiusValues.every((value) => typeof value === "number")) {
    const [topLeft, topRight, bottomRight, bottomLeft] = radiusValues as number[];
    if (topLeft || topRight || bottomRight || bottomLeft) {
      style.borderRadius = { topLeft, topRight, bottomRight, bottomLeft };
    }
  }
  if (shadow) style.shadow = shadow;
  if (shape.blur?.value && shape.blur.value > 0) style.blur = shape.blur.value;

  if (isText) {
    const textStyle: IRTextStyle = {
      color: readSolidPaint(shape.fills),
      fontFamily: readTextValue(shape.fontFamily),
      fontSize: readTextValue(shape.fontSize),
      fontWeight: readTextValue(shape.fontWeight),
      fontStyle: shape.fontStyle === "normal" || shape.fontStyle === "italic"
        ? shape.fontStyle
        : undefined,
      lineHeight: readTextValue(shape.lineHeight),
      letterSpacing: readTextValue(shape.letterSpacing),
      textTransform: shape.textTransform === "uppercase" ||
        shape.textTransform === "capitalize" ||
        shape.textTransform === "lowercase"
        ? shape.textTransform
        : undefined,
      textDecoration: shape.textDecoration === "underline" ||
        shape.textDecoration === "line-through"
        ? shape.textDecoration
        : undefined,
      align: shape.align === "left" || shape.align === "center" ||
        shape.align === "right" || shape.align === "justify"
        ? shape.align
        : undefined,
      verticalAlign: shape.verticalAlign === "top" ||
        shape.verticalAlign === "center" ||
        shape.verticalAlign === "bottom"
        ? shape.verticalAlign
        : undefined,
    };
    const textEntries = Object.entries(textStyle).filter(([, value]) => value !== undefined);
    if (textEntries.length) style.text = Object.fromEntries(textEntries) as IRTextStyle;
  }

  return Object.keys(style).length ? style : undefined;
}

/** Copies only stable source geometry into the IR for later diagnostics. */
function buildSourceInfo(shape: Shape): IRShapeSource {
  const text = shape.type === "text" ? shape.characters : undefined;
  const style = buildShapeStyle(shape);

  return {
    shapeId: shape.id,
    shapeType: toIRShapeType(shape),
    parentId: shape.parent?.id ?? null,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    ...(text !== undefined ? { text } : {}),
    ...(style ? { style } : {}),
  };
}

/** Converts a Penpot layout track into the stable IR track shape. */
function buildGridTracks(
  tracks: readonly { type: IRGridTrack["type"]; value: number | null }[],
): IRGridTrack[] {
  return tracks.map((track) => ({ type: track.type, value: track.value }));
}

/** Copies the supported Flex or Grid settings from a Penpot board. */
function buildLayout(shape: Shape): IRLayout | undefined {
  if (shape.type !== "board") return undefined;

  if (shape.flex) {
    return {
      type: "flex",
      direction: shape.flex.dir,
      wrap: shape.flex.wrap ?? null,
      rowGap: shape.flex.rowGap,
      columnGap: shape.flex.columnGap,
      padding: {
        top: shape.flex.topPadding,
        right: shape.flex.rightPadding,
        bottom: shape.flex.bottomPadding,
        left: shape.flex.leftPadding,
      },
      alignItems: shape.flex.alignItems ?? null,
      alignContent: shape.flex.alignContent ?? null,
      justifyItems: shape.flex.justifyItems ?? null,
      justifyContent: shape.flex.justifyContent ?? null,
      horizontalSizing: shape.flex.horizontalSizing ?? null,
      verticalSizing: shape.flex.verticalSizing ?? null,
    };
  }

  if (shape.grid) {
    return {
      type: "grid",
      direction: shape.grid.dir,
      rows: buildGridTracks(shape.grid.rows),
      columns: buildGridTracks(shape.grid.columns),
      rowGap: shape.grid.rowGap,
      columnGap: shape.grid.columnGap,
      padding: {
        top: shape.grid.topPadding,
        right: shape.grid.rightPadding,
        bottom: shape.grid.bottomPadding,
        left: shape.grid.leftPadding,
      },
      alignItems: shape.grid.alignItems ?? null,
      alignContent: shape.grid.alignContent ?? null,
      justifyItems: shape.grid.justifyItems ?? null,
      justifyContent: shape.grid.justifyContent ?? null,
      horizontalSizing: shape.grid.horizontalSizing ?? null,
      verticalSizing: shape.grid.verticalSizing ?? null,
    };
  }

  return undefined;
}

/** Copies a shape's layout-child settings for its parent layout renderer. */
function buildLayoutChild(shape: Shape): IRLayoutChild | undefined {
  const layoutChild = shape.layoutChild;
  if (!layoutChild) return undefined;

  return {
    absolute: layoutChild.absolute,
    zIndex: layoutChild.zIndex,
    horizontalSizing: layoutChild.horizontalSizing,
    verticalSizing: layoutChild.verticalSizing,
    alignSelf: layoutChild.alignSelf,
    margin: {
      top: layoutChild.topMargin,
      right: layoutChild.rightMargin,
      bottom: layoutChild.bottomMargin,
      left: layoutChild.leftMargin,
    },
  };
}

/** Orders layout children by their visual flow instead of raw layer-stack order. */
function getOrderedChildren(shape: Shape): Shape[] {
  const children = getShapeChildren(shape);
  if (shape.type !== "board" || (!shape.flex && !shape.grid)) return children;

  if (shape.flex) {
    const isRow = shape.flex.dir === "row" || shape.flex.dir === "row-reverse";
    const reverse = shape.flex.dir === "row-reverse" || shape.flex.dir === "column-reverse";
    const primary = (child: Shape): number => (isRow ? child.x : child.y);
    const secondary = (child: Shape): number => (isRow ? child.y : child.x);

    return [...children].sort((left, right) => {
      const primaryDelta = primary(left) - primary(right);
      if (Math.abs(primaryDelta) > 0.01) return reverse ? -primaryDelta : primaryDelta;

      const secondaryDelta = secondary(left) - secondary(right);
      if (Math.abs(secondaryDelta) > 0.01) return secondaryDelta;
      return left.parentIndex - right.parentIndex;
    });
  }

  const isRow = shape.grid?.dir === "row";
  const getCell = (child: Shape): { row?: number; column?: number } | null =>
    (child.layoutCell as unknown as { row?: number; column?: number } | undefined) ?? null;

  return [...children].sort((left, right) => {
    const leftCell = getCell(left);
    const rightCell = getCell(right);
    if (!leftCell || !rightCell) return left.parentIndex - right.parentIndex;

    const primaryDelta = (isRow ? leftCell.row : leftCell.column)! -
      (isRow ? rightCell.row : rightCell.column)!;
    if (primaryDelta !== 0) return primaryDelta;

    return (isRow ? leftCell.column : leftCell.row)! -
      (isRow ? rightCell.column : rightCell.row)!;
  });
}

/** Recursively converts one shape, keeping unmarked nodes as structural IR nodes. */
function parseShape(shape: Shape, diagnostics: ParserDiagnostic[]): IRNode {
  const metadataResult = readEffectiveXuiMetadata(shape);
  if (metadataResult.error) {
    diagnostics.push({
      level: "warning",
      shapeId: shape.id,
      shapeName: shape.name,
      message: metadataResult.error,
    });
  }

  const children = getOrderedChildren(shape).map((child) => parseShape(child, diagnostics));
  const layout = buildLayout(shape);
  const layoutChild = buildLayoutChild(shape);
  const layoutFields = {
    ...(layout ? { layout } : {}),
    ...(layoutChild ? { layoutChild } : {}),
  };

  if (metadataResult.metadata) {
    return {
      id: shape.id,
      name: shape.name,
      nodeType: "component",
      component: metadataResult.metadata.component,
      props: metadataResult.metadata.props,
      source: buildSourceInfo(shape),
      ...layoutFields,
      children,
    };
  }

  return {
    id: shape.id,
    name: shape.name,
    nodeType: "container",
    source: buildSourceInfo(shape),
    ...layoutFields,
    children,
  };
}

/** Builds the exporter document from the selected Penpot root Shape. */
export function parsePenpotSelection(
  root: Shape,
  source: { fileId: string | null; pageId: string | null },
): ParseResult {
  const diagnostics: ParserDiagnostic[] = [];
  const tree = parseShape(root, diagnostics);

  return {
    document: {
      schemaVersion: IR_SCHEMA_VERSION,
      source: {
        type: "penpot",
        fileId: source.fileId,
        pageId: source.pageId,
        rootShapeId: root.id,
      },
      tree,
    },
    diagnostics,
  };
}
