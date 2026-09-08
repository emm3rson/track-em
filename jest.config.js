/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/dist/", "/__tests__/sqliteTestDb"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
