"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export function AdsenseScriptClient({ clientId, productionHost }: { clientId: string; productionHost: string }) {
  const isCanonicalHost = useSyncExternalStore(
    subscribe,
    () => window.location.hostname.toLowerCase() === productionHost.toLowerCase(),
    () => false,
  );

  if (!isCanonicalHost) return null;

  return (
    <Script
      id="dudle-adsense-bootstrap"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
    />
  );
}
