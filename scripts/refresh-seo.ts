import "./env";
import { refreshSeo } from "../src/data/seo-maintenance";
import { closeSql } from "../src/db/connection";
refreshSeo().then(result=>console.log(JSON.stringify(result))).catch((error:unknown)=>{
 const code=typeof error==="object"&&error&&"code" in error&&typeof error.code==="string"?error.code:"UNKNOWN";
 console.error(`SEO refresh failed (${/^[A-Z0-9_]{1,20}$/.test(code)?code:"UNKNOWN"}). Existing page states preserved.`);process.exitCode=1;
}).finally(closeSql);
