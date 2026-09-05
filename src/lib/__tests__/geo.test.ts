import { describe, expect, it } from "vitest";
import { distanceMeters, validateWgs84 } from "../geo";

describe("geo", () => {
  it("누락 및 한국 밖 좌표를 구분한다", () => { expect(validateWgs84()).toBe("MISSING"); expect(validateWgs84(0, 0)).toBe("REVIEW_REQUIRED"); expect(validateWgs84(34.76, 127.66)).toBe("VALID"); });
  it("같은 지점의 거리는 0이다", () => expect(distanceMeters({ latitude: 34.76, longitude: 127.66 }, { latitude: 34.76, longitude: 127.66 })).toBe(0));
  it("유한하지 않은 좌표를 차단한다", () => { expect(validateWgs84(NaN,127)).toBe("INVALID");expect(validateWgs84(35,Infinity)).toBe("INVALID"); });
});
