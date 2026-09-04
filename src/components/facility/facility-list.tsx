import type { FacilityView } from "@/domain/facility";
import { FacilityCard } from "./facility-card";

export function FacilityList({ facilities }: { facilities: FacilityView[] }) {
  if (!facilities.length) return <div className="card empty-state"><h2>현재 확인된 시설이 없습니다.</h2><p>전체 시설을 보거나 검색 조건을 변경해 보세요.</p></div>;
  return <div className="facility-list">{facilities.map((facility) => <FacilityCard facility={facility} key={facility.id} />)}</div>;
}

