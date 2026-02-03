import solidPlugin from "@opentui/solid/bun-plugin";

const resolveTarget = (): Bun.Build.CompileTarget => {
  const override = process.env.BUILD_TARGET;
  if (override) return override as Bun.Build.CompileTarget;

  const platform = process.platform;
  const arch = process.arch;

  if (platform === "linux" && arch === "x64") return "bun-linux-x64";
  if (platform === "linux" && arch === "arm64") return "bun-linux-arm64";
  if (platform === "darwin" && arch === "arm64") return "bun-darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "bun-darwin-x64";
  if (platform === "win32" && arch === "x64") return "bun-windows-x64";

  throw new Error(`Unsupported build target: ${platform}-${arch}`);
};

const target = resolveTarget();

await Bun.build({
  entrypoints: ["./src/index.tsx"],
  target: "bun",
  outdir: "./build",
  plugins: [solidPlugin],
  compile: {
    target,
    outfile: "opencode-workflows-manager",
  },
});
