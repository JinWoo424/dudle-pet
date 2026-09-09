import { productionHostname } from "@/lib/deployment";
import { isAdsenseRuntimeEnabled } from "./ad-config";
import { AdsenseScriptClient } from "./adsense-script-client";

export function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!isAdsenseRuntimeEnabled() || !client) return null;
  return <AdsenseScriptClient clientId={client} productionHost={productionHostname()} />;
}
