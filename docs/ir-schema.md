# XUI IR Schema 0.1

## Metadata

Shape 的 PluginData key 固定为 `xui`，value 是 JSON 字符串：

```json
{
  "schemaVersion": 1,
  "component": "XButton",
  "props": {
    "text": "查询",
    "type": "primary",
    "action": "search"
  }
}
```

当前支持：

- `XButton`
- `XInput`
- `XFormInput`
- `XFormSelect`
- `XFormDatePicker`
- `XFieldGroup`
- `XQueryForm`
- `XTable`

## Document

IR 文档使用 `schemaVersion: "0.1"`，并保留 Penpot source 信息用于调试：

```json
{
  "schemaVersion": "0.1",
  "source": {
    "type": "penpot",
    "fileId": "file-id",
    "pageId": "page-id",
    "rootShapeId": "shape-id"
  },
  "tree": {
    "id": "shape-id",
    "name": "查询页面",
    "nodeType": "container",
    "source": {
      "shapeId": "shape-id",
      "shapeType": "board",
      "parentId": null,
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 600
    },
    "children": []
  }
}
```

带 `xui` 的语义 Shape 优先作为组件节点保留；没有 `xui` 的普通 Shape 会作为 `nodeType: "container"` 保留，并通过 `source.shapeType` 区分原始 Penpot 节点类型。文本 Shape 会额外保留 `source.text`。`source.style` 会保存可安全转换为 CSS 的纯色填充、描边、圆角、阴影、透明度和文字属性；渐变、图片填充及复杂效果暂不进入 IR。

示例：

```json
{
  "shapeId": "panel-id",
  "shapeType": "board",
  "parentId": "page-id",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 200,
  "style": {
    "fill": { "color": "#FFFFFF", "opacity": 1 },
    "stroke": { "color": "#E5E6EB", "opacity": 1, "width": 1, "style": "solid" },
    "borderRadius": { "topLeft": 8, "topRight": 8, "bottomRight": 8, "bottomLeft": 8 }
  }
}
```
