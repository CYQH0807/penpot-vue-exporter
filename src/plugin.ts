import type { Board, LibraryComponent, Shape, Text } from "@penpot/plugin-types";
import {
  createXuiMetadata,
  readXuiMetadata,
} from "./core/metadata/metadata.service";
import {
  clearLibraryComponentMetadata,
  findLibraryComponent,
  getLibraryComponentKey,
  listLibraryComponents,
  resolveLibraryComponent,
  writeLibraryComponentMetadata,
} from "./core/metadata/assetMetadata.service";
import { parsePenpotSelection } from "./core/parser/penpotParser";
import { summarizeShape } from "./core/penpot/shapeInfo";
import type {
  XTableProps,
  XuiComponent,
  XuiProps,
} from "./core/metadata/metadata.types";
import type { HostRequest } from "./shared/messages";

const PLUGIN_NAME = "Penpot Vue Exporter";
const UI_WIDTH = 560;
const UI_HEIGHT = 680;

interface BasicAssetDefinition {
  name: string;
  libraryPath: string;
  label: string;
  component: XuiComponent;
  props: XuiProps;
  width: number;
  height: number;
}

interface AssetCreationResult {
  createdAssetNames: string[];
  updatedAssetNames: string[];
}

/** Normalizes Penpot library paths before comparing component source locations. */
function normalizeLibraryPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

const BASIC_ASSET_DEFINITIONS: readonly BasicAssetDefinition[] = [
  {
    name: "BRMS Button",
    libraryPath: "BRMS / Basic",
    label: "查询",
    component: "XButton",
    props: { text: "查询", type: "primary", action: "search" },
    width: 88,
    height: 34,
  },
  {
    name: "BRMS Input",
    libraryPath: "BRMS / Basic",
    label: "请输入关键词",
    component: "XInput",
    props: {
      model: "query",
      prop: "keyword",
      controlType: "input",
      placeholder: "请输入关键词",
    },
    width: 240,
    height: 34,
  },
  {
    name: "BRMS FieldGroup",
    libraryPath: "BRMS / Basic",
    label: "查询条件",
    component: "XFieldGroup",
    props: { label: "查询条件", prop: "keyword" },
    width: 300,
    height: 76,
  },
  {
    name: "BRMS DataTable",
    libraryPath: "BRMS / Data",
    label: "数据表格",
    component: "XTable",
    props: {
      dataSource: "tableData",
      columns: [
        { label: "报表显示单位", prop: "reportUnit" },
        { label: "组织机构", prop: "organization" },
        { label: "顺序", prop: "order" },
        { label: "法人单位", prop: "legalEntity" },
        { label: "状态", prop: "status" },
      ],
    },
    width: 1210,
    height: 250,
  },
];

const FORM_ASSET_DEFINITIONS: readonly BasicAssetDefinition[] = [
  {
    name: "BRMS FormInput",
    libraryPath: "BRMS / Form",
    label: "请输入",
    component: "XFormInput",
    props: {
      model: "form",
      prop: "keyword",
      placeholder: "请输入关键词",
      clearable: true,
    },
    width: 240,
    height: 34,
  },
  {
    name: "BRMS FormSelect",
    libraryPath: "BRMS / Form",
    label: "请选择",
    component: "XFormSelect",
    props: {
      model: "form",
      prop: "status",
      placeholder: "请选择状态",
      clearable: true,
      options: [
        { label: "全部", value: "all" },
        { label: "启用", value: "enabled" },
        { label: "停用", value: "disabled" },
      ],
    },
    width: 240,
    height: 34,
  },
  {
    name: "BRMS FormDatePicker",
    libraryPath: "BRMS / Form",
    label: "请选择日期",
    component: "XFormDatePicker",
    props: {
      model: "form",
      prop: "date",
      type: "date",
      placeholder: "请选择日期",
      valueFormat: "YYYY-MM-DD",
      clearable: true,
    },
    width: 240,
    height: 34,
  },
];

/** Adds a styled text label to a newly created basic asset board. */
function appendAssetText(
  board: Board,
  value: string,
  x: number,
  y: number,
  color: string,
): void {
  const text = penpot.createText(value) as Text | null;
  if (!text) return;

  text.name = "label";
  text.x = x;
  text.y = y;
  text.growType = "auto-width";
  text.fontSize = "14";
  text.fills = [{ fillColor: color, fillOpacity: 1 }];
  board.appendChild(text);
}

/** Adds a solid rectangle to a generated asset board. */
function appendAssetRectangle(
  board: Board,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  const rectangle = penpot.createRectangle();
  rectangle.name = name;
  rectangle.x = x;
  rectangle.y = y;
  rectangle.resize(width, height);
  rectangle.fills = [{ fillColor: color, fillOpacity: 1 }];
  board.appendChild(rectangle);
}

