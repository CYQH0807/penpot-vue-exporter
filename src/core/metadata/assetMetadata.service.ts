import type { Library, LibraryComponent, Shape } from "@penpot/plugin-types";
import {
  clearXuiMetadata,
  readXuiMetadata,
  writeXuiMetadata,
} from "./metadata.service";
import type {
  LibraryComponentSummary,
  XuiMetadata,
  XuiMetadataResolution,
} from "./metadata.types";

interface LibraryEntry {
  library: Library;
  isLocal: boolean;
}

/** Returns the local and connected libraries visible to the plugin. */
function getLibraryEntries(): LibraryEntry[] {
  return [
    { library: penpot.library.local, isLocal: true },
    ...penpot.library.connected.map((library) => ({ library, isLocal: false })),
  ];
}

/** Normalizes a library path for component-name and source matching. */
export function normalizeLibraryPath(path: string | null | undefined): string {
  return (path ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

/** Builds a stable key for a component across local and connected libraries. */
export function getLibraryComponentKey(component: LibraryComponent): string {
  return `${component.libraryId}:${component.id}`;
}

/** Lists all component assets and their current exporter metadata. */
export function listLibraryComponents(): LibraryComponentSummary[] {
  return getLibraryEntries()
    .flatMap(({ library, isLocal }) =>
      library.components.map((component) => {
        const metadata = readXuiMetadata(component);
        return {
          assetKey: getLibraryComponentKey(component),
          id: component.id,
          libraryId: component.libraryId,
          name: component.name,
          path: component.path,
          isLocal,
          metadata: metadata.metadata,
          metadataError: metadata.error,
        } satisfies LibraryComponentSummary;
      }),
    )
    .sort((left, right) => {
      const pathOrder = (left.path ?? "").localeCompare(right.path ?? "");
      if (pathOrder) return pathOrder;
      const nameOrder = (left.name ?? "").localeCompare(right.name ?? "");
      return nameOrder || left.assetKey.localeCompare(right.assetKey);
    });
}

/** Finds a writable component asset by its stable library/component key. */
export function findLibraryComponent(assetKey: string): LibraryComponent | null {
  for (const { library } of getLibraryEntries()) {
    const component = library.components.find(
      (item) => getLibraryComponentKey(item) === assetKey,
    );
    if (component) return component;
  }
  return null;
}

/** Resolves the component asset represented by a selected Shape. */
export function resolveLibraryComponent(shape: Shape): LibraryComponent | null {
  const root = shape.componentRoot() ?? shape;
  const component = root.component() ?? shape.component();
  if (component) return component;

  for (const { library } of getLibraryEntries()) {
    for (const libraryComponent of library.components) {
      if (libraryComponent.mainInstance().id === root.id) {
        return libraryComponent;
      }
    }
  }

  return null;
}

/** Checks whether a shape is the root node eligible for asset metadata inheritance. */
function isAssetMetadataRoot(shape: Shape): boolean {
  if (typeof shape.isComponentRoot === "function") {
    return shape.isComponentRoot();
  }

  const root = shape.componentRoot();
  return !root || root.id === shape.id;
}

/** Returns the effective metadata, preferring a direct Shape override. */
export function readEffectiveXuiMetadata(shape: Shape): XuiMetadataResolution {
  const asset = resolveLibraryComponent(shape);
  const assetKey = asset ? getLibraryComponentKey(asset) : null;
  const assetName = asset?.name ?? null;
  const direct = readXuiMetadata(shape);

  if (direct.metadata || direct.error) {
    return {
      metadata: direct.metadata,
      error: direct.error,
      source: "shape",
      assetKey,
      assetName,
    };
  }

  if (!isAssetMetadataRoot(shape)) {
    return { metadata: null, error: null, source: null, assetKey, assetName };
  }

  if (!asset) {
    return { metadata: null, error: null, source: null, assetKey, assetName };
  }

  const inherited = readXuiMetadata(asset);
  return {
    metadata: inherited.metadata,
    error: inherited.error,
    source: inherited.metadata || inherited.error ? "asset" : null,
    assetKey,
    assetName,
  };
}

/** Writes semantic metadata to the component asset definition. */
export function writeLibraryComponentMetadata(
  component: LibraryComponent,
  metadata: XuiMetadata,
): void {
  writeXuiMetadata(component, metadata);
}

/** Clears semantic metadata from the component asset definition. */
export function clearLibraryComponentMetadata(component: LibraryComponent): void {
  clearXuiMetadata(component);
}
