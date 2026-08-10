<script setup lang="ts">
import { reactive, ref } from "vue";

function handleSearch(): void {
  // TODO: connect this semantic action to the host page.
}
</script>

<template>
  <div class="p-layout-1">
    <div class="p-item-1">
      <div class="p-layout-2">
        <div class="p-item-2">
          <div class="p-layout-3">
            <div class="p-item-3">
              <XButton type="primary" @click="handleSearch">查询</XButton>
            </div>
          </div>
        </div>
        <div class="p-item-4">
          <div class="p-layout-4">
            <div class="p-item-5">
              <XFormItem label="查询条件" prop="keyword" />
            </div>
            <div class="p-item-6">
              <XFormItem label="查询条件" prop="keyword" />
            </div>
            <div class="p-item-7">
              <XFormItem label="查询条件" prop="keyword" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-layout-1 {
  box-sizing: border-box;
  display: flex;
  row-gap: 0px;
  column-gap: 0px;
  padding: 49px 126px 46px 82px;
  width: 1108px;
  height: 220px;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-content: stretch;
  justify-content: flex-start;
}

.p-item-1 {
  box-sizing: border-box;
  width: 900px;
  height: 125px;
  margin: 0px 0px 0px 0px;
  z-index: 1;
}

.p-layout-2 {
  box-sizing: border-box;
  display: flex;
  row-gap: 15px;
  column-gap: 0px;
  padding: 0px 0px 0px 0px;
  width: 900px;
  height: 125px;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-content: stretch;
  justify-content: flex-start;
}

.p-item-2 {
  box-sizing: border-box;
  width: 900px;
  height: 34px;
  margin: 0px 0px 0px 0px;
}

.p-layout-3 {
  box-sizing: border-box;
  display: flex;
  row-gap: 0px;
  column-gap: 0px;
  padding: 0px 0px 0px 0px;
  width: 900px;
  height: 34px;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  align-content: stretch;
  justify-content: flex-end;
}

.p-item-3 {
  box-sizing: border-box;
  width: 88px;
  height: 34px;
  align-self: center;
  margin: 0px 0px 0px 0px;
}

.p-item-4 {
  box-sizing: border-box;
  width: 900px;
  height: 76px;
  margin: 0px 0px 0px 0px;
}

.p-layout-4 {
  box-sizing: border-box;
  display: flex;
  row-gap: 0px;
  column-gap: 0px;
  padding: 0px 0px 0px 0px;
  width: 900px;
  height: 76px;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-content: stretch;
  justify-content: flex-start;
}

.p-item-5 {
  box-sizing: border-box;
  width: 300px;
  height: 76px;
  align-self: flex-start;
  margin: 0px 0px 0px 0px;
}

.p-item-6 {
  box-sizing: border-box;
  width: 300px;
  height: 76px;
  align-self: flex-start;
  margin: 0px 0px 0px 0px;
}

.p-item-7 {
  box-sizing: border-box;
  width: 300px;
  height: 76px;
  align-self: flex-start;
  margin: 0px 0px 0px 0px;
}
</style>
