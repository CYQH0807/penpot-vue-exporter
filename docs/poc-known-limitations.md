# POC 已知限制

- 当前基础素材支持 `XButton`、`XInput`、`XFieldGroup`，Form 素材支持 `XFormInput`、`XFormSelect`、`XFormDatePicker`，并兼容已有的 `XQueryForm`、`XTable`。
- `brms.*` 是现有设计资产标记，导出器只读取 `xui`，两种协议暂不自动转换。
- 不做 Design Tokens 消费、像素级样式导出、响应式推理或 AI 组件识别。
- Generator 输出的是通用 XUI Vue 组件示意代码，不负责自动接入真实业务接口。
- PluginData 的清除通过写入空字符串完成，待真实 Penpot 运行时验证空 key 的显示行为。
- 当前 FMFB20 页面已经完成首轮导出 Demo 组合；本地素材库已新增并标记 `BRMS Button`、`BRMS Input`、`BRMS FieldGroup` 三个基础资产，组件实例不需要重复标记。
- `BRMS Button` 的查询/重置、`BRMS Input` 的输入框/下拉框通过 `xui.props` 表达，当前尚未做 Penpot Variant 级别的视觉切换。
- 已在 Penpot 新建 `Form Components` 页面，创建 `BRMS FormInput`、`BRMS FormSelect`、`BRMS FormDatePicker` 的实例演示；三类控件分别映射为 `el-input`、`el-select`、`el-date-picker`。
- 已在 Penpot Plugin Manager 中完成本地插件的人工点击验证：素材创建、素材标记读取和组件类型选择均已验证；其余既有资产尚未逐个做业务语义验收。
- 本地插件开发依赖 Penpot 能访问 Vite 服务地址；若浏览器或网络策略阻止 localhost，需要按 Penpot 部署文档调整服务方式。