/** Builds a table-shaped visual source for the semantic XTable asset. */
function createTableAssetBoard(definition: BasicAssetDefinition): Board {
  const board = penpot.createBoard();
  const props = definition.props as XTableProps;
  const columns = props.columns.length ? props.columns : [{ label: "数据", prop: "data" }];
  const columnWidth = definition.width / columns.length;
  const rowHeight = 34;

  board.name = definition.name;
  board.resize(definition.width, definition.height);
  board.borderRadius = 4;
  board.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  board.strokes = [{
    strokeColor: "#E5E6EB",
    strokeOpacity: 1,
    strokeStyle: "solid",
    strokeWidth: 1,
    strokeAlignment: "inner",
  }];

  columns.forEach((column, index) => {
    const x = index * columnWidth;
    appendAssetRectangle(board, `header.${column.prop}`, x, 0, columnWidth, 38, "#F5F6F8");
    appendAssetText(board, column.label, x + 12, 10, "#1D2129");
  });

  for (let row = 1; row < Math.floor(definition.height / rowHeight); row += 1) {
    appendAssetRectangle(board, `row.${row}`, 0, row * rowHeight, definition.width, 1, "#E5E6EB");
  }

  return board;
}

/** Builds the visual board used as the source shape for one basic asset. */
function createBasicAssetBoard(definition: BasicAssetDefinition): Board {
  if (definition.component === "XTable") {
    return createTableAssetBoard(definition);
  }

  const board = penpot.createBoard();
  board.name = definition.name;
  board.resize(definition.width, definition.height);
  board.borderRadius = 6;
  board.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];

  if (definition.component === "XButton") {
    board.fills = [{ fillColor: "#1677FF", fillOpacity: 1 }];
    board.borderRadius = 4;
    appendAssetText(board, definition.label, 18, 8, "#FFFFFF");
    return board;
  }

  if (
    definition.component === "XInput" ||
    definition.component === "XFormInput" ||
    definition.component === "XFormSelect" ||
    definition.component === "XFormDatePicker"
  ) {
    board.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
    board.strokes = [{
      strokeColor: "#D9DDE5",
      strokeOpacity: 1,
      strokeStyle: "solid",
      strokeWidth: 1,
      strokeAlignment: "inner",
    }];
    board.borderRadius = 4;
    appendAssetText(board, definition.label, 12, 8, "#86909C");

    if (definition.component === "XFormSelect") {
      appendAssetText(board, "⌄", definition.width - 24, 7, "#86909C");
    }

    if (definition.component === "XFormDatePicker") {
      appendAssetText(board, "▣", definition.width - 25, 7, "#86909C");
    }

    return board;
  }

  const control = penpot.createRectangle();
  control.name = "control";
  control.x = 12;
  control.y = 34;
  control.resize(definition.width - 24, 32);
  control.borderRadius = 4;
  control.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  control.strokes = [{
    strokeColor: "#D9DDE5",
    strokeOpacity: 1,
    strokeStyle: "solid",
    strokeWidth: 1,
    strokeAlignment: "inner",
  }];
  board.appendChild(control);
  appendAssetText(board, definition.label, 12, 8, "#1D2129");
  appendAssetText(board, "请输入", 24, 42, "#86909C");
  return board;
}

/** Creates missing assets and repairs exporter metadata on matching existing sources. */
function createAssets(definitions: readonly BasicAssetDefinition[]): AssetCreationResult {
  const library = penpot.library.local;
  const createdAssetNames: string[] = [];
  const updatedAssetNames: string[] = [];

  for (const definition of definitions) {
    const leafName = definition.name.replace(/^BRMS /, "");
    const normalizedDefinitionPath = normalizeLibraryPath(definition.libraryPath);
    const existing = library.components.find(
      (component) =>
        component.name === definition.name ||
        (component.name === leafName &&
          normalizeLibraryPath(component.path) === normalizedDefinitionPath),
    );
    if (existing) {
      existing.name = leafName;
      existing.path = definition.libraryPath;
      if (!readXuiMetadata(existing).metadata) {
        writeLibraryComponentMetadata(
          existing,
          createXuiMetadata(definition.component, definition.props),
        );
      }
      updatedAssetNames.push(`${existing.path} / ${existing.name}`);
      continue;
    }

    const component = library.createComponent([createBasicAssetBoard(definition)]);
    component.name = leafName;
    component.path = definition.libraryPath;
    writeLibraryComponentMetadata(
      component,
      createXuiMetadata(definition.component, definition.props),
    );
    createdAssetNames.push(`${component.path} / ${component.name}`);
  }

  return { createdAssetNames, updatedAssetNames };
}

/** Creates the original button/input/field starter assets. */
function createBasicAssets(): AssetCreationResult {
  return createAssets(BASIC_ASSET_DEFINITIONS);
}

/** Creates the Form input/select/date-picker starter assets. */
function createFormAssets(): AssetCreationResult {
  return createAssets(FORM_ASSET_DEFINITIONS);
}

