import { test, expect } from "@playwright/test";

test("홈에서 여수 병원 상세와 주변 약국을 확인한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("지역 또는 병원명 검색").fill("여수");
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByRole("heading", { name: /검색 결과/ })).toBeVisible();
  await page.getByRole("link", { name: "두들동물병원 A" }).first().click();
  await expect(page.getByRole("heading", { name: "주변 동물약국" })).toBeVisible();
});

test("여수 24시간 병원은 검증된 결과만 표시한다", async ({ page }) => {
  await page.goto("/hospital/jeonnam/yeosu/24h");
  await expect(page.getByRole("heading", { name: "여수 24시간 동물병원" })).toBeVisible();
  await expect(page.getByText("24시간 확인").first()).toBeVisible();
  await expect(page.getByText("두들동물병원 E")).toHaveCount(0);
});

test("여수 X-ray 통계에서 병원 목록으로 이동한다", async ({ page }) => {
  await page.goto("/cost/jeonnam/yeosu/xray");
  await expect(page.getByRole("heading", { name: "여수 X-ray 비용" })).toBeVisible();
  await page.getByRole("link", { name: "여수 동물병원 찾기" }).click();
  await expect(page.getByRole("heading", { name: "여수 동물병원" })).toBeVisible();
});

