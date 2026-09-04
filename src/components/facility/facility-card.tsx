import Link from "next/link";
import { BadgeCheck, MapPin, Navigation, Phone } from "lucide-react";
import type { FacilityView } from "@/domain/facility";
import { formatDistance } from "@/lib/format";

const typePath = { ANIMAL_HOSPITAL: "hospital", ANIMAL_PHARMACY: "pharmacy", PET_FUNERAL: "funeral" } as const;

export function FacilityCard({ facility, compact = false }: { facility: FacilityView; compact?: boolean }) {
  const base = `/${typePath[facility.type]}/jeonnam/yeosu/${facility.id}`;
  const verified = facility.features.verificationStatus === "VALID";
  const tags = [
    facility.features.open24h === "YES" && "24시간 확인",
    facility.features.nightService === "YES" && "야간 진료",
    facility.features.exoticService === "YES" && "특수동물",
    facility.features.catService === "YES" && "고양이",
    facility.features.parkingAvailable === "YES" && "주차",
  ].filter(Boolean) as string[];
  return (
    <article className={`card facility-card${compact ? " compact" : ""}`}>
      <div className="facility-card-top">
        <div>
          <span className="status-open"><span aria-hidden="true" />공식 등록상 영업</span>
          <h2><Link href={base}>{facility.name}</Link></h2>
        </div>
        {facility.distanceMeters != null && <strong className="distance">{formatDistance(facility.distanceMeters)}</strong>}
      </div>
      <p className="address"><MapPin size={16} aria-hidden="true" />{facility.roadAddress}</p>
      {tags.length > 0 ? <div className="tag-row">{tags.map((tag) => <span className="pill" key={tag}>{verified && <BadgeCheck size={13} aria-hidden="true" />}{tag}</span>)}</div> : <p className="unverified">부가 운영정보 미확인</p>}
      <div className="facility-actions">
        {facility.phone ? <a href={`tel:${facility.phone}`}><Phone size={16} aria-hidden="true" />전화</a> : <span aria-disabled="true">전화 미확인</span>}
        <a href={`https://map.kakao.com/link/search/${encodeURIComponent(facility.roadAddress)}`} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" />길찾기</a>
        <Link className="detail-link" href={base}>상세보기</Link>
      </div>
    </article>
  );
}

