import type { Shape } from "@penpot/plugin-types";

/** Returns children through Penpot's discriminated container types. */
export function getShapeChildren(shape: Shape): Shape[] {
  switch (shape.type) {
    case "board":
    case "group":
    case "boolean":
      return shape.children;
    default:
      return [];
  }
}
