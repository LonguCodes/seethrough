import config from "@repo/eslint-config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
