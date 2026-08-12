import assert from "node:assert/strict";
import test from "node:test";
import type { Shape } from "@penpot/plugin-types";
import { parsePenpotSelection } from "./penpotParser";

interface ShapeOverrides {
  type: Shape["type"];
  id: string;
  name: string;
  x: number;
  y: number;
  parentIndex: number;
  children?: Shape[];
  characters?: string;
  flex?: Record<string, unknown>;
  pluginData?: string;
  fills?: Shape["fills"];
  strokes?: Shape["strokes"];
  opacity?: number;
  borderRadiusTopLeft?: number;
  borderRadiusTopRight?: number;
  borderRadiusBottomRight?: number;
  borderRadiusBottomLeft?: number;
  shadows?: Shape["shadows"];
  blur?: Shape["blur"];
  fontFamily?: string | "mixed";
  fontSize?: string | "mixed";
  fontWeight?: string | "mixed";
  fontStyle?: "normal" | "italic" | "mixed" | null;
  lineHeight?: string | "mixed";
  letterSpacing?: string | "mixed";
  textTransform?: "uppercase" | "capitalize" | "lowercase" | "mixed" | null;
  textDecoration?: "underline" | "line-through" | "mixed" | null;
  align?: "left" | "center" | "right" | "justify" | "mixed" | null;
  verticalAlign?: "top" | "center" | "bottom" | null;
}

/** Creates the minimal Penpot shape behavior needed by parser ordering tests. */
function shapeStub(overrides: ShapeOverrides): Shape {
  return {
    ...overrides,
    children: overrides.children ?? [],
    width: 100,
    height: 40,
    parent: null,
    getPluginData: () => overrides.pluginData ?? "",
    componentRoot: () => null,
    component: () => null,
  } as unknown as Shape;
}

/** Installs an empty Penpot library so metadata lookup stays deterministic. */
function withEmptyPenpot<T>(callback: () => T): T {
  const runtime = globalThis as typeof globalThis & { penpot?: unknown };
  const previous = runtime.penpot;
  runtime.penpot = { library: { local: { components: [] }, connected: [] } };

  try {
    return callback();
  } finally {
    runtime.penpot = previous;
  }
}

test("orders Flex children by their visual flow direction", () => {
  const right = shapeStub({
    type: "board",
    id: "right",
    name: "Right",
    x: 100,
    y: 0,
    parentIndex: 0,
    pluginData: JSON.stringify({
      schemaVersion: 1,
      component: "XButton",
      props: { text: "Right", type: "primary" },
    }),
  });
  const left = shapeStub({
    type: "board",
    id: "left",
    name: "Left",
    x: 0,
    y: 0,
    parentIndex: 1,
    pluginData: JSON.stringify({
      schemaVersion: 1,
      component: "XButton",
      props: { text: "Left", type: "primary" },
    }),
  });
  const root = shapeStub({
    type: "board",
    id: "root",
    name: "Flex Root",
    x: 0,
    y: 0,
    parentIndex: 0,
    children: [right, left],
    flex: {
      dir: "row",
      wrap: "nowrap",
      rowGap: 0,
      columnGap: 0,
      topPadding: 0,
      rightPadding: 0,
      bottomPadding: 0,
      leftPadding: 0,
      alignItems: "start",
      alignContent: "stretch",
      justifyItems: "start",
      justifyContent: "start",
      horizontalSizing: "auto",
      verticalSizing: "auto",
    },
  });

  const result = withEmptyPenpot(() =>
    parsePenpotSelection(root, { fileId: null, pageId: null }),
  );

  assert.deepEqual(
    result.document.tree.children.map((child) => child.id),
    ["left", "right"],
  );
});

test("keeps unmarked structural and leaf nodes alongside marked components", () => {
  const title = shapeStub({
    type: "text",
    id: "title",
    name: "page.title",
    characters: "合同详情",
    x: 16,
    y: 12,
    parentIndex: 0,
  });
  const section = shapeStub({
    type: "board",
    id: "section",
    name: "section.basic",
    x: 0,
    y: 0,
    parentIndex: 0,
    children: [title],
  });
  const button = shapeStub({
    type: "board",
    id: "button",
    name: "action.submit",
    x: 0,
    y: 80,
    parentIndex: 1,
    pluginData: JSON.stringify({
      schemaVersion: 1,
      component: "XButton",
      props: { text: "提交", type: "primary" },
    }),
  });
  const root = shapeStub({
    type: "board",
    id: "root",
    name: "合同详情 / 页面",
    x: 0,
    y: 0,
    parentIndex: 0,
    children: [section, button],
  });

  const result = withEmptyPenpot(() =>
    parsePenpotSelection(root, { fileId: null, pageId: null }),
  );

  assert.deepEqual(
    result.document.tree.children.map((child) => [child.id, child.nodeType]),
    [
      ["section", "container"],
      ["button", "component"],
    ],
  );
  assert.deepEqual(
    result.document.tree.children[0].children.map((child) => child.id),
    ["title"],
  );
  assert.equal(result.document.tree.children[0].children[0].source.text, "合同详情");
});

test("captures visual fills, strokes, radii, shadows, and text styles", () => {
  const title = shapeStub({
    type: "text",
    id: "title",
    name: "page.title",
    characters: "合同详情",
    x: 16,
    y: 12,
    parentIndex: 0,
    fills: [{ fillColor: "#1D2129", fillOpacity: 0.9 }],
    fontFamily: "Inter",
    fontSize: "16",
    fontWeight: "600",
    fontStyle: "normal",
    lineHeight: "24",
    letterSpacing: "0",
    align: "left",
    verticalAlign: "center",
  });
  const panel = shapeStub({
    type: "board",
    id: "panel",
    name: "panel.basic",
    x: 0,
    y: 0,
    parentIndex: 0,
    children: [title],
    fills: [{ fillColor: "#FFFFFF", fillOpacity: 1 }],
    strokes: [{
      strokeColor: "#E5E6EB",
      strokeOpacity: 1,
      strokeStyle: "solid",
      strokeWidth: 1,
      strokeAlignment: "inner",
    }],
    borderRadiusTopLeft: 8,
    borderRadiusTopRight: 8,
    borderRadiusBottomRight: 8,
    borderRadiusBottomLeft: 8,
    shadows: [{
      style: "drop-shadow",
      offsetX: 0,
      offsetY: 2,
      blur: 8,
      spread: 0,
      hidden: false,
      color: { color: "#000000", opacity: 0.12 },
    }],
  });

  const result = withEmptyPenpot(() =>
    parsePenpotSelection(panel, { fileId: null, pageId: null }),
  );
  const panelStyle = result.document.tree.source.style;
  const titleStyle = result.document.tree.children[0]?.source.style;

  assert.deepEqual(panelStyle?.fill, { color: "#FFFFFF", opacity: 1 });
  assert.deepEqual(panelStyle?.stroke, {
    color: "#E5E6EB",
    opacity: 1,
    width: 1,
    style: "solid",
  });
  assert.deepEqual(panelStyle?.borderRadius, {
    topLeft: 8,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 8,
  });
  assert.deepEqual(panelStyle?.shadow, {
    style: "drop-shadow",
    offsetX: 0,
    offsetY: 2,
    blur: 8,
    spread: 0,
    color: "#000000",
    opacity: 0.12,
  });
  assert.deepEqual(titleStyle?.text, {
    color: { color: "#1D2129", opacity: 0.9 },
    fontFamily: "Inter",
    fontSize: "16",
    fontWeight: "600",
    fontStyle: "normal",
    lineHeight: "24",
    letterSpacing: "0",
    align: "left",
    verticalAlign: "center",
  });
});
