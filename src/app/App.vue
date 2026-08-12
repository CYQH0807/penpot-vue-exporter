<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { generateVueSfc } from "../../generator/vueGenerator";
import {
  SUPPORTED_XUI_COMPONENTS,
  XUI_SCHEMA_VERSION,
  type LibraryComponentSummary,
  type XuiComponent,
  type XuiMetadata,
  type XuiProps,
} from "../core/metadata/metadata.types";
import type {
  PluginMessage,
  SelectionShapeSummary,
} from "../shared/messages";
import { sendPluginRequest, subscribeToPluginMessages } from "./services/penpotBridge";

type Tab = "mark" | "export";

const activeTab = ref<Tab>("mark");
const component = ref<XuiComponent>("XButton");
const propsText = ref(defaultPropsText("XButton"));
const selection = ref<SelectionShapeSummary[]>([]);
const assets = ref<LibraryComponentSummary[]>([]);
const activeAssetKey = ref("");
const successMessage = ref("");
const vueSource = ref("");
const vueFileName = ref("penpot-export.vue");
const diagnostics = ref<string[]>([]);
const errorMessage = ref("");
let unsubscribe: (() => void) | undefined;

const primarySelection = computed(() => selection.value[0] ?? null);
const hasSelection = computed(() => selection.value.length > 0);
const selectedAsset = computed(
  () => assets.value.find((asset) => asset.assetKey === activeAssetKey.value) ?? null,
);
const hasAssetTarget = computed(() => Boolean(selectedAsset.value));

