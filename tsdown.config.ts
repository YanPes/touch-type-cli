import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/cli.tsx"],
	format: "esm",
	platform: "node",
	target: "node22",
	dts: false,
	clean: true,
});
