import type { IRDocument } from "../core/ir/ir.types";
import type { ParserDiagnostic } from "../core/parser/penpotParser";
import type {
  LibraryComponentSummary,
  XuiComponent,
  XuiMetadata,
  XuiMetadataSource,
  XuiProps,
} from "../core/metadata/metadata.types";

export interface SelectionShapeSummary {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  childCount: number;
  pluginDataKeys: string[];
  metadata: XuiMetadata | null;
  metadataError: string | null;
  metadataSource: XuiMetadataSource;
  assetKey: string | null;
  assetName: string | null;
}

export type HostRequest =
  | { type: "GET_SELECTION" }
  | { type: "CREATE_BASIC_ASSETS" }
  | { type: "CREATE_FORM_ASSETS" }
  | { type: "INSERT_COMPONENT_INSTANCE"; assetKey?: string | null }
  | {
      type: "SAVE_METADATA";
      component: XuiComponent;
      props: XuiProps;
      assetKey?: string | null;
    }
  | { type: "REMOVE_METADATA"; assetKey?: string | null }
  | { type: "EXPORT_SELECTION" }
  | { type: "CLOSE_PLUGIN" };

export type PluginMessage =
  | {
      type: "SELECTION_UPDATED";
      selection: SelectionShapeSummary[];
      assets: LibraryComponentSummary[];
      selectedAssetKey: string | null;
    }
  | {
      type: "METADATA_SAVED";
      selection: SelectionShapeSummary[];
      assets: LibraryComponentSummary[];
      selectedAssetKey: string | null;
    }
  | {
      type: "BASIC_ASSETS_CREATED";
      assets: LibraryComponentSummary[];
      createdAssetNames: string[];
      updatedAssetNames: string[];
    }
  | {
      type: "FORM_ASSETS_CREATED";
      assets: LibraryComponentSummary[];
      createdAssetNames: string[];
      updatedAssetNames: string[];
    }
  | {
      type: "COMPONENT_INSTANCE_INSERTED";
      selection: SelectionShapeSummary[];
      assets: LibraryComponentSummary[];
      selectedAssetKey: string | null;
      componentName: string;
    }
  | {
      type: "EXPORT_RESULT";
      document: IRDocument;
      diagnostics: ParserDiagnostic[];
    }
  | { type: "ERROR"; message: string };
