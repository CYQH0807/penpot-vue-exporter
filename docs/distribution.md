# 插件与素材交付

本文说明如何把 Penpot Vue Exporter 交给其他设计师或开发者使用。

## 一、插件包

插件本身和 Penpot 素材是两套交付物：

- 插件包负责读取图层、读取/写入 `xui` 语义标记、导出 IR。
- Penpot 素材库负责保存按钮、输入框、下拉框、日期选择器、字段包裹等视觉组件。

先生成可部署的插件目录：

```bash
pnpm install
pnpm package:plugin
```

命令会先执行类型检查、测试和生产构建，再生成：

```text
release/penpot-vue-exporter-v<package-version>/
├── manifest.json
├── plugin.js
├── index.html
├── assets/                # Vue iframe 的脚本和样式
├── icon.svg
├── _headers
└── README.md
```

这个目录就是静态站点根目录。可以部署到公司 Nginx、Netlify、Cloudflare Pages、GitHub Pages 或其他支持 HTTPS 静态文件的服务。部署后需要确认以下地址都能访问：

```text
https://<your-host>/manifest.json
https://<your-host>/plugin.js
https://<your-host>/icon.svg
```

在 Penpot 的 Plugin Manager 中安装：

```text
https://<your-host>/manifest.json
```

当前 `public/_headers` 会随构建复制到发布目录，为支持该格式的静态托管平台提供跨域响应头。若公司 Nginx 不识别 `_headers`，需要在 Nginx 配置中等效添加 `Access-Control-Allow-Origin`。

### GitHub Pages

仓库已经包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后，GitHub Actions 会执行测试、构建并把版本化插件目录发布到 GitHub Pages。

首次使用时，在仓库 Settings → Pages 中将发布源设置为 `GitHub Actions`。发布完成后，插件安装地址为：

```text
https://<github-owner>.github.io/<repository-name>/manifest.json
```

Pages 发布使用 Actions artifact，不依赖仓库里的 `dist` 或 `release` 目录；每次推送 `main` 都会重新生成插件包。

## 二、Penpot 的团队与项目

Penpot 有 Team、Project、File 三层协作结构。推荐为这套组件建立一个团队内的共享库：

1. 在目标 Team 下创建项目，例如 `BRMS Design System`。
2. 在项目中创建素材源文件，例如 `BRMS Vue Component Library`。
3. 打开插件，在这个素材源文件里点击“新增基础素材”和“新增 Form 素材”。这些素材会创建到当前文件的 File Library。
4. 检查组件视觉和 `xui` 标记，确认无误后，把该文件发布为 Shared Library。
5. 业务页面文件连接这个 Shared Library，直接使用其中的组件实例。

这样做以后，组件视觉和 `xui` 语义只有一个来源。业务页面只保存实例和页面布局，组件修正也可以从素材源文件统一同步。

## 三、素材要不要导出

### 同一个 Penpot Team 内协作

不需要把每个素材单独导出。把 `BRMS Vue Component Library` 发布为 Shared Library，其他文件连接它即可。插件会同时读取当前文件本地素材库和已连接的共享素材库；共享素材会在插件中显示为“共享库”。

建议只在素材源文件中维护 `xui` 标记。业务文件里的共享素材主要用于实例化和布局，避免在不同文件中产生同名、不同语义的本地副本。

需要注意：插件安装不是团队级自动安装。每位要使用插件的成员仍需在自己的 Penpot 账号中安装一次，但安装后可以在有权限的团队文件中使用。

### 跨 Team、交付外部人员或迁移到另一套 Penpot

这时应导出 Penpot 文件，而不是导出单个组件截图：

- 只交付组件库：导出 `BRMS Vue Component Library` 文件，再由对方导入并发布/连接为 Shared Library。
- 交付带页面的完整样例：导出业务文件，并在导出共享库选项中选择保留共享库关系，或将共享库素材合并到文件本地库。

导入后要打开插件检查 `BRMS FormInput`、`BRMS FormSelect`、`BRMS FormDatePicker` 等素材的 `xui` 标记，以及实例是否仍能继承标记。`xui` 是本项目的导出协议，不应只依赖组件名称。

## 四、推荐的交付目录

代码仓库负责插件和协议文档，Penpot Team 负责视觉素材：

```text
代码仓库
├── release/penpot-vue-exporter-v<version>/  # 部署插件
├── docs/ir-schema.md                        # xui/IR 协议
└── docs/distribution.md                     # 本文

Penpot Team
└── BRMS Design System
    └── BRMS Vue Component Library           # Shared Library 源文件
```

## 五、发布前检查

- `pnpm test` 通过。
- `pnpm build` 通过。
- `pnpm package:plugin` 生成版本目录。
- 静态站点能访问 `manifest.json`、`plugin.js`、`icon.svg`。
- 新成员可以安装插件并打开。
- 业务文件已连接 `BRMS Vue Component Library`。
- 插件中能看到共享素材，并显示正确的 `xui` 类型。
- 选择页面根 Board 后，导出 IR 中的字段数量、层级和布局与设计一致。
