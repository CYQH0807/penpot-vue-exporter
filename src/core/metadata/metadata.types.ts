/** The PluginData key reserved for exporter metadata. */
export const XUI_PLUGIN_DATA_KEY = "xui" as const;

/** The first version of the exporter metadata protocol. */
export const XUI_SCHEMA_VERSION = 1 as const;

/** The semantic components supported by the exporter POC. */
export const SUPPORTED_XUI_COMPONENTS = [
  "XButton",
  "XInput",
  "XFormInput",
  "XFormSelect",
  "XFormDatePicker",
  "XFieldGroup",
  "XQueryForm",
  "XTable",
] as const;

export type XuiComponent = (typeof SUPPORTED_XUI_COMPONENTS)[number];

export type XButtonType = "default" | "primary" | "secondary" | "danger";

export interface XButtonProps {
  text: string;
  type?: XButtonType;
  action?: string;
}

export type XInputControlType = "input" | "select";

export interface XInputOption {
  label: string;
  value: string;
}

export interface XInputProps {
  model: string;
  prop: string;
  controlType?: XInputControlType;
  placeholder?: string;
  options?: XInputOption[];
}

/** Describes the shared binding and placeholder props for a Form control. */
export interface XFormControlProps {
  model: string;
  prop: string;
  placeholder?: string;
}

/** Describes an Element Plus input control exported from a Penpot Form asset. */
export interface XFormInputProps extends XFormControlProps {
  clearable?: boolean;
}

/** Describes one option rendered by an exported Element Plus select control. */
export interface XFormSelectOption {
  label: string;
  value: string;
}

/** Describes an Element Plus select control exported from a Penpot Form asset. */
export interface XFormSelectProps extends XFormControlProps {
  clearable?: boolean;
  options?: XFormSelectOption[];
}

export type XFormDatePickerType =
  | "year"
  | "month"
  | "date"
  | "dates"
  | "week"
  | "datetime"
  | "datetimerange"
  | "daterange"
  | "monthrange";

/** Describes an Element Plus date picker exported from a Penpot Form asset. */
export interface XFormDatePickerProps extends XFormControlProps {
  type?: XFormDatePickerType;
  format?: string;
  valueFormat?: string;
  clearable?: boolean;
}

export interface XFieldGroupProps {
  label: string;
  prop?: string;
}

export type XQueryFieldType = "input" | "select" | "tableSelect";

export interface XQueryField {
  label: string;
  prop: string;
  type: XQueryFieldType;
}

export interface XQueryFormProps {
  model: string;
  fields: XQueryField[];
}

export interface XTableColumn {
  label: string;
  prop: string;
}

export interface XTableProps {
  dataSource: string;
  columns: XTableColumn[];
}

export type XuiProps =
  | XButtonProps
  | XInputProps
  | XFormInputProps
  | XFormSelectProps
  | XFormDatePickerProps
  | XFieldGroupProps
  | XQueryFormProps
  | XTableProps;

export interface XuiMetadata {
  schemaVersion: typeof XUI_SCHEMA_VERSION;
  component: XuiComponent;
  props: XuiProps;
}

/** Identifies where the effective semantic metadata was read from. */
export type XuiMetadataSource = "shape" | "asset" | null;

/** Describes one component asset that can receive exporter metadata. */
export interface LibraryComponentSummary {
  assetKey: string;
  id: string;
  libraryId: string;
  name: string;
  path: string;
  isLocal: boolean;
  metadata: XuiMetadata | null;
  metadataError: string | null;
}

/** Combines direct Shape metadata with inherited component-asset metadata. */
export interface XuiMetadataResolution {
  metadata: XuiMetadata | null;
  error: string | null;
  source: XuiMetadataSource;
  assetKey: string | null;
  assetName: string | null;
}
