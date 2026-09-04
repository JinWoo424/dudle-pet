export function formatWon(value: number | null) { return value == null ? "자료 없음" : `${new Intl.NumberFormat("ko-KR").format(value)}원`; }
export function formatDistance(meters?: number) { if (meters == null) return null; return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`; }

