import { expect, test, type Page } from "@playwright/test";
import { shouldEnablePwaForEnvironment } from "../src/lib/pwa-runtime";

type NavigatorIdentity = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

async function setNavigatorIdentity(
  page: Page,
  {
    userAgent,
    platform = "",
    maxTouchPoints = 0,
  }: NavigatorIdentity
) {
  await page.addInitScript(
    ({ userAgent, platform, maxTouchPoints }) => {
      Object.defineProperties(window.navigator, {
        userAgent: { configurable: true, value: userAgent },
        platform: { configurable: true, value: platform },
        maxTouchPoints: { configurable: true, value: maxTouchPoints },
      });
    },
    { userAgent, platform, maxTouchPoints }
  );
}

async function dispatchInstallPrompt(
  page: Page,
  outcome: "accepted" | "dismissed" = "accepted",
  shouldFail = false,
  deferChoice = false
) {
  await page.evaluate(() => {
    (window as Window & { pwaPromptCalls?: number }).pwaPromptCalls = 0;
    window.localStorage.setItem(
      "iqueue:pwa-install-dismissed:v1",
      String(Date.now())
    );
  });

  await expect
    .poll(() =>
      page.evaluate(
        ({ outcome, shouldFail, deferChoice }) => {
          type InstallChoice = {
            outcome: "accepted" | "dismissed";
            platform: string;
          };
          type InstallTestWindow = Window & {
            pwaPromptCalls?: number;
            resolvePwaChoice?: () => void;
          };

          const event = new Event("beforeinstallprompt", {
            cancelable: true,
          }) as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<InstallChoice>;
          };
          const target = window as InstallTestWindow;
          const choice: InstallChoice = { outcome, platform: "web" };
          const userChoice = deferChoice
            ? new Promise<InstallChoice>((resolve) => {
                target.resolvePwaChoice = () => resolve(choice);
              })
            : Promise.resolve(choice);

          Object.defineProperties(event, {
            prompt: {
              value: async () => {
                target.pwaPromptCalls = (target.pwaPromptCalls ?? 0) + 1;
                if (shouldFail) throw new Error("Install prompt unavailable");
              },
            },
            userChoice: {
              value: userChoice,
            },
          });

          window.dispatchEvent(event);
          return event.defaultPrevented;
        },
        { outcome, shouldFail, deferChoice }
      )
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
});

test("PWA runtime is enabled in production, including localhost", () => {
  expect(
    shouldEnablePwaForEnvironment({
      isProduction: true,
      isExplicitlyEnabled: false,
    })
  ).toBe(true);
});

test("PWA runtime stays off in development unless explicitly enabled", () => {
  expect(
    shouldEnablePwaForEnvironment({
      isProduction: false,
      isExplicitlyEnabled: false,
    })
  ).toBe(false);
  expect(
    shouldEnablePwaForEnvironment({
      isProduction: false,
      isExplicitlyEnabled: true,
    })
  ).toBe(true);
});

test("network starts with the pilot and keeps map and directory selection synchronized", async ({ page }) => {
  await page.goto("/");
  const pilotMode = page.getByRole("button", { name: "Philippine Concept (13)" });
  await expect(pilotMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("network-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Davao City" })).toHaveAttribute("aria-pressed", "true");

  const marker = page.getByRole("button", { name: "Select Cagayan de Oro" });
  await marker.focus();
  await marker.press("Enter");
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { expanded: true }).filter({ hasText: "Cagayan de Oro" })).toBeVisible();

  const bookingLink = page.getByRole("link", { name: "Find routes" });
  await expect(bookingLink).toHaveAttribute("href", "/buy?origin=Cagayan%20de%20Oro");
});

test("ASEAN concept filters hubs and never presents concept locations as bookable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ASEAN Concept (8)" }).click();

  await expect(page.getByRole("button", { name: "All Hubs" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cross-border ASEAN" }).click();
  await expect(page.getByText("5 hubs", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Kuala Lumpur" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Manila" })).toHaveCount(0);

  await page.getByRole("button", { name: "Select Kuala Lumpur" }).click();
  await expect(page.getByText("ASEAN Concept", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find routes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Philippine Corridors" }).click();
  await expect(page.getByText("3 hubs", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Manila" })).toHaveAttribute("aria-pressed", "true");
});

test("install action dispatches the existing PWA request event", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as Window & { installRequestObserved?: boolean }).installRequestObserved = false;
    window.addEventListener("iqueue:request-pwa-install", () => {
      (window as Window & { installRequestObserved?: boolean }).installRequestObserved = true;
    }, { once: true });
  });
  await page.getByTestId("hero-install-app").click();
  await expect.poll(() => page.evaluate(() => (window as Window & { installRequestObserved?: boolean }).installRequestObserved)).toBe(true);
});

