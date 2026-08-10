import assert from "node:assert/strict";
import test from "node:test";
import type { Shape } from "@penpot/plugin-types";
import { getShapeChildren } from "./shapeTree";

/** Creates a minimal shape stub for container traversal tests. */
function shapeStub(type: Shape["type"], children: Shape[] = []): Shape {
  return { type, children } as unknown as Shape;
}

test("reads children from Penpot board, group, and boolean containers", () => {
  const child = shapeStub("rectangle");

  for (const containerType of ["board", "group", "boolean"] as const) {
    const container = shapeStub(containerType, [child]);
    assert.deepEqual(getShapeChildren(container), [child]);
  }
});

test("does not treat leaf shapes as containers", () => {
  const child = shapeStub("rectangle");
  assert.deepEqual(getShapeChildren(shapeStub("rectangle", [child])), []);
  assert.deepEqual(getShapeChildren(shapeStub("text", [child])), []);
});
