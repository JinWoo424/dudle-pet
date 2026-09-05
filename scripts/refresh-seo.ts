import "./env";
import { refreshSeo } from "../src/data/seo-maintenance";
import { closeSql } from "../src/db/connection";
refreshSeo().then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error("SEO refresh failed. Existing page states preserved.");process.exitCode=1;}).finally(closeSql);
