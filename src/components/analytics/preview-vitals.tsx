"use client";
import {useReportWebVitals} from "next/web-vitals";
const report:Parameters<typeof useReportWebVitals>[0]=metric=>{
 if(['LCP','CLS','INP','FCP','TTFB'].includes(metric.name))console.info('[Dudle Preview Vitals]',JSON.stringify({name:metric.name,value:metric.value,rating:metric.rating}));
};
/** Preview-only local diagnostics: no analytics endpoint or user data transmission. */
export function PreviewVitals(){useReportWebVitals(report);return null;}
