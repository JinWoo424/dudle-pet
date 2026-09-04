export function normalizeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) return null;
  if (digits.startsWith("02")) return digits.length === 9 ? digits.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3") : digits.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
}

export function normalizeAddress(value: string) {
  return value.normalize("NFKC").trim().replace(/[\s,]+/g, " ").replace(/전라남도/g, "전남").replace(/광주광역시/g, "광주");
}

