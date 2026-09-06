import { X509Certificate } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const caPath = process.env.SUPABASE_CA_CERT_PATH;
const fileExists = Boolean(caPath && existsSync(caPath));
let beginEndPresent = false;
let validCertificate = false;
let currentlyValid = false;

if (fileExists) {
  try {
    const pem = readFileSync(caPath, "utf8");
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
    beginEndPresent = blocks.length > 0;
    const certificates = blocks.map((block) => new X509Certificate(block));
    validCertificate = certificates.length > 0;
    const now = Date.now();
    currentlyValid = certificates.every((certificate) => {
      const from = Date.parse(certificate.validFrom);
      const to = Date.parse(certificate.validTo);
      return Number.isFinite(from) && Number.isFinite(to) && from <= now && now <= to;
    });
  } catch {
    validCertificate = false;
    currentlyValid = false;
  }
}

console.log(`FILE_EXISTS: ${fileExists ? "YES" : "NO"}`);
console.log(`PEM_BEGIN_END_PRESENT: ${beginEndPresent ? "YES" : "NO"}`);
console.log(`VALID_X509_CERTIFICATE: ${validCertificate ? "YES" : "NO"}`);
console.log(`CURRENTLY_VALID: ${currentlyValid ? "YES" : "NO"}`);
if (!fileExists || !beginEndPresent || !validCertificate || !currentlyValid) process.exitCode = 1;
