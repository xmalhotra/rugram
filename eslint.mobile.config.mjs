import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// The root config targets Next.js. React Native code uses this config via `npm run lint:mobile`;
// typescript-eslint and react-hooks resolve through eslint-config-next, so no extra dependency.
export default defineConfig([
  {
    files: ["mobile/App.tsx", "mobile/index.ts", "mobile/src/**/*.{ts,tsx}", "mobile/app/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
