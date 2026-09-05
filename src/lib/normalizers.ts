export function normalizeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  if (!/^[\d\s()+-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) return null;
  return digits;
}

export function normalizeAddress(value: string) {
  return value.normalize("NFKC").trim().replace(/[\s,]+/g, " ").replace(/전라남도/g, "전남").replace(/광주광역시/g, "광주");
}
