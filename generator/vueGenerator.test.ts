import assert from "node:assert/strict";
import test from "node:test";
import type { IRDocument, IRNode } from "../src/core/ir/ir.types";
import { generateVueSfc } from "./vueGenerator";

/** Builds a field fixture with the nested control structure used by the Penpot page. */
function createNestedFieldFixture(
  id: string,
  label: string,
  controlChildren: IRNode[],
): IRNode {
  return {
    id,
    name: `field.${id}`,
    nodeType: "container",
    source: {
      shapeId: id,
      shapeType: "board",
      parentId: "root-1",
      x: 0,
      y: 0,
      width: 276,
      height: 72,
    },
    children: [
      {
        id: `${id}-label`,
        name: `label.${id}`,
        nodeType: "container",
        source: {
          shapeId: `${id}-label`,
          shapeType: "text",
          parentId: id,
          x: 0,
          y: 0,
          width: 80,
          height: 15,
          text: label,
        },
        children: [],
      },
      {
        id: `${id}-control`,
        name: `control.${id}`,
        nodeType: "container",
        source: {
          shapeId: `${id}-control`,
          shapeType: "board",
          parentId: id,
          x: 0,
          y: 24,
          width: 240,
          height: 34,
        },
        children: controlChildren,
      },
    ],
  };
}

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
          codeSet: "BRMS.STATUS",
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
  assert.match(output, /<XSelect v-model="form.status" placeholder="请选择状态" codeSet="BRMS.STATUS"/);
  assert.match(output, /<XDatePicker v-model="form.date" placeholder="请选择日期" type="date" value-format="YYYY-MM-DD" \/>/);
  assert.match(output, /const form = reactive<Record<string, unknown>>\(\{\}\);/);
  assert.match(output, /const query = reactive<Record<string, unknown>>\(\{\}\);/);
  assert.match(output, /function handleSearch\(\)/);
  assert.doesNotMatch(output, /penpot\./i);
});

test("preserves codeSet when a Select is inferred from a marked control", () => {
  const inferredDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      children: [
        createNestedFieldFixture("shippingType", "发货类型", [
          {
            id: "shipping-type-control",
            name: "control.shippingType",
            nodeType: "component",
            component: "XFormSelect",
            props: {
              model: "form",
              prop: "shippingType",
              codeSet: "BRMS.SHIPPING_TYPE",
            },
            source: {
              shapeId: "shipping-type-control",
              shapeType: "board",
              parentId: "shippingType-control",
              x: 0,
              y: 24,
              width: 240,
              height: 34,
            },
            children: [],
          },
        ]),
      ],
    },
  };

  const output = generateVueSfc(inferredDocument);

  assert.match(output, /<XFormItem label="发货类型" prop="shippingType">/);
  assert.match(output, /<XSelect v-model="form.shippingType" codeSet="BRMS.SHIPPING_TYPE" \/>/);
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

test("generates visual CSS for unmarked containers and text", () => {
  const visualDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      children: [
        {
          id: "panel-1",
          name: "panel.basic",
          nodeType: "container",
          source: {
            shapeId: "panel-1",
            shapeType: "board",
            parentId: "root-1",
            x: 0,
            y: 0,
            width: 400,
            height: 200,
            style: {
              fill: { color: "#FFFFFF", opacity: 1 },
              stroke: { color: "#E5E6EB", opacity: 1, width: 1, style: "solid" },
              borderRadius: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 },
              shadow: {
                style: "drop-shadow",
                offsetX: 0,
                offsetY: 2,
                blur: 8,
                spread: 0,
                color: "#000000",
                opacity: 0.12,
              },
            },
          },
          children: [
            {
              id: "title-1",
              name: "page.title",
              nodeType: "container",
              source: {
                shapeId: "title-1",
                shapeType: "text",
                parentId: "panel-1",
                x: 16,
                y: 16,
                width: 120,
                height: 24,
                text: "合同详情",
                style: {
                  text: {
                    color: { color: "#1D2129", opacity: 0.9 },
                    fontFamily: "Inter",
                    fontSize: "16",
                    fontWeight: "600",
                    lineHeight: "24",
                    letterSpacing: "0",
                    align: "left",
                  },
                },
              },
              children: [],
            },
          ],
        },
      ],
    },
  };

  const output = generateVueSfc(visualDocument);

  assert.match(output, /background-color: #FFFFFF;/);
  assert.match(output, /border: 1px solid #E5E6EB;/);
  assert.match(output, /border-radius: 8px 8px 8px 8px;/);
  assert.match(output, /box-shadow: 0px 2px 8px 0px rgba\(0, 0, 0, 0\.12\);/);
  assert.match(output, /color: rgba\(29, 33, 41, 0\.9\);/);
  assert.match(output, /font-size: 16px;/);
  assert.match(output, /font-weight: 600;/);
  assert.match(output, /line-height: 24px;/);
});

test("keeps unitless Penpot line-height values unitless", () => {
  const output = generateVueSfc({
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      children: [
        {
          id: "text-line-height",
          name: "title",
          nodeType: "container",
          source: {
            shapeId: "text-line-height",
            shapeType: "text",
            parentId: "root-1",
            x: 0,
            y: 0,
            width: 100,
            height: 24,
            text: "标题",
            style: { text: { lineHeight: "1.2" } },
          },
          children: [],
        },
      ],
    },
  });

  assert.match(output, /line-height: 1\.2;/);
  assert.doesNotMatch(output, /line-height: 1\.2px;/);
});

