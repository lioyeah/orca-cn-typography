import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const distFile = "dist/index.js";

if (!existsSync(distFile)) {
  console.error(`[build] 缺少 ${distFile}，无法构建。`);
  process.exit(1);
}

const check = spawnSync(process.execPath, ["--check", distFile], {
  stdio: "inherit",
});

if (check.status !== 0) {
  console.error("[build] 语法检查失败。");
  process.exit(check.status ?? 1);
}

console.log("[build] dist/index.js 语法检查通过。");
console.log("[build] 当前项目以 dist 作为可运行产物，构建完成。");
