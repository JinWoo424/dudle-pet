import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next dev --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120_000,env:{DATA_MODE:"mock",DUDLE_E2E:"1"} },
  projects: [375,390,768,1440].map(width=>({name:`width-${width}`,use:{...devices["Desktop Chrome"],viewport:{width,height:900}}})),
});
