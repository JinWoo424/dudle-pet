export type AnalyticsEvent = "search" | "region_view" | "facility_view" | "call_click" | "direction_click" | "nearby_click" | "filter_24h" | "filter_night" | "filter_exotic" | "user_report";
export function track(event: AnalyticsEvent, parameters: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", event, parameters);
}

