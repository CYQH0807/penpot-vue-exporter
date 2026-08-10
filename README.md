# Penpot Vue Exporter

Penpot Plugin POC：把带有 `xui` PluginData 的 Penpot 素材库组件转换为稳定的 IR，再由独立 Generator 生成 Vue 组件代码。组件实例会自动继承素材定义，不需要逐个实例重复标记。

## Toolchain

项目通过 `package.json` 中的 Volta 配置固定：

- Node.js `22.15.0`
- pnpm `9.15.9`

## Local development

```bash
pnpm install
pnpm build
pnpm dev
```

`pnpm dev` 会持续构建 `dist/plugin.js`；`pnpm dev:ui` 用于单独预览 Vue UI。

在 Penpot Plugin Manager 中加载：

```text
http://localhost:4173/manifest.json
```

准备给其他人使用时，执行：

```bash
pnpm package:plugin
```

命令会生成 `release/penpot-vue-exporter-v<version>/`，该目录可以直接作为静态站点根目录部署。部署后把 `manifest.json` 的 HTTPS 地址交给其他人安装。完整的插件部署、团队共享库和素材交付说明见 [`docs/distribution.md`](docs/distribution.md)。

## MCP layout workflow

推荐的页面生成流程是：先在 Penpot 中拖拽出大致位置，再让 AI 通过 Penpot MCP 读取图层树和视觉快照，直接整理容器层级并应用 Flex/Grid。插件导出 IR 时会保留布局配置和布局子项信息，Generator 再把它转换成 Vue 模板与 CSS。

```text
拖拽页面 → Penpot MCP 优化层级和布局 → 插件导出 IR → Generator 生成 Vue
```

从导出的 IR 生成 Vue：

```bash
pnpm generate -- artifacts/page-1.ai-flex.ir.json artifacts/page-1.ai-flex.vue
```

## POC scope

- 基础素材：`XButton`、`XInput`、`XFieldGroup`
- Form 素材：`XFormInput`、`XFormSelect`、`XFormDatePicker`
- 复杂组件兼容：`XQueryForm`、`XTable`

插件的“新增基础素材”会在当前文件素材库创建并标记 3 个可复用组件：

- `BRMS Button`：默认查询按钮；通过 `text`、`type`、`action` 支持重置等按钮语义。
- `BRMS Input`：通过 `controlType` 区分输入框和下拉框。
- `BRMS FieldGroup`：带标题的包裹组件，可承载输入控件等语义子节点。

插件的“新增 Form 素材”会创建并标记三种控件：

- `BRMS FormInput` → 生成 `XInput`，在业务项目中映射到 `el-input`。
- `BRMS FormSelect` → 生成 `XSelect`，在业务项目中映射到 `el-select`。
- `BRMS FormDatePicker` → 生成 `XDatePicker`，在业务项目中映射到 `el-date-picker`。

导出协议使用素材库组件 PluginData 的 `xui` key，值为带 `schemaVersion` 的 JSON 字符串。插件的“标记”页会直接把语义写入选中的组件素材，后续实例在解析时自动继承；已有 Shape 级 `xui` 仍作为覆盖和兼容路径保留。现有设计中的 `brms.*` 数据作为设计来源标记保留，不与导出协议混用。
