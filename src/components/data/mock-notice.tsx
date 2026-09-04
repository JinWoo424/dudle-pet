import { isMockMode } from "@/data/repository";

export function MockNotice() {
  if (!isMockMode()) return null;
  return <div className="mock-notice" role="status"><strong>개발용 가상 데이터</strong><span>현재 화면의 시설명과 통계는 실제 업체 정보가 아닙니다.</span></div>;
}

