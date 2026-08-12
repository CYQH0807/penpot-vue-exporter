import type { LibraryComponent, Shape } from "@penpot/plugin-types";
import {
  createXuiMetadata,
  readXuiMetadata,
  writeXuiMetadata,
} from "./metadata.service";
import { normalizeLibraryPath, resolveLibraryComponent } from "./assetMetadata.service";
import type {
  XFormSelectProps,
  XInputProps,
  XuiMetadata,
  XuiProps,
} from "./metadata.types";

/** Checks whether metadata describes a Select-shaped exporter component. */
export function isSelectMetadata(metadata: XuiMetadata | null): boolean {
  if (!metadata) return false;
  if (metadata.component === "XFormSelect") return true;
  return metadata.component === "XInput" &&
    (metadata.props as XInputProps).controlType === "select";
}

/** Checks whether a library component follows the BRMS Form Select naming convention. */
export function isFormSelectAsset(
  component: Pick<LibraryComponent, "name" | "path"> | null,
): boolean {
  if (!component) return false;

  const pathSegments = normalizeLibraryPath(component.path).split("/");
  const parentPath = pathSegments.at(-1)?.toLowerCase();
  const componentName = (component.name ?? "").trim().toLowerCase();
  return parentPath === "form" && (componentName === "select" || componentName === "formselect");
}

/** Converts a control layer name into a stable form prop name. */
export function inferSelectProp(shapeName: string | null | undefined): string {
  const suffix = shapeName?.split(".").at(-1)?.trim() || "select";
  const identifier = suffix.replace(/[^A-Za-z0-9_$]/g, "");
  if (!identifier) return "select";
  return /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;
}

/** Finds the current instance's semantic metadata without writing to its asset. */
function readSelectMetadata(
  shape: Shape,
  asset: LibraryComponent | null,
): XuiMetadata | null {
  const direct = readXuiMetadata(shape);
  if (direct.error) throw new Error(`当前图层的标记数据无效：${direct.error}`);
  if (direct.metadata) return direct.metadata;

  const assetResult = asset ? readXuiMetadata(asset) : null;
  if (assetResult?.error) throw new Error(`Select 素材的标记数据无效：${assetResult.error}`);
  return assetResult?.metadata ?? null;
}

/** Resolves a selected shape as a Select instance and returns its target metadata. */
function resolveSelectTarget(shape: Shape): {
  target: Shape;
  metadata: XuiMetadata | null;
  asset: LibraryComponent | null;
} | null {
  // Keep the selected instance shape as the write target; componentRoot() may
  // point at a library/page shape that is not the active editable page.
  const target = shape;
  const asset = resolveLibraryComponent(shape) ?? resolveLibraryComponent(target);
  const metadata = readSelectMetadata(target, asset);

  if (metadata) {
    return isSelectMetadata(metadata) ? { target, metadata, asset } : null;
  }

  return isFormSelectAsset(asset) ? { target, metadata: null, asset } : null;
}

/** Writes a codeSet value to the selected Select instance's direct Shape metadata. */
export function saveSelectCodeSet(shape: Shape, rawCodeSet: string): string {
  const resolved = resolveSelectTarget(shape);
  if (!resolved) {
    throw new Error("当前选中的图层不是可配置的 Select 组件。");
  }

  const codeSet = rawCodeSet.trim();
  const directResult = readXuiMetadata(resolved.target);
  if (directResult.error) throw new Error(`当前图层的标记数据无效：${directResult.error}`);

  if (!codeSet) {
    if (!directResult.metadata || !isSelectMetadata(directResult.metadata)) return "";

    const props = { ...directResult.metadata.props } as Record<string, unknown>;
    delete props.codeSet;
    writeXuiMetadata(
      resolved.target,
      createXuiMetadata(
        directResult.metadata.component,
        props as unknown as XuiProps,
      ),
    );
    return "";
  }

  const baseMetadata = resolved.metadata ?? createXuiMetadata(
    "XFormSelect",
    {
      model: "form",
      prop: inferSelectProp(resolved.target.name),
    } satisfies XFormSelectProps,
  );
  const props = {
    ...baseMetadata.props,
    codeSet,
  } as XuiProps;

  writeXuiMetadata(
    resolved.target,
    createXuiMetadata(baseMetadata.component, props),
  );
  return codeSet;
}
