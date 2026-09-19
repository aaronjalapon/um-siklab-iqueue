import { expect, test } from "@playwright/test";

function tomorrow(): string {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("advanced affinity settings is fully responsive on 360px mobile viewport without overflow", async ({
  page,
}) => {
  // Test Galaxy S25 / standard 360px mobile viewport
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> Cagayan" }).click();
  await page.getByRole("button", { name: "Search Tickets" }).click();
  await expect(page.getByText("2 buses found")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Preferences" }).first().click();

  // Closed state overflow check
  await expectNoHorizontalOverflow(page);

  // Turn on affinity matching
  await page.getByText("Seatmate affinity matching").click();
  await expect(page.getByText("Affinity Matching Preferences")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Open Advanced Affinity Settings
  await page.getByText("Advanced Affinity Settings").click();
  await expect(page.getByText("1. Conversation")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Tab 1: Conversation
  await expect(page.getByText("Comfortable starting conversations?")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Tab 2: Travel
  await page.getByText("2. Travel").click();
  await expect(page.getByText("Travel purpose")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Tab 3: Compatibility
  await page.getByText("3. Compatibility").click();
  await expect(page.getByText("Preferred cabin environment")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Tab 4: Demographics
  await page.getByText("4. Demographics").click();
  await expect(page.getByText("100% Voluntary & Safe:")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("group booking passenger labels and cards are fully responsive on 360px mobile viewport without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> Cagayan" }).click();
  await page.getByRole("button", { name: "Search Tickets" }).click();
  await expect(page.getByText("2 buses found")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Preferences" }).first().click();

  // Switch to Group Booking
  await page.getByRole("button", { name: "Group Booking" }).click();

  // Verify label says "Group members (3)" and NOT "of 6"
  await expect(page.getByText("Group members (3)")).toBeVisible();
  await expect(page.getByText("of 6")).not.toBeVisible();

  // Load demo group
  await page.getByRole("button", { name: "Load demo group" }).click();
  await expect(page.getByText("Lead passenger (Primary contact)")).toBeVisible();
  await expect(page.getByText("Group member 2")).toBeVisible();
  await expect(page.getByText("Group member 3")).toBeVisible();

  // Verify zero horizontal overflow on 360px
  await expectNoHorizontalOverflow(page);
});
