import type { XuiProps, XuiComponent } from "../metadata/metadata.types";

export const IR_SCHEMA_VERSION = "0.1" as const;

export type IRNodeType = "container" | "component";

export type IRLayoutType = "flex" | "grid";

export type IRLayoutDirection =
  | "row"
  | "row-reverse"
  | "column"
  | "column-reverse";

export type IRLayoutAlign = "start" | "end" | "center" | "stretch";

export type IRLayoutContentAlign =
  | "start"
  | "end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "stretch";

export type IRLayoutSizing = "auto" | "fill" | "fit-content" | "fix";

export type IRLayoutChildSizing = "auto" | "fill" | "fix";

export type IRLayoutChildAlign = "auto" | IRLayoutAlign;

export type IRShapeType =
  | "board"
  | "group"
  | "rectangle"
  | "path"
  | "text"
  | "ellipse"
  | "boolean"
  | "svg-raw"
  | "image";

export interface IRPaint {
  color: string;
  opacity: number;
}

export type IRStrokeStyle = "solid" | "dotted" | "dashed";

export interface IRStroke {
  color: string;
  opacity: number;
  width: number;
  style: IRStrokeStyle;
}

export interface IRShadow {
  style: "drop-shadow" | "inner-shadow";
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface IRTextStyle {
  color?: IRPaint;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "uppercase" | "capitalize" | "lowercase";
  textDecoration?: "underline" | "line-through";
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "center" | "bottom";
}

export interface IRStyle {
  opacity?: number;
  fill?: IRPaint;
  stroke?: IRStroke;
  borderRadius?: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
  shadow?: IRShadow;
  blur?: number;
  text?: IRTextStyle;
}

export interface IRDocumentSource {
  type: "penpot";
  fileId: string | null;
  pageId: string | null;
  rootShapeId: string;
}

export interface IRShapeSource {
  shapeId: string;
  shapeType: IRShapeType;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  style?: IRStyle;
}

export interface IRPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface IRGridTrack {
  type: "flex" | "fixed" | "percent" | "auto";
  value: number | null;
}

export interface IRLayoutBase {
  type: IRLayoutType;
  rowGap: number;
  columnGap: number;
  padding: IRPadding;
  alignItems: IRLayoutAlign | null;
  alignContent: IRLayoutContentAlign | null;
  justifyItems: IRLayoutAlign | null;
  justifyContent: IRLayoutContentAlign | null;
  horizontalSizing: IRLayoutSizing | null;
  verticalSizing: IRLayoutSizing | null;
}

export interface IRFlexLayout extends IRLayoutBase {
  type: "flex";
  direction: IRLayoutDirection;
  wrap: "wrap" | "nowrap" | null;
}

export interface IRGridLayout extends IRLayoutBase {
  type: "grid";
  direction: "row" | "column";
  rows: IRGridTrack[];
  columns: IRGridTrack[];
}

export type IRLayout = IRFlexLayout | IRGridLayout;

export interface IRLayoutChild {
  absolute: boolean;
  zIndex: number;
  horizontalSizing: IRLayoutChildSizing;
  verticalSizing: IRLayoutChildSizing;
  alignSelf: IRLayoutChildAlign;
  margin: IRPadding;
}

export interface IRNodeBase {
  id: string;
  name: string;
  nodeType: IRNodeType;
  source: IRShapeSource;
  layout?: IRLayout;
  layoutChild?: IRLayoutChild;
  children: IRNode[];
}

export interface IRContainerNode extends IRNodeBase {
  nodeType: "container";
}

export interface IRComponentNode extends IRNodeBase {
  nodeType: "component";
  component: XuiComponent;
  props: XuiProps;
}

export type IRNode = IRContainerNode | IRComponentNode;

export interface IRDocument {
  schemaVersion: typeof IR_SCHEMA_VERSION;
  source: IRDocumentSource;
  tree: IRNode;
}
