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

/** Copies only stable source geometry into the IR for later diagnostics. */
function buildSourceInfo(shape: Shape): IRShapeSource {
  return {
    shapeId: shape.id,
    shapeType: toIRShapeType(shape),
    parentId: shape.parent?.id ?? null,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
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

/** Recursively converts one marked shape or a container of marked descendants. */
function parseShape(shape: Shape, diagnostics: ParserDiagnostic[]): IRNode | null {
  const metadataResult = readEffectiveXuiMetadata(shape);
  if (metadataResult.error) {
    diagnostics.push({
      level: "warning",
      shapeId: shape.id,
      shapeName: shape.name,
      message: metadataResult.error,
    });
  }

  const children = getOrderedChildren(shape)
    .map((child) => parseShape(child, diagnostics))
    .filter((child): child is IRNode => child !== null);
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

  if (children.length > 0) {
    return {
      id: shape.id,
      name: shape.name,
      nodeType: "container",
      source: buildSourceInfo(shape),
      ...layoutFields,
      children,
    };
  }

  return null;
}

/** Builds the exporter document from the selected Penpot root Shape. */
export function parsePenpotSelection(
  root: Shape,
  source: { fileId: string | null; pageId: string | null },
): ParseResult {
  const diagnostics: ParserDiagnostic[] = [];
  const parsedRoot = parseShape(root, diagnostics);
  const tree =
    parsedRoot ?? {
      id: root.id,
      name: root.name,
      nodeType: "container" as const,
      source: buildSourceInfo(root),
      ...(buildLayout(root) ? { layout: buildLayout(root) } : {}),
      ...(buildLayoutChild(root) ? { layoutChild: buildLayoutChild(root) } : {}),
      children: [],
    };

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
