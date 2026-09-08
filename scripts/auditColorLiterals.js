const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");

const allowedFiles = new Set([
  path.normalize("src/theme/colors.ts"),
  path.normalize("src/styles/tokens.ts"),
]);

const targetExtensions = new Set([".ts", ".tsx"]);
const hexLiteralPattern = /["']#(?:[0-9a-fA-F]{3,8})["']/g;
const rgbaLiteralPattern = /["']rgba?\([^"']+\)["']/gi;

function walkFiles(dir, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collector);
      continue;
    }
    if (!targetExtensions.has(path.extname(entry.name))) {
      continue;
    }
    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) {
      continue;
    }
    collector.push(fullPath);
  }
}

function collectViolations(filePath) {
  const relativePath = path.normalize(path.relative(repoRoot, filePath));
  if (allowedFiles.has(relativePath)) {
    return [];
  }

  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (hexLiteralPattern.test(line) || rgbaLiteralPattern.test(line)) {
      violations.push({
        lineNumber: i + 1,
        snippet: line.trim(),
      });
    }
    hexLiteralPattern.lastIndex = 0;
    rgbaLiteralPattern.lastIndex = 0;
  }

  return violations.map((violation) => ({
    file: relativePath,
    lineNumber: violation.lineNumber,
    snippet: violation.snippet,
  }));
}

const files = [];
walkFiles(srcRoot, files);

const allViolations = files.flatMap(collectViolations);

if (allViolations.length > 0) {
  console.error("Found hardcoded color literals outside allowed token/theme files:");
  for (const violation of allViolations) {
    console.error(`- ${violation.file}:${violation.lineNumber} ${violation.snippet}`);
  }
  process.exit(1);
}

console.log("No hardcoded color literals found outside allowed files.");
