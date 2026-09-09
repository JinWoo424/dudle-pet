"use client";

import { useEffect, useRef } from "react";

type AdsenseQueue = { push(entry: Record<string, never>): number };

declare global {
  interface Window {
    adsbygoogle?: AdsenseQueue;
  }
}

export function initializeAdsenseUnit(element: HTMLElement, queue: AdsenseQueue) {
  if (element.dataset.dudleAdInitialized === "true" || element.dataset.adsbygoogleStatus) return false;
  element.dataset.dudleAdInitialized = "true";
  queue.push({});
  return true;
}

export function AdsenseUnit({ clientId, slot, productionHost }: { clientId: string; slot: string; productionHost: string }) {
  const unitRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const element = unitRef.current;
    if (!element || window.location.hostname.toLowerCase() !== productionHost.toLowerCase()) return;
    window.adsbygoogle ??= [];
    initializeAdsenseUnit(element, window.adsbygoogle);
  }, [productionHost]);

  return (
    <div className="ad-slot ad-slot-active" aria-label="광고">
      <ins
        ref={unitRef}
        className="adsbygoogle"
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