/** Converts a Penpot root name into a safe default Vue filename. */
function buildVueFileName(rootName: string): string {
  const safeName = rootName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeName || "penpot-export"}.vue`;
}

/** Formats a component name with its library group for unambiguous selection. */
function displayAssetName(asset: LibraryComponentSummary): string {
  return asset.path ? `${asset.path} / ${asset.name}` : asset.name;
}

/** Returns a readable starter props document for the selected semantic component. */
function defaultPropsText(nextComponent: XuiComponent): string {
  const defaults: Record<XuiComponent, XuiProps> = {
    XButton: { text: "查询", type: "primary", action: "search" },
    XInput: {
      model: "query",
      prop: "keyword",
      controlType: "input",
      placeholder: "请输入关键词",
    },
    XFormInput: {
      model: "form",
      prop: "keyword",
      placeholder: "请输入关键词",
      clearable: true,
    },
    XFormSelect: {
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
    XFormDatePicker: {
      model: "form",
      prop: "date",
      type: "date",
      placeholder: "请选择日期",
      valueFormat: "YYYY-MM-DD",
      clearable: true,
    },
    XFieldGroup: { label: "查询条件", prop: "keyword" },
    XQueryForm: {
      model: "query",
      fields: [
        { label: "条件A", prop: "conditionA", type: "input" },
        { label: "条件B", prop: "conditionB", type: "input" },
      ],
    },
    XTable: {
      dataSource: "tableData",
      columns: [
        { label: "字段一", prop: "field1" },
        { label: "字段二", prop: "field2" },
      ],
    },
  };

  return JSON.stringify(defaults[nextComponent], null, 2);
}

/** Applies metadata from the selected asset or current selection to the marker form. */
function syncFormFromTarget(): void {
  const metadata = selectedAsset.value?.metadata ?? primarySelection.value?.metadata;
  if (!metadata) return;

  component.value = metadata.component;
  propsText.value = JSON.stringify(metadata.props, null, 2);
}

/** Applies the host's selection and asset catalog state to the plugin UI. */
function applyAssetState(
  nextSelection: SelectionShapeSummary[],
  nextAssets: LibraryComponentSummary[],
  nextSelectedAssetKey: string | null,
): void {
  selection.value = nextSelection;
  assets.value = nextAssets;

  if (nextSelectedAssetKey && nextAssets.some((asset) => asset.assetKey === nextSelectedAssetKey)) {
    activeAssetKey.value = nextSelectedAssetKey;
  } else if (!nextAssets.some((asset) => asset.assetKey === activeAssetKey.value)) {
    activeAssetKey.value = "";
  }

  syncFormFromTarget();
}

/** Handles messages emitted by the Penpot plugin host. */
function handlePluginMessage(message: PluginMessage): void {
  errorMessage.value = "";
  successMessage.value = "";

  switch (message.type) {
    case "SELECTION_UPDATED":
      applyAssetState(message.selection, message.assets, message.selectedAssetKey);
      return;
    case "METADATA_SAVED":
      applyAssetState(message.selection, message.assets, message.selectedAssetKey);
      return;
    case "BASIC_ASSETS_CREATED":
      assets.value = message.assets;
      successMessage.value = [...message.createdAssetNames, ...message.updatedAssetNames].length
        ? `已整理基础组件源：${[...message.createdAssetNames, ...message.updatedAssetNames].join("、")}`
        : "基础组件源已存在且已完成标记。";
      return;
    case "FORM_ASSETS_CREATED":
      assets.value = message.assets;
      successMessage.value = [...message.createdAssetNames, ...message.updatedAssetNames].length
        ? `已整理 Form 组件源：${[...message.createdAssetNames, ...message.updatedAssetNames].join("、")}`
        : "Form 组件源已存在且已完成标记。";
      return;
    case "COMPONENT_INSTANCE_INSERTED":
      applyAssetState(message.selection, message.assets, message.selectedAssetKey);
      successMessage.value = `已插入组件实例：${message.componentName}`;
      return;
    case "EXPORT_RESULT":
      vueSource.value = generateVueSfc(message.document);
      vueFileName.value = buildVueFileName(message.document.tree.name);
      diagnostics.value = message.diagnostics.map(
        (diagnostic) => `${diagnostic.shapeName}: ${diagnostic.message}`,
      );
      activeTab.value = "export";
      return;
    case "ERROR":
      errorMessage.value = message.message;
      return;
  }
}

/** Requests the latest selection from the Penpot host. */
function refreshSelection(): void {
  sendPluginRequest({ type: "GET_SELECTION" });
}

/** Creates the starter assets, including the semantic DataTable source, in the local library. */
function createBasicAssets(): void {
  sendPluginRequest({ type: "CREATE_BASIC_ASSETS" });
}

/** Creates the Form input/select/date-picker assets in the local library. */
function createFormAssets(): void {
  sendPluginRequest({ type: "CREATE_FORM_ASSETS" });
}

/** Inserts the selected library component as a linked instance on the current page. */
function insertAssetInstance(): void {
  if (!hasAssetTarget.value) {
    errorMessage.value = "请先选择一个组件源。";
    return;
  }

  sendPluginRequest({
    type: "INSERT_COMPONENT_INSTANCE",
    assetKey: activeAssetKey.value,
  });
}

/** Stores the current form as xui metadata on the selected component asset. */
function saveMetadata(): void {
  errorMessage.value = "";

  if (!hasAssetTarget.value) {
    errorMessage.value = "请选择一个组件素材。";
    return;
  }

  try {
    const props = JSON.parse(propsText.value) as XuiProps;
    sendPluginRequest({
      type: "SAVE_METADATA",
      component: component.value,
      props,
      assetKey: activeAssetKey.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Props JSON 无效。";
  }
}

/** Clears xui metadata from the selected component asset. */
function removeMetadata(): void {
  if (!hasAssetTarget.value) {
    errorMessage.value = "请选择一个组件素材。";
    return;
  }

  sendPluginRequest({ type: "REMOVE_METADATA", assetKey: activeAssetKey.value });
}

/** Requests the selected root and generates its Vue SFC preview. */
function exportSelection(): void {
  sendPluginRequest({ type: "EXPORT_SELECTION" });
}

/** Downloads the generated Vue SFC from the plugin iframe. */
function downloadVueFile(): void {
  if (!vueSource.value) return;

  const blob = new Blob([vueSource.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = vueFileName.value;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Switches the marker form to a new component with starter props. */
function onComponentChange(): void {
  if (!selectedAsset.value?.metadata && !primarySelection.value?.metadata) {
    propsText.value = defaultPropsText(component.value);
  }
}

/** Loads the selected asset's existing metadata or starter props into the form. */
function onAssetChange(): void {
  const metadata = selectedAsset.value?.metadata;
  if (metadata) {
    component.value = metadata.component;
    propsText.value = JSON.stringify(metadata.props, null, 2);
    return;
  }

  propsText.value = defaultPropsText(component.value);
}

onMounted(() => {
  unsubscribe = subscribeToPluginMessages(handlePluginMessage);
  refreshSelection();
});

onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <main class="plugin-shell">
    <header class="plugin-header">
      <div>
        <h1>Penpot Vue Exporter</h1>
        <p>标记语义节点，导出 Vue 页面</p>
      </div>
      <span class="schema-badge">xui v{{ XUI_SCHEMA_VERSION }}</span>
    </header>

    <nav class="tabs" aria-label="插件功能">
      <button :class="{ active: activeTab === 'mark' }" @click="activeTab = 'mark'">标记</button>
      <button :class="{ active: activeTab === 'export' }" @click="activeTab = 'export'">导出</button>
    </nav>

    <section v-if="errorMessage" class="notice error">{{ errorMessage }}</section>

    <section v-if="activeTab === 'mark'" class="panel">
      <div class="panel-heading">
        <div>
          <h2>素材库标记</h2>
          <p>创建或整理组件源（含 DataTable）；业务页面请使用插入实例。</p>
        </div>
        <div class="heading-actions">
          <button class="secondary" @click="refreshSelection">刷新</button>
          <button class="primary" :disabled="!hasSelection" @click="exportSelection">导出 Vue</button>
          <button class="primary" @click="createBasicAssets">创建/整理基础组件与表格</button>
          <button class="primary" @click="createFormAssets">创建/整理 Form 组件</button>
        </div>
      </div>

      <section v-if="successMessage" class="notice success">{{ successMessage }}</section>

      <label class="field-label" for="asset">组件素材</label>
      <select id="asset" v-model="activeAssetKey" @change="onAssetChange">
        <option value="">请选择素材库组件</option>
        <option v-for="asset in assets" :key="asset.assetKey" :value="asset.assetKey">
          {{ displayAssetName(asset) }}{{ asset.isLocal ? '（当前文件）' : '（共享库）' }}
        </option>
      </select>

      <div v-if="selectedAsset" class="asset-summary">
        <strong>{{ displayAssetName(selectedAsset) }}</strong>
        <span>{{ selectedAsset.path || '根目录' }} · {{ selectedAsset.isLocal ? '当前文件素材库' : '共享素材库' }}</span>
        <small v-if="selectedAsset.metadata">已标记为 {{ selectedAsset.metadata.component }}</small>
        <small v-else-if="selectedAsset.metadataError" class="asset-error">标记数据异常：{{ selectedAsset.metadataError }}</small>
        <small v-else>尚未标记</small>
        <div class="actions">
          <button class="primary" @click="insertAssetInstance">插入实例到画布</button>
        </div>
      </div>
      <div v-else class="empty-state">请从素材库选择一个组件，或先在画布中选中组件实例。</div>

      <div v-if="hasSelection" class="selection-list">
        <span class="field-label">当前画布选区</span>
        <article v-for="shape in selection" :key="shape.id" class="selection-card">
          <div>
            <strong>{{ shape.name || '(未命名)' }}</strong>
            <span>{{ shape.type }} · {{ Math.round(shape.width) }} × {{ Math.round(shape.height) }}</span>
          </div>
          <small v-if="shape.metadata">
            {{ shape.metadata.component }} · {{ shape.metadataSource === 'asset' ? '素材继承' : 'Shape 覆盖' }}
          </small>
        </article>
      </div>

      <label class="field-label" for="component">导出组件类型</label>
      <select id="component" v-model="component" @change="onComponentChange">
        <option v-for="item in SUPPORTED_XUI_COMPONENTS" :key="item" :value="item">{{ item }}</option>
      </select>

      <label class="field-label" for="props">Props JSON</label>
      <textarea id="props" v-model="propsText" spellcheck="false" rows="12" />

      <div class="actions">
        <button class="primary" :disabled="!hasAssetTarget" @click="saveMetadata">保存到素材</button>
        <button class="secondary" :disabled="!hasAssetTarget" @click="removeMetadata">清除素材标记</button>
      </div>
    </section>

    <section v-else-if="activeTab === 'export'" class="panel">
      <div class="panel-heading">
        <div>
          <h2>导出 Vue</h2>
          <p>选择根 Board，生成对应的 Vue SFC 文件。</p>
        </div>
        <button class="primary" :disabled="!hasSelection" @click="exportSelection">导出 Vue</button>
      </div>

      <div v-if="vueSource || diagnostics.length" class="export-result">
        <div v-if="diagnostics.length" class="notice warning">
          <strong>解析提示</strong>
          <div v-for="diagnostic in diagnostics" :key="diagnostic">{{ diagnostic }}</div>
        </div>
        <div v-if="vueSource" class="vue-result">
          <div class="artifact-heading">
            <strong>{{ vueFileName }}</strong>
            <button class="primary" @click="downloadVueFile">下载 Vue 文件</button>
          </div>
          <pre>{{ vueSource }}</pre>
        </div>
      </div>
      <div v-else class="empty-state">还没有导出结果。</div>
    </section>
  </main>
</template>
