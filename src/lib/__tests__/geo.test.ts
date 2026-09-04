import { describe, expect, it } from "vitest";
import { distanceMeters, transform5174To4326, validateWgs84 } from "../geo";

describe("geo", () => {
  it("누락 및 한국 밖 좌표를 구분한다", () => { expect(validateWgs84()).toBe("MISSING"); expect(validateWgs84(0, 0)).toBe("REVIEW_REQUIRED"); expect(validateWgs84(34.76, 127.66)).toBe("VALID"); });
  it("같은 지점의 거리는 0이다", () => expect(distanceMeters({ latitude: 34.76, longitude: 127.66 }, { latitude: 34.76, longitude: 127.66 })).toBe(0));
  it("EPSG:5174 변환은 유효한 위경도를 반환한다", () => { const result = transform5174To4326(260000, 240000); expect(result.longitude).toBeGreaterThan(124); expect(result.latitude).toBeGreaterThan(32); });
});