/** Sends the current selection and available component assets to the Vue iframe. */
function sendSelection(messageType: "SELECTION_UPDATED" | "METADATA_SAVED" = "SELECTION_UPDATED"): void {
  try {
    const selection = penpot.selection.map(summarizeShape);
    const assets = listLibraryComponents();
    const selectedAsset = penpot.selection[0]
      ? resolveLibraryComponent(penpot.selection[0])
      : null;
    const selectedAssetKey = selectedAsset
      ? getLibraryComponentKey(selectedAsset)
      : null;

    if (messageType === "METADATA_SAVED") {
      penpot.ui.sendMessage({ type: messageType, selection, assets, selectedAssetKey });
      return;
    }

    penpot.ui.sendMessage({ type: messageType, selection, assets, selectedAssetKey });
  } catch (error) {
    sendError(error instanceof Error ? error.message : "读取素材库失败。");
  }
}

/** Sends a user-facing error to the Vue iframe. */
function sendError(message: string): void {
  penpot.ui.sendMessage({ type: "ERROR", message });
}

/** Returns the selected root shape or reports that export needs a selection. */
function getSelectedRoot(): Shape | null {
  const root = penpot.selection[0];
  if (!root) {
    sendError("请先在 Penpot 中选择一个 Shape 或根 Board。");
    return null;
  }
  return root;
}

/** Resolves an explicitly chosen asset or the asset represented by the current selection. */
function getTargetAsset(assetKey: string | null | undefined): LibraryComponent | null {
  if (assetKey) return findLibraryComponent(assetKey);
  return penpot.selection
    .map(resolveLibraryComponent)
    .find((component): component is LibraryComponent => component !== null) ?? null;
}

/** Inserts a linked component instance beside the current selection or at a default canvas position. */
function insertComponentInstance(assetKey: string | null | undefined): void {
  const component = getTargetAsset(assetKey);
  if (!component) {
    sendError("请先选择一个组件源。");
    return;
  }

  const reference = penpot.selection[0];
  const instance = component.instance();
  instance.x = reference ? reference.x + reference.width + 24 : 100;
  instance.y = reference?.y ?? 100;
  penpot.selection = [instance];

  penpot.ui.sendMessage({
    type: "COMPONENT_INSTANCE_INSERTED",
    selection: penpot.selection.map(summarizeShape),
    assets: listLibraryComponents(),
    selectedAssetKey: getLibraryComponentKey(component),
    componentName: component.name,
  });
}

/** Handles one request from the Vue iframe in the Penpot plugin context. */
function handleRequest(message: HostRequest): void {
  try {
    switch (message.type) {
      case "GET_SELECTION":
        sendSelection();
        return;
      case "CREATE_BASIC_ASSETS": {
        const { createdAssetNames, updatedAssetNames } = createBasicAssets();
        penpot.ui.sendMessage({
          type: "BASIC_ASSETS_CREATED",
          assets: listLibraryComponents(),
          createdAssetNames,
          updatedAssetNames,
        });
        return;
      }
      case "CREATE_FORM_ASSETS": {
        const { createdAssetNames, updatedAssetNames } = createFormAssets();
        penpot.ui.sendMessage({
          type: "FORM_ASSETS_CREATED",
          assets: listLibraryComponents(),
          createdAssetNames,
          updatedAssetNames,
        });
        return;
      }
      case "INSERT_COMPONENT_INSTANCE":
        insertComponentInstance(message.assetKey);
        return;
      case "SAVE_METADATA": {
        const targetAsset = getTargetAsset(message.assetKey);
        if (!targetAsset) {
          sendError("请选择一个组件素材，或从素材库列表中选择素材。");
          return;
        }

        const metadata = createXuiMetadata(message.component, message.props);
        writeLibraryComponentMetadata(targetAsset, metadata);
        sendSelection("METADATA_SAVED");
        return;
      }
      case "REMOVE_METADATA":
        {
          const targetAsset = getTargetAsset(message.assetKey);
          if (!targetAsset) {
            sendError("请选择一个组件素材，或从素材库列表中选择素材。");
            return;
          }
          clearLibraryComponentMetadata(targetAsset);
        }
        sendSelection();
        return;
      case "EXPORT_SELECTION": {
        const root = getSelectedRoot();
        if (!root) return;

        const result = parsePenpotSelection(root, {
          fileId: penpot.currentFile?.id ?? null,
          pageId: penpot.currentPage?.id ?? null,
        });
        penpot.ui.sendMessage({
          type: "EXPORT_RESULT",
          document: result.document,
          diagnostics: result.diagnostics,
        });
        return;
      }
      case "CLOSE_PLUGIN":
        penpot.closePlugin();
        return;
    }
  } catch (error) {
    sendError(error instanceof Error ? error.message : "插件操作失败。");
  }
}

penpot.ui.onMessage<HostRequest>(handleRequest);
penpot.on("selectionchange", () => sendSelection());
penpot.ui.open(PLUGIN_NAME, "index.html", { width: UI_WIDTH, height: UI_HEIGHT });
