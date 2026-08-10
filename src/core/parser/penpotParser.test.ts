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
  flex?: Record<string, unknown>;
  pluginData?: string;
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
