import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IRDocument } from "../src/core/ir/ir.types";
import { generateVueSfc } from "./vueGenerator";

/** Reads an IR JSON file and writes the generated Vue SFC. */
async function run(): Promise<void> {
  const [inputPath, outputPath] = process.argv.slice(2).filter((argument) => argument !== "--");
  if (!inputPath) {
    throw new Error("Usage: pnpm generate -- <input.ir.json> [output.vue]");
  }

  const document = JSON.parse(
    await readFile(resolve(inputPath), "utf8"),
  ) as IRDocument;
  const output = generateVueSfc(document);

  if (outputPath) {
    await writeFile(resolve(outputPath), output, "utf8");
    return;
  }

  process.stdout.write(output);
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
