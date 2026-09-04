import type { Metadata } from "next";
import { cookies } from "next/headers";
import { listFacilities } from "@/data/repository";
import { verifyAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "관리자", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const configured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_SESSION_SECRET);
  const authenticated = verifyAdminSession((await cookies()).get("dudle_admin")?.value);
  if (!configured) return <section className="shell admin-shell prose"><span className="eyebrow">Admin</span><h1>관리자 설정이 필요합니다.</h1><p>환경변수에 관리자 이메일, scrypt 비밀번호 hash, session secret을 설정하면 보안 로그인이 활성화됩니다.</p></section>;
  if (!authenticated) return <section className="shell admin-shell"><div className="form-card card"><span className="eyebrow">Admin</span><h1>관리자 로그인</h1><form method="post" action="/api/admin/login"><div className="form-field"><label htmlFor="email">이메일</label><input id="email" name="email" type="email" required autoComplete="username" /></div><div className="form-field"><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div><button className="primary-button" type="submit">로그인</button></form></div></section>;
  const all = await listFacilities(); const hospitals = all.filter((item) => item.type === "ANIMAL_HOSPITAL");
  const metrics = [["전체 병원", hospitals.length], ["영업 병원", hospitals.filter((item) => item.businessStatus === "OPEN").length], ["약국", all.filter((item) => item.type === "ANIMAL_PHARMACY").length], ["장례", all.filter((item) => item.type === "PET_FUNERAL").length], ["좌표 누락", all.filter((item) => !item.latitude).length], ["전화 누락", all.filter((item) => !item.phone).length], ["검증 대기", all.filter((item) => item.features.verificationStatus === "UNVERIFIED").length], ["24시간 확인", all.filter((item) => item.features.open24h === "YES").length]];
  return <section className="shell admin-shell"><span className="eyebrow">Admin dashboard</span><h1>두들펫 운영 현황</h1><div className="dashboard-grid">{metrics.map(([label, value]) => <div className="card metric-card" key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div><div className="card content-panel" style={{ marginTop: "1rem" }}><h2>운영 연결 상태</h2><p>Database: {process.env.DATABASE_URL ? "설정됨" : "mock mode"}</p><p>Kakao Map: {process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ? "설정됨" : "설정 필요"}</p><p>Public API: {process.env.PUBLIC_DATA_SERVICE_KEY ? "설정됨" : "설정 필요"}</p></div></section>;
}

