export type AdPlacement =
  | "HOME_CONTENT_1"
  | "HOME_CONTENT_2"
  | "HOSPITAL_LIST_1"
  | "PHARMACY_LIST_1"
  | "FUNERAL_CONTENT_1"
  | "COST_CONTENT_1"
  | "FACILITY_DETAIL_1";

type AdsenseEnv = {
  ADSENSE_ENABLED?: string;
  NEXT_PUBLIC_ADSENSE_CLIENT_ID?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_HOME_1?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1?: string;
  VERCEL_ENV?: string;
};

function currentAdsenseEnv(): AdsenseEnv {
  return {
    ADSENSE_ENABLED: process.env.ADSENSE_ENABLED,
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    NEXT_PUBLIC_ADSENSE_SLOT_HOME_1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_1,
    NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1,
    NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1,
    NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
}

export function isAdsenseRuntimeEnabled(env: AdsenseEnv = currentAdsenseEnv()) {
  return (
    env.VERCEL_ENV === "production" &&
    env.ADSENSE_ENABLED === "true" &&
    Boolean(env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)
  );
}

export function adsenseSlot(placement: AdPlacement, env: AdsenseEnv = currentAdsenseEnv()) {
  if (placement === "HOME_CONTENT_1") return env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_1 || undefined;
  if (placement === "HOSPITAL_LIST_1") return env.NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1 || undefined;
  if (placement === "COST_CONTENT_1") return env.NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1 || undefined;
  if (placement === "FACILITY_DETAIL_1") return env.NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1 || undefined;
  return undefined;
}
