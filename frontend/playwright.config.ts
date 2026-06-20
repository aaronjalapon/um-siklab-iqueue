import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3001",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run build && NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run start -- --hostname 127.0.0.1 --port 3001",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
