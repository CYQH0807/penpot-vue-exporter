import assert from "node:assert/strict";
import test from "node:test";
import type { LibraryComponent, Shape } from "@penpot/plugin-types";
import {
  listLibraryComponents,
  readEffectiveXuiMetadata,
} from "./assetMetadata.service";
import { writeXuiMetadata } from "./metadata.service";
import type { XuiMetadata } from "./metadata.types";

interface PluginDataStub {
  data: Record<string, string>;
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
}

/** Creates the minimal plugin-data behavior needed by metadata tests. */
function createPluginDataStub(): PluginDataStub {
  return {
    data: {},
    getPluginData(key) {
      return this.data[key] ?? "";
    },
    setPluginData(key, value) {
      this.data[key] = value;
    },
  };
}

/** Creates a fake component asset and its main Shape for inheritance tests. */
function createComponentFixture(): {
  asset: LibraryComponent;
  root: Shape;
  child: Shape;
} {
  const assetData = createPluginDataStub();
  const rootData = createPluginDataStub();
  const childData = createPluginDataStub();
  const assetKey = "library-1:component-1";

  const root = {
    id: "root-1",
    isComponentRoot: () => true,
    componentRoot: () => root,
    component: () => asset,
    getPluginData: rootData.getPluginData.bind(rootData),
    setPluginData: rootData.setPluginData.bind(rootData),
  } as unknown as Shape;
  const child = {
    id: "child-1",
    isComponentRoot: () => false,
    componentRoot: () => root,
    component: () => asset,
    getPluginData: childData.getPluginData.bind(childData),
    setPluginData: childData.setPluginData.bind(childData),
  } as unknown as Shape;
  const asset = {
    id: "component-1",
    libraryId: "library-1",
    name: "BRMS Button",
    path: "BRMS/Button",
    getPluginData: assetData.getPluginData.bind(assetData),
    setPluginData: assetData.setPluginData.bind(assetData),
    mainInstance: () => root,
  } as unknown as LibraryComponent;

  return { asset, root, child };
}

/** Installs a fake Penpot library context for one test and restores it afterward. */
function withPenpotLibrary<T>(asset: LibraryComponent, callback: () => T): T {
  const runtime = globalThis as typeof globalThis & { penpot?: unknown };
  const previous = runtime.penpot;
  runtime.penpot = {
    library: {
      local: { components: [asset] },
      connected: [],
    },
  };

  try {
    return callback();
  } finally {
    runtime.penpot = previous;
  }
}

const buttonMetadata: XuiMetadata = {
  schemaVersion: 1,
  component: "XButton",
  props: { text: "查询", type: "primary", action: "search" },
};

test("inherits metadata from a component asset for its root instance", () => {
  const { asset, root } = createComponentFixture();
  writeXuiMetadata(asset, buttonMetadata);

  const result = withPenpotLibrary(asset, () => readEffectiveXuiMetadata(root));

  assert.deepEqual(result.metadata, buttonMetadata);
  assert.equal(result.source, "asset");
  assert.equal(result.assetKey, "library-1:component-1");
});

test("does not apply the root asset metadata to nested instance children", () => {
  const { asset, child } = createComponentFixture();
  writeXuiMetadata(asset, buttonMetadata);

  const result = withPenpotLibrary(asset, () => readEffectiveXuiMetadata(child));

  assert.equal(result.metadata, null);
  assert.equal(result.source, null);
});

test("lists asset metadata and keeps the asset key stable", () => {
  const { asset } = createComponentFixture();
  writeXuiMetadata(asset, buttonMetadata);

  const assets = withPenpotLibrary(asset, () => listLibraryComponents());

  assert.equal(assets.length, 1);
  assert.equal(assets[0]?.assetKey, "library-1:component-1");
  assert.deepEqual(assets[0]?.metadata, buttonMetadata);
});
