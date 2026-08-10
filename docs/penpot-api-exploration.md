# Penpot API 探索记录

> 首轮基线：2026-08-08。类型定义来自 `@penpot/plugin-types@1.4.2`，运行时状态通过当前 Penpot MCP 只读探测确认。

## 已确认

- `penpot.selection` 返回当前选中的 `Shape[]`。
- `penpot.currentPage` 和 `penpot.currentPage.root` 可作为当前页面树入口。
- Shape 使用 `children` 表示层级，Shape 使用 `parent` 表示父节点。
- Shape 可以通过 `getPluginData`、`setPluginData`、`getPluginDataKeys` 读写插件数据。
- 组件素材可通过 `penpot.library.local.components` 和已连接素材库的组件集合读取；组件素材同样支持 PluginData 读写。
- `penpot.on("selectionchange", callback)` 可以监听选区变化。
- `penpot.ui.sendMessage`、`penpot.ui.onMessage` 用于 Plugin Host 与 Vue iframe 通信。
- `penpot.currentFile.id`、`penpot.currentPage.id` 可作为 IR source 信息。

## 当前 FMFB20 文件基线

- 当前页面：`FMFB20 POC`。
- 本地组件库已有 9 个 BRMS 组件，其中本次新增 `BRMS Button`、`BRMS Input`、`BRMS FieldGroup` 三个基础素材。
- 已有 `BRMS FMFB20 POC` Token Set；本 POC 不消费 Tokens。
- 页面已有 `brms.*` 设计标记，并曾在 4 个 Demo 节点上补充 Shape 级 `xui` 导出标记：两个 `XButton`、一个 `XQueryForm`、一个 `XTable`。插件现在优先把新标记写入素材库组件，Shape 级标记作为覆盖/兼容路径保留。
- `BRMS DataTable` 已实例化为 `FMFB20.result`，放置在 `FMFB20 / RecordSet` 下方并保留现有组件关系。
- 本地素材库的 `BRMS DataTable` 已在插件中标记为 `XTable`；刷新插件后仍可读取，实例导出结果也显示为 `XTable`。
- 插件通过 `penpot.library.local.createComponent()` 创建基础素材，并把初始 `xui` 写入 `LibraryComponent`；素材列表会在创建后重新读取。

## 待在真实插件中验证

- PluginData 清空后，Penpot 是否保留空 key；代码将空字符串视为无标记。
- 复制已标记 Shape 时，`xui` 是否随复制保留。
- `children` 顺序与设计面板顺序在实际导出场景中的一致性。
- 共享素材库组件在不同权限和协作场景下的写入限制，仍需在实际团队素材库中验证。
