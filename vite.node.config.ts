import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
  plugins: [
    {
      name: "heat-node-room-store", enforce: "pre",
      load(id) {
        if (id === fileURLToPath(new URL("./db/room-store.ts", import.meta.url))) {
          return readFileSync(new URL("./db/room-store.node.ts", import.meta.url), "utf8");
        }
      },
    },
    vinext(), sites({ mockAuth: false }),
  ],
});
