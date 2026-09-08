import { beforeEach, describe, expect, it, vi } from "vitest";

const { client, postgresMock } = vi.hoisted(() => ({
  client: Object.assign(vi.fn(), { end: vi.fn() }),
  postgresMock: vi.fn(),
}));

vi.mock("postgres", () => ({
  default: postgresMock.mockReturnValue(client),
}));

describe("runtime database connection", () => {
  beforeEach(() => {
    vi.resetModules();
    postgresMock.mockClear();
    client.end.mockClear();
    vi.stubEnv("DATABASE_URL", "postgresql://db.example.test:6543/postgres");
    vi.stubEnv("SUPABASE_CA_CERT", "test-ca");
  });

  it("uses one singleton transaction-pool-compatible client", async () => {
    const { getSql } = await import("@/db/connection");

    const first = getSql();
    const second = getSql();

    expect(first).toBe(second);
    expect(postgresMock).toHaveBeenCalledTimes(1);
    expect(postgresMock).toHaveBeenCalledWith(
      expect.stringContaining(":6543/"),
      expect.objectContaining({ max: 3, prepare: false }),
    );
  });
});
