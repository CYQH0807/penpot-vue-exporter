import type { Shape } from "@penpot/plugin-types";
import { readEffectiveXuiMetadata } from "../metadata/assetMetadata.service";
import { getShapeChildren } from "./shapeTree";
import type { SelectionShapeSummary, DebugShapeInfo } from "../../shared/messages";

/** Creates a serializable summary for the current selection panel. */
export function summarizeShape(shape: Shape): SelectionShapeSummary {
  const metadata = readEffectiveXuiMetadata(shape);
  return {
    id: shape.id,
    name: shape.name,
    type: shape.type,
    width: shape.width,
    height: shape.height,
    childCount: getShapeChildren(shape).length,
    pluginDataKeys: shape.getPluginDataKeys(),
    metadata: metadata.metadata,
    metadataError: metadata.error,
    metadataSource: metadata.source,
    assetKey: metadata.assetKey,
    assetName: metadata.assetName,
  };
}

/** Builds bounded debug information without serializing the Penpot object graph. */
export function buildDebugShapeInfo(shape: Shape, depth = 0): DebugShapeInfo {
  const metadata = readEffectiveXuiMetadata(shape);
  return {
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    parentId: shape.parent?.id ?? null,
    pluginDataKeys: shape.getPluginDataKeys(),
    metadata: metadata.metadata,
    metadataError: metadata.error,
    metadataSource: metadata.source,
    assetKey: metadata.assetKey,
    assetName: metadata.assetName,
    children:
      depth >= 3
        ? []
      : getShapeChildren(shape).map((child) => buildDebugShapeInfo(child, depth + 1)),
  };
}
