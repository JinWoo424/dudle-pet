export type AnalyticsEvent = "search" | "region_view" | "facility_view" | "call_click" | "direction_click" | "nearby" | "filter" | "user_report";
export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  // Never transmit query strings, typed search terms, telephone numbers, email,
  // exact position, report text, or document titles containing a search query.
  gtag?.("event", event, { page_location:window.location.origin+window.location.pathname,page_title:"Dudle Pet" });
}
