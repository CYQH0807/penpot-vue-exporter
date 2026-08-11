import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
);
const distributionRoot = resolve(repositoryRoot, "release");
const distributionDirectory = resolve(
  distributionRoot,
  `penpot-vue-exporter-v${packageJson.version}`,
);
const buildDirectory = resolve(repositoryRoot, "dist");
const requiredFiles = [
  "manifest.json",
  "plugin.js",
  "icon.svg",
  "_headers",
  "index.html",
];
const requiredDirectories = ["assets"];

/** Ensures the production build contains every file referenced by the manifest. */
async function validateBuild() {
  const manifest = JSON.parse(
    await readFile(resolve(buildDirectory, "manifest.json"), "utf8"),
  );

  for (const file of requiredFiles) {
    await readFile(resolve(buildDirectory, file));
  }

  for (const directory of requiredDirectories) {
    const entries = await readdir(resolve(buildDirectory, directory));
    if (entries.length === 0) {
      throw new Error(`Build directory is empty: ${directory}`);
    }
  }

  for (const referencedFile of [manifest.code, manifest.icon]) {
    await readFile(resolve(buildDirectory, referencedFile));
  }
}

/** Copies the hosted plugin files into a versioned handoff directory. */
async function createDistribution() {
  await rm(distributionDirectory, { recursive: true, force: true });
  await mkdir(distributionDirectory, { recursive: true });

  for (const file of requiredFiles) {
    await cp(resolve(buildDirectory, file), resolve(distributionDirectory, file));
  }

  for (const directory of requiredDirectories) {
    await cp(
      resolve(buildDirectory, directory),
      resolve(distributionDirectory, directory),
      { recursive: true },
    );
  }

  const handoffGuide = `# Penpot Vue Exporter v${packageJson.version}

将此目录作为静态站点根目录部署，然后把 \`manifest.json\` 的 HTTPS 地址交给 Penpot 用户安装。

详细说明请参阅仓库中的 \`docs/distribution.md\`。
`;
  await writeFile(resolve(distributionDirectory, "README.md"), handoffGuide);

  console.log(`Plugin distribution created at ${distributionDirectory}`);
}

await validateBuild();
await createDistribution();
