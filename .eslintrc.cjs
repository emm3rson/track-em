module.exports = {
  root: true,
  extends: ["expo", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "android/", "docs/"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
        message: "Use theme/tokens instead of hardcoded hex color literals.",
      },
      {
        selector: "Literal[value=/^rgba?\\(/i]",
        message: "Use theme/tokens instead of hardcoded rgb/rgba color literals.",
      },
    ],
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/immutability": "off",
    "react-hooks/refs": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "react-hooks/purity": "off",
  },
  overrides: [
    {
      files: ["src/theme/colors.ts", "src/styles/tokens.ts"],
      rules: {
        "no-restricted-syntax": "off",
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.ts"],
      rules: {
        "no-restricted-syntax": "off",
        "@typescript-eslint/no-require-imports": "off",
        "import/first": "off",
      },
    },
  ],
};
