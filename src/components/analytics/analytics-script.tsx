import Script from "next/script";
import { AnalyticsEvents } from "./analytics-events";

export function AnalyticsScript() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{send_page_view:false,page_location:location.origin+location.pathname,page_title:'Dudle Pet'});window.dispatchEvent(new Event('dudle-ga-ready'));`}</Script>
      <AnalyticsEvents />
    </>
  );
}