test("install CTA opens the captured native prompt exactly once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-install-app")).toBeVisible();
  await dispatchInstallPrompt(page, "accepted", false, true);

  await page.getByTestId("hero-install-app").click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { pwaPromptCalls?: number }).pwaPromptCalls ?? 0
      )
    )
    .toBe(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.evaluate(() => {
    (
      window as Window & { resolvePwaChoice?: () => void }
    ).resolvePwaChoice?.();
  });
  await expect(
    page.getByRole("heading", { name: "TripSync is already installed" })
  ).toBeVisible();
});

test("a dismissed native prompt opens the simplified fallback", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-install-app")).toBeVisible();
  await dispatchInstallPrompt(page, "dismissed");

  await page.getByTestId("hero-install-app").click();

  await expect(
    page.getByText("Install TripSync from the browser menu", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(2);
});

test("a failed native prompt falls back to browser instructions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-install-app")).toBeVisible();
  await dispatchInstallPrompt(page, "accepted", true);

  await page.getByTestId("hero-install-app").click();

  await expect(
    page.getByText("Install TripSync from the browser menu", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
});

test("the explicit install CTA overrides a prior dismissal", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-install-app").click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("iqueue:pwa-install-dismissed:v1")
      )
    )
    .toBeNull();
});

test("the install dialog traps focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.goto("/");
  const installButton = page.getByTestId("hero-install-app");
  await installButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Dismiss install message" })).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(installButton).toBeFocused();
});

test("standalone mode reports that the app is already installed", async ({ page }) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query !== "(display-mode: standalone)") return originalMatchMedia(query);

      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => true,
      };
    };
  });

  await page.goto("/");
  await page.getByTestId("hero-install-app").click();

  await expect(
    page.getByRole("heading", { name: "TripSync is already installed" })
  ).toBeVisible();
  await expect(page.getByTestId("pwa-installed-status")).toContainText(
    "Installed and ready to use"
  );
});

const guidedInstallScenarios: Array<{
  name: string;
  identity: NavigatorIdentity;
  heading: string;
  detail: string;
}> = [
  {
    name: "iOS third-party browsers",
    identity: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    },
    heading: "Add TripSync to your Home Screen",
    detail: "Use the Share menu in your current browser:",
  },
  {
    name: "Android Firefox",
    identity: {
      userAgent:
        "Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    },
    heading: "Install TripSync on Android",
    detail: "Firefox may add a browser shortcut instead of a standalone app.",
  },
  {
    name: "macOS Safari",
    identity: {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/17.6 Safari/605.1.15",
      platform: "MacIntel",
    },
    heading: "Add TripSync to your Mac Dock",
    detail: "Choose Add to Dock, then click Add.",
  },
  {
    name: "desktop Firefox",
    identity: {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
      platform: "Win32",
    },
    heading: "Install TripSync with a supported desktop browser",
    detail:
      "Desktop Firefox does not currently provide a built-in PWA installation action.",
  },
  {
    name: "an unknown browser",
    identity: {
      userAgent: "ExampleBrowser/1.0",
      platform: "ExampleOS",
    },
    heading: "Install from your browser",
    detail: "Choose Install app or Add to Home Screen.",
  },
];

for (const scenario of guidedInstallScenarios) {
  test(`install CTA provides accurate guidance in ${scenario.name}`, async ({
    page,
  }) => {
    await setNavigatorIdentity(page, scenario.identity);
    await page.goto("/");
    await page.getByTestId("hero-install-app").click();

    await expect(
      page.getByText(scenario.heading, { exact: true })
    ).toBeVisible();
    await expect(page.getByText(scenario.detail, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  });
}

test("desktop Firefox can copy the install link for a supported browser", async ({
  page,
}) => {
  await setNavigatorIdentity(page, {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    platform: "Win32",
  });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedInstallLink?: string }).copiedInstallLink =
            value;
        },
      },
    });
  });
  await page.goto("/");
  await page.getByTestId("hero-install-app").click();
  await page.getByRole("button", { name: "Copy install link" }).click();

  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { copiedInstallLink?: string }).copiedInstallLink
      )
    )
    .toBe("http://127.0.0.1:3001/");
});

test("production localhost registers the PWA service worker", async ({ page }) => {
  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.some((registration) =>
          registration.active?.scriptURL.includes("/sw.js?pwa=enabled")
        );
      })
    )
    .toBe(true);
});

test("production manifest exposes a stable installable app identity", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    name: "TripSync",
    start_url: "/home",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", type: "image/png" }),
    ])
  );
});

test("terminal directory remains usable when the map asset fails", async ({ page }) => {
  await page.route("**/maps/countries-50m.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await expect(page.getByText("Map unavailable", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Cagayan de Oro/ }).last().click();
  await expect(page.getByRole("button", { expanded: true }).filter({ hasText: "Cagayan de Oro" })).toBeVisible();
});

test("landing remains free of horizontal overflow at supported widths", async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
