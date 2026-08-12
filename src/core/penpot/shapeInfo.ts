import type { Shape } from "@penpot/plugin-types";
import { readEffectiveXuiMetadata } from "../metadata/assetMetadata.service";
import { getShapeChildren } from "./shapeTree";
import type { SelectionShapeSummary } from "../../shared/messages";

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
