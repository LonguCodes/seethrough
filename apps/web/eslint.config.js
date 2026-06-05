import baseConfig from "@repo/eslint-config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [".eslintrc.cjs"],
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];