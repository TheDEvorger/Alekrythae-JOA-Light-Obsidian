const fs = require("fs");
const path = require("path");

const root = __dirname;
const buildDir = path.join(root, "build");
const releaseDir = path.join(root, "release", "joa-frp-writer");

function walkJs(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJs(absolute, base));
    else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push({
        absolute,
        id: path.relative(base, absolute).replace(/\\/g, "/").replace(/\.js$/, "")
      });
    }
  }
  return files.sort((a, b) => a.id.localeCompare(b.id));
}

function bundleCommonJs() {
  const modules = walkJs(buildDir);
  if (!modules.some((item) => item.id === "main")) {
    throw new Error("build/main.js bulunamadı.");
  }

  const factories = modules.map(({ absolute, id }) => {
    const source = fs.readFileSync(absolute, "utf8");
    return `${JSON.stringify(id)}: function(module, exports, require) {\n${source}\n}`;
  }).join(",\n");

  return `/* JOA Light - bundled Obsidian release. Generated from modular TypeScript sources. */\n` +
`"use strict";\n` +
`const __nativeRequire = require;\n` +
`const __modules = {\n${factories}\n};\n` +
`const __cache = Object.create(null);\n` +
`function __resolve(fromId, request) {\n` +
`  const base = fromId.split("/");\n` +
`  base.pop();\n` +
`  for (const part of request.split("/")) {\n` +
`    if (!part || part === ".") continue;\n` +
`    if (part === "..") { if (!base.length) throw new Error("Module path escapes root"); base.pop(); }\n` +
`    else base.push(part);\n` +
`  }\n` +
`  return base.join("/").replace(/\\.js$/, "");\n` +
`}\n` +
`function __load(id) {\n` +
`  if (__cache[id]) return __cache[id].exports;\n` +
`  const factory = __modules[id];\n` +
`  if (!factory) throw new Error("Unknown internal module: " + id);\n` +
`  const module = { exports: {} };\n` +
`  __cache[id] = module;\n` +
`  const localRequire = (request) => {\n` +
`    if (request.startsWith(".")) return __load(__resolve(id, request));\n` +
`    if (request === "obsidian") return __nativeRequire(request);\n` +
`    throw new Error("Unapproved native dependency: " + request);\n` +
`  };\n` +
`  factory(module, module.exports, localRequire);\n` +
`  return module.exports;\n` +
`}\n` +
`const __entry = __load("main");\n` +
`module.exports = __entry.default ?? __entry;\n`;
}

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });
const bundledJavaScript = bundleCommonJs();
fs.writeFileSync(path.join(root, "main.js"), bundledJavaScript, "utf8");
fs.writeFileSync(path.join(releaseDir, "main.js"), bundledJavaScript, "utf8");
fs.copyFileSync(path.join(root, "manifest.json"), path.join(releaseDir, "manifest.json"));
const cssFiles = fs.readdirSync(path.join(root, "styles"))
  .filter((name) => name.endsWith(".css")).sort();
const joinedCss = cssFiles.map((name) => fs.readFileSync(path.join(root, "styles", name), "utf8")).join("\n");
// Source CSS stays split by responsibility; published CSS is one deployable artifact.
// Remove newlines rather than parsing/minifying declarations or data URLs.
const bundledCss = joinedCss.replace(/\r?\n\s*/g, " ");
fs.writeFileSync(path.join(root, "styles.css"), bundledCss, "utf8");
fs.writeFileSync(path.join(releaseDir, "styles.css"), bundledCss, "utf8");

// Bundled canonical assets accompany the runtime; they are not user-created data.
const audioSource = path.join(root, "audio");
const audioRelease = path.join(releaseDir, "audio");
fs.mkdirSync(audioRelease, { recursive: true });
for (let i = 1; i <= 240; i++) {
  fs.copyFileSync(path.join(audioSource, `MV${i}.mp3`), path.join(audioRelease, `MV${i}.mp3`));
}
const backgroundRelease = path.join(releaseDir, "background-images");
fs.mkdirSync(backgroundRelease, { recursive: true });
fs.copyFileSync(path.join(root, "background-images", "default.webp"), path.join(backgroundRelease, "default.webp"));
const storyRelease = path.join(releaseDir, "assets");
fs.mkdirSync(storyRelease, { recursive: true });
fs.copyFileSync(path.join(root, "assets", "anlati-panel.png"), path.join(storyRelease, "anlati-panel.png"));
