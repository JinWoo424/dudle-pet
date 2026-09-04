import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createAdminSession, verifyAdminSession, verifyPassword } from "../admin-auth";

const previous = process.env.ADMIN_SESSION_SECRET;
afterEach(() => { process.env.ADMIN_SESSION_SECRET = previous; });
describe("admin auth", () => {
  it("scrypt hash를 timing-safe 방식으로 검증한다", () => { const salt = "test-salt"; const encoded = `scrypt$${salt}$${scryptSync("correct", salt, 64).toString("hex")}`; expect(verifyPassword("correct", encoded)).toBe(true); expect(verifyPassword("wrong", encoded)).toBe(false); });
  it("서명된 session만 허용한다", () => { process.env.ADMIN_SESSION_SECRET = "a-secret-long-enough-for-tests"; const session = createAdminSession("admin@example.com"); expect(verifyAdminSession(session)).toBe(true); expect(verifyAdminSession(`${session}x`)).toBe(false); });
});

