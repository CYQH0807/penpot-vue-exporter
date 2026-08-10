import assert from "node:assert/strict";
import test from "node:test";
import type { IRDocument } from "../src/core/ir/ir.types";
import { generateVueSfc } from "./vueGenerator";

const sampleDocument: IRDocument = {
  schemaVersion: "0.1",
  source: {
    type: "penpot",
    fileId: "file-1",
    pageId: "page-1",
    rootShapeId: "root-1",
  },
  tree: {
    id: "root-1",
    name: "Demo",
    nodeType: "container",
    source: {
      shapeId: "root-1",
      shapeType: "board",
      parentId: null,
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    },
    children: [
      {
        id: "button-1",
        name: "查询按钮",
        nodeType: "component",
        component: "XButton",
        props: { text: "查询", type: "primary", action: "search" },
        source: {
          shapeId: "button-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 0,
          width: 80,
          height: 32,
        },
        children: [],
      },
      {
        id: "table-1",
        name: "结果表格",
        nodeType: "component",
        component: "XTable",
        props: {
          dataSource: "tableData",
          columns: [{ label: "字段一", prop: "field1" }],
        },
        source: {
          shapeId: "table-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 40,
          width: 600,
          height: 240,
        },
        children: [],
      },
      {
        id: "field-group-1",
        name: "关键词条件",
        nodeType: "component",
        component: "XFieldGroup",
        props: { label: "关键词", prop: "keyword" },
        source: {
          shapeId: "field-group-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 300,
          width: 300,
          height: 76,
        },
        children: [
          {
            id: "input-1",
            name: "关键词输入框",
            nodeType: "component",
            component: "XInput",
            props: {
              model: "query",
              prop: "keyword",
              controlType: "input",
              placeholder: "请输入",
            },
            source: {
              shapeId: "input-1",
              shapeType: "board",
              parentId: "field-group-1",
              x: 12,
              y: 32,
              width: 240,
              height: 34,
            },
            children: [],
          },
        ],
      },
      {
        id: "form-input-1",
        name: "表单输入框",
        nodeType: "component",
        component: "XFormInput",
        props: {
          model: "form",
          prop: "keyword",
          placeholder: "请输入关键词",
          clearable: true,
        },
        source: {
          shapeId: "form-input-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 390,
          width: 240,
          height: 34,
        },
        children: [],
      },
      {
        id: "form-select-1",
        name: "表单下拉框",
        nodeType: "component",
        component: "XFormSelect",
        props: {
          model: "form",
          prop: "status",
          placeholder: "请选择状态",
          options: [{ label: "启用", value: "enabled" }],
        },
        source: {
          shapeId: "form-select-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 430,
          width: 240,
          height: 34,
        },
        children: [],
      },
      {
        id: "form-date-picker-1",
        name: "表单日期选择",
        nodeType: "component",
        component: "XFormDatePicker",
        props: {
          model: "form",
          prop: "date",
          type: "date",
          placeholder: "请选择日期",
          valueFormat: "YYYY-MM-DD",
        },
        source: {
          shapeId: "form-date-picker-1",
          shapeType: "board",
          parentId: "root-1",
          x: 0,
          y: 470,
          width: 240,
          height: 34,
        },
        children: [],
      },
    ],
  },
};

test("generates Vue markup and bindings from IR", () => {
  const output = generateVueSfc(sampleDocument);

  assert.match(output, /<XButton type="primary" @click="handleSearch">查询<\/XButton>/);
  assert.match(output, /<XTable :data="tableData">/);
  assert.match(output, /<XTableColumn label="字段一" prop="field1" \/>/);
  assert.match(output, /<XFormItem label="关键词" prop="keyword">/);
  assert.match(output, /<XInput v-model="query.keyword" placeholder="请输入" \/>/);
  assert.match(output, /<XInput v-model="form.keyword" placeholder="请输入关键词" clearable \/>/);
  assert.match(output, /<XSelect v-model="form.status" placeholder="请选择状态"/);
  assert.match(output, /<XDatePicker v-model="form.date" placeholder="请选择日期" type="date" value-format="YYYY-MM-DD" \/>/);
  assert.match(output, /const form = reactive<Record<string, unknown>>\(\{\}\);/);
  assert.match(output, /const query = reactive<Record<string, unknown>>\(\{\}\);/);
  assert.match(output, /function handleSearch\(\)/);
  assert.doesNotMatch(output, /penpot\./i);
});

test("generates Flex CSS and layout item wrappers from IR", () => {
  const layoutDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      layout: {
        type: "flex",
        direction: "column",
        wrap: "nowrap",
        rowGap: 16,
        columnGap: 0,
        padding: { top: 24, right: 16, bottom: 24, left: 16 },
        alignItems: "start",
        alignContent: null,
        justifyItems: null,
        justifyContent: "start",
        horizontalSizing: "fix",
        verticalSizing: "auto",
      },
      children: sampleDocument.tree.children.map((child) => ({
        ...child,
        layoutChild: {
          absolute: false,
          zIndex: 0,
          horizontalSizing: "fix",
          verticalSizing: "fix",
          alignSelf: "auto",
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      })),
    },
  };

  const output = generateVueSfc(layoutDocument);

  assert.match(output, /display: flex;/);
  assert.match(output, /flex-direction: column;/);
  assert.match(output, /row-gap: 16px;/);
  assert.match(output, /padding: 24px 16px 24px 16px;/);
  assert.match(output, /\.p-item-1/);
  assert.match(output, /width: 80px;/);
});