test("positions components and containers inside a freeform parent", () => {
  const freeformDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      source: {
        ...sampleDocument.tree.source,
        width: 1276,
        height: 1450,
      },
      children: [
        {
          id: "status-1",
          name: "status",
          nodeType: "component",
          component: "XButton",
          props: { text: "履行中", type: "primary" },
          source: {
            shapeId: "status-1",
            shapeType: "board",
            parentId: "root-1",
            x: 1165,
            y: 36,
            width: 76,
            height: 26,
          },
          children: [],
        },
        {
          id: "panel-1",
          name: "panel",
          nodeType: "container",
          source: {
            shapeId: "panel-1",
            shapeType: "board",
            parentId: "root-1",
            x: 30,
            y: 134,
            width: 1216,
            height: 260,
          },
          children: [],
        },
      ],
    },
  };

  const output = generateVueSfc(freeformDocument);

  assert.match(output, /position: relative;[\s\S]*flex: 0 0 auto;/);
  assert.match(output, /position: absolute;[\s\S]*left: 1165px;[\s\S]*top: 36px;/);
  assert.match(output, /position: absolute;[\s\S]*left: 30px;[\s\S]*top: 134px;/);
});

test("renders unmarked text and conventional input layers", () => {
  const fieldDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      children: [
        {
          id: "field-party-b-address",
          name: "field.partyBAddress",
          nodeType: "container",
          source: {
            shapeId: "field-party-b-address",
            shapeType: "group",
            parentId: "root-1",
            x: 0,
            y: 0,
            width: 300,
            height: 76,
          },
          children: [
            {
              id: "label-party-b-address",
              name: "label.partyBAddress",
              nodeType: "container",
              source: {
                shapeId: "label-party-b-address",
                shapeType: "text",
                parentId: "field-party-b-address",
                x: 0,
                y: 0,
                width: 80,
                height: 20,
                text: "乙方地址",
              },
              children: [],
            },
            {
              id: "control-party-b-address",
              name: "control.partyBAddress",
              nodeType: "container",
              source: {
                shapeId: "control-party-b-address",
                shapeType: "board",
                parentId: "field-party-b-address",
                x: 0,
                y: 24,
                width: 240,
                height: 34,
              },
              children: [
                {
                  id: "input-surface-party-b-address",
                  name: "input.surface",
                  nodeType: "container",
                  source: {
                    shapeId: "input-surface-party-b-address",
                    shapeType: "rectangle",
                    parentId: "control-party-b-address",
                    x: 0,
                    y: 0,
                    width: 238,
                    height: 32,
                  },
                  children: [],
                },
                {
                  id: "input-placeholder-party-b-address",
                  name: "input.placeholder",
                  nodeType: "container",
                  source: {
                    shapeId: "input-placeholder-party-b-address",
                    shapeType: "text",
                    parentId: "control-party-b-address",
                    x: 12,
                    y: 8,
                    width: 120,
                    height: 16,
                    text: "请输入乙方地址",
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const output = generateVueSfc(fieldDocument);

  assert.match(output, /<XFormItem label="乙方地址" prop="partyBAddress">/);
  assert.match(output, /<XInput v-model="form\.partyBAddress" placeholder="请输入乙方地址" \/>/);
  assert.match(output, /const form = reactive<Record<string, unknown>>\(\{\}\);/);
  assert.doesNotMatch(output, /<!--/);
});

test("infers nested select and date controls from their visible placeholders", () => {
  const nestedFieldDocument: IRDocument = {
    ...sampleDocument,
    tree: {
      ...sampleDocument.tree,
      children: [
        createNestedFieldFixture("contractType", "合同类型", [
          {
            id: "contract-type-placeholder",
            name: "请选择状态",
            nodeType: "container",
            source: {
              shapeId: "contract-type-placeholder",
              shapeType: "text",
              parentId: "contractType-control",
              x: 12,
              y: 8,
              width: 70,
              height: 16,
              text: "请选择状态",
            },
            children: [],
          },
          {
            id: "contract-type-arrow",
            name: "⌄",
            nodeType: "container",
            source: {
              shapeId: "contract-type-arrow",
              shapeType: "text",
              parentId: "contractType-control",
              x: 214,
              y: 8,
              width: 9,
              height: 16,
              text: "⌄",
            },
            children: [],
          },
        ]),
        createNestedFieldFixture("signDate", "签订日期", [
          {
            id: "sign-date-placeholder",
            name: "请选择日期",
            nodeType: "container",
            source: {
              shapeId: "sign-date-placeholder",
              shapeType: "text",
              parentId: "signDate-control",
              x: 12,
              y: 8,
              width: 70,
              height: 16,
              text: "请选择日期",
            },
            children: [],
          },
          {
            id: "sign-date-icon",
            name: "▣",
            nodeType: "container",
            source: {
              shapeId: "sign-date-icon",
              shapeType: "text",
              parentId: "signDate-control",
              x: 214,
              y: 8,
              width: 13,
              height: 16,
              text: "▣",
            },
            children: [],
          },
        ]),
      ],
    },
  };

  const output = generateVueSfc(nestedFieldDocument);

  assert.match(output, /<XFormItem label="合同类型" prop="contractType">/);
  assert.match(output, /<XSelect v-model="form\.contractType" placeholder="请选择状态" \/>/);
  assert.match(output, /<XFormItem label="签订日期" prop="signDate">/);
  assert.match(output, /<XDatePicker v-model="form\.signDate" placeholder="请选择日期" type="date" \/>/);
});
