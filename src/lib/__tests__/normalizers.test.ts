import { describe, expect, it } from "vitest";
import { normalizeAddress, normalizeName, normalizePhone } from "../normalizers";

describe("normalizers", () => {
  it("정규화된 이름의 공백과 호환문자를 정리한다", () => expect(normalizeName("  두들  동물병원 Ａ ")).toBe("두들 동물병원 a"));
  it("전화 검색값을 숫자만 보존한다", () => { expect(normalizePhone("061 123 4567")).toBe("0611234567"); expect(normalizePhone("02-1234-5678")).toBe("0212345678"); });
  it("비정상 전화번호는 저장하지 않는다", () => expect(normalizePhone("123")).toBeNull());
  it("주소 표기를 정리한다", () => expect(normalizeAddress("전라남도  여수시, 학동")).toBe("전남 여수시 학동"));
});
