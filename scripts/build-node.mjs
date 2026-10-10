import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
const result = spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url)), "build"], {
  stdio: "inherit", env: { ...process.env, HEAT_RUNTIME: "node" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
