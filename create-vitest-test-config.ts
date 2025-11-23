import { loadEnv } from "vite";
import { InlineConfig } from "vitest";

export const createVitestTestConfig = (testingType: string): InlineConfig => {
  // Load environment variables for testing
  const testEnv = loadEnv("test", process.cwd(), "");
  const baseEnv = loadEnv("", process.cwd(), "");

  return {
    root: "./",
    globals: true,
    isolate: false,
    passWithNoTests: true,
    include: [`tests/${testingType}/**/*.test.ts`],
    env: {
      ...baseEnv,
      ...testEnv,
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      reportsDirectory: `coverage/${testingType}`,
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts"],
    },
  };
};
