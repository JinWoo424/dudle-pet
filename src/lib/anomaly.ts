export interface SyncSnapshot { total: number; byRegion: Record<string, number>; closed: number; invalidCoordinates: number }

export function detectAnomalies(previous: SyncSnapshot, incoming: SyncSnapshot) {
  const reasons: Array<{ severity: "WARNING" | "CRITICAL"; code: string; message: string }> = [];
  if (previous.total > 0 && incoming.total < previous.total * .8) reasons.push({ severity: "CRITICAL", code: "TOTAL_DROP", message: "전체 시설 수가 20% 이상 감소했습니다." });
  for (const [region, count] of Object.entries(previous.byRegion)) {
    if (count >= 5 && (incoming.byRegion[region] ?? 0) < count * .5) reasons.push({ severity: "CRITICAL", code: "REGION_DROP", message: `${region} 시설 수가 50% 이상 감소했습니다.` });
  }
  if (incoming.closed - previous.closed > Math.max(20, previous.total * .05)) reasons.push({ severity: "CRITICAL", code: "CLOSURE_SPIKE", message: "폐업 상태가 비정상적으로 증가했습니다." });
  if (incoming.invalidCoordinates > Math.max(10, previous.invalidCoordinates * 2)) reasons.push({ severity: "WARNING", code: "COORDINATE_SPIKE", message: "좌표 오류가 급증했습니다." });
  return { blocked: reasons.some((reason) => reason.severity === "CRITICAL"), reasons };
}

