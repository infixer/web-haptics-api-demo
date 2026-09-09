import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/manual.ts", "src/debug.ts", "src/css.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "es2022",
  treeshake: true,
});
