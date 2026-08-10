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

未标记且没有语义后代的普通视觉 Shape 不进入 IR；带 `xui` 的语义 Shape 优先作为组件节点保留。
