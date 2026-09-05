import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSession, verifyAdminSession, verifyPassword } from "../admin-auth";

afterEach(() => { vi.unstubAllEnvs(); });
describe("admin auth", () => {
  it("scrypt hash를 timing-safe 방식으로 검증한다", () => { const salt = "test-salt"; const encoded = `scrypt$${salt}$${scryptSync("correct", salt, 64).toString("hex")}`; expect(verifyPassword("correct", encoded)).toBe(true); expect(verifyPassword("wrong", encoded)).toBe(false); });
  it("서명된 session만 허용한다", () => { vi.stubEnv("ADMIN_SESSION_SECRET","a-test-secret-with-at-least-32-characters");vi.stubEnv("ADMIN_EMAIL","admin@example.com"); const session = createAdminSession("admin@example.com"); expect(verifyAdminSession(session)).toBe(true); expect(verifyAdminSession(`${session}x`)).toBe(false);expect(verifyAdminSession(`${session}.extra`)).toBe(false); });
});
