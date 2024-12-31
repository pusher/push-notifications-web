import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended", "prettier"), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jest,
            ...globals.node,
            ...globals.serviceworker,
        },

        ecmaVersion: 2018,
        sourceType: "module",
    },

    rules: {
        "no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
        }],

        "no-console": 0,
        indent: ["error", 2],
        quotes: [2, "single"],
        "linebreak-style": [2, "unix"],
        semi: [2, "always"],
    },
}];