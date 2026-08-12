import assert from "node:assert/strict";
import test from "node:test";
import {
  inferSelectProp,
  isFormSelectAsset,
  isSelectMetadata,
} from "./selectConfig.service";

test("recognizes semantic and Form Select assets", () => {
  assert.equal(
    isSelectMetadata({
      schemaVersion: 1,
      component: "XFormSelect",
      props: { model: "form", prop: "status" },
    }),
    true,
  );
  assert.equal(
    isSelectMetadata({
      schemaVersion: 1,
      component: "XInput",
      props: { model: "form", prop: "status", controlType: "select" },
    }),
    true,
  );
  assert.equal(isFormSelectAsset({ name: "Select", path: "BRMS / Form" }), true);
  assert.equal(isFormSelectAsset({ name: "Input", path: "BRMS / Form" }), false);
  assert.equal(isFormSelectAsset({ name: "Select", path: null as never }), false);
});

test("derives a form prop from a control layer name", () => {
  assert.equal(inferSelectProp("control.shippingType"), "shippingType");
  assert.equal(inferSelectProp("control.发货类型"), "select");
  assert.equal(inferSelectProp(null), "select");
});
