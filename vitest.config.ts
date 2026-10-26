import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(__dirname, "src") };

// Two independent suites: API integration tests run in Node against temp CSV
// copies; component tests run in jsdom against mocked fetch responses.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "server",
          environment: "node",
          include: ["tests/server/**/*.test.ts"],
          globals: true,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "client",
          environment: "jsdom",
          include: ["tests/client/**/*.test.tsx"],
          setupFiles: ["tests/client/setup.ts"],
          globals: true,
        },
      },
    ],
  },
});
