import type { PluginData } from "@penpot/plugin-types";
import {
  SUPPORTED_XUI_COMPONENTS,
  XUI_PLUGIN_DATA_KEY,
  XUI_SCHEMA_VERSION,
  type XuiComponent,
  type XuiMetadata,
  type XuiProps,
} from "./metadata.types";

export interface MetadataParseResult {
  metadata: XuiMetadata | null;
  error: string | null;
}

/** Checks whether an unknown value is a non-null object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Checks whether a value is one of the supported semantic component names. */
function isSupportedComponent(value: unknown): value is XuiComponent {
  return (
    typeof value === "string" &&
    (SUPPORTED_XUI_COMPONENTS as readonly string[]).includes(value)
  );
}

/** Validates the minimum common shape of exporter metadata. */
function validateMetadata(value: unknown): MetadataParseResult {
  if (!isRecord(value)) {
    return { metadata: null, error: "metadata must be an object" };
  }

  if (value.schemaVersion !== XUI_SCHEMA_VERSION) {
    return {
      metadata: null,
      error: `unsupported schemaVersion: ${String(value.schemaVersion)}`,
    };
  }

  if (!isSupportedComponent(value.component)) {
    return {
      metadata: null,
      error: `unsupported component: ${String(value.component)}`,
    };
  }

  if (!isRecord(value.props)) {
    return { metadata: null, error: "metadata.props must be an object" };
  }

  return {
    metadata: {
      schemaVersion: XUI_SCHEMA_VERSION,
      component: value.component,
      props: value.props as unknown as XuiProps,
    },
    error: null,
  };
}

/** Parses serialized PluginData without allowing malformed data to break export. */
export function parseXuiMetadata(raw: string | null | undefined): MetadataParseResult {
  if (!raw?.trim()) {
    return { metadata: null, error: null };
  }

  try {
    return validateMetadata(JSON.parse(raw) as unknown);
  } catch (error) {
    return {
      metadata: null,
      error: error instanceof Error ? error.message : "invalid metadata JSON",
    };
  }
}

/** Reads and validates exporter metadata from a Penpot plugin-data target. */
export function readXuiMetadata(target: PluginData): MetadataParseResult {
  return parseXuiMetadata(target.getPluginData(XUI_PLUGIN_DATA_KEY));
}

/** Writes exporter metadata to a Penpot plugin-data target. */
export function writeXuiMetadata(target: PluginData, metadata: XuiMetadata): void {
  target.setPluginData(XUI_PLUGIN_DATA_KEY, JSON.stringify(metadata));
}

/** Clears exporter metadata while leaving unrelated plugin data untouched. */
export function clearXuiMetadata(target: PluginData): void {
  target.setPluginData(XUI_PLUGIN_DATA_KEY, "");
}

/** Creates a protocol-conformant metadata object for the marker UI. */
export function createXuiMetadata(
  component: XuiComponent,
  props: XuiProps,
): XuiMetadata {
  return {
    schemaVersion: XUI_SCHEMA_VERSION,
    component,
    props,
  };
}
