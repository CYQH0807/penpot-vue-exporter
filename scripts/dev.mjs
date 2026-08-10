import { spawn } from "node:child_process";

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = [];
let shuttingDown = false;

/** Starts one development process with the repository's package manager. */
function startProcess(args) {
  const child = spawn(packageManager, args, {
    env: process.env,
    stdio: "inherit",
  });
  children.push(child);
  return child;
}

/** Stops all child processes when the development session exits. */
function stopProcesses(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => child.kill("SIGTERM"));
  setTimeout(() => process.exit(exitCode), 100);
}

startProcess(["run", "build:ui", "--", "--watch"]);
startProcess(["run", "build:plugin", "--", "--watch"]);
const preview = startProcess([
  "exec",
  "vite",
  "preview",
  "--host",
  "0.0.0.0",
  "--port",
  "4173",
]);

children.forEach((child) => {
  child.on("exit", (code) => {
    if (!shuttingDown && child !== preview && code !== 0) {
      stopProcesses(code ?? 1);
    }
  });
});

process.on("SIGINT", () => stopProcesses());
process.on("SIGTERM", () => stopProcesses());
