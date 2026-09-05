import { execFileSync } from "node:child_process";
import { existsSync,readFileSync } from "node:fs";
for(const file of [".env.local",".env"])if(existsSync(file))process.loadEnvFile(file);
const keys=["DATABASE_URL","DIRECT_URL","PUBLIC_DATA_SERVICE_KEY","KAKAO_REST_API_KEY","ADMIN_PASSWORD_HASH","ADMIN_SESSION_SECRET","CRON_SECRET"];
const values=keys.flatMap(key=>process.env[key]?.length>=8?[process.env[key],encodeURIComponent(process.env[key])]:[]);
const files=execFileSync("git",["ls-files","--cached","--others","--exclude-standard","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const findings=[];
for(const file of files){
 if(/\.(png|jpg|jpeg|webp|ico|woff2?|pdf|zip)$/i.test(file))continue;
 const content=readFileSync(file,"utf8");
 if(values.some(value=>content.includes(value)))findings.push({file,rule:"configured-secret-value"});
 if(/postgres(?:ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/i.test(content))findings.push({file,rule:"embedded-db-credential"});
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content))findings.push({file,rule:"private-key"});
 if(/^[ \t]*(?:PUBLIC_DATA_SERVICE_KEY|KAKAO_REST_API_KEY|ADMIN_SESSION_SECRET|CRON_SECRET|DATABASE_URL|DIRECT_URL)[ \t]*=[ \t]*[^\s#]+/m.test(content))findings.push({file,rule:"nonempty-secret-assignment"});
}
console.log(JSON.stringify({scannedFiles:files.length,findings}));
if(findings.length)process.exitCode=1;
