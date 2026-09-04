import { mkdir, writeFile } from "node:fs/promises";
import { publicAdapters } from "../src/data/adapters/mois";

const fileByType = { MOIS_ANIMAL_HOSPITAL: "hospital.json", MOIS_ANIMAL_PHARMACY: "pharmacy.json", MOIS_PET_FUNERAL: "funeral.json" } as const;

async function main() {
  if (!process.env.PUBLIC_DATA_SERVICE_KEY) {
    console.log("PUBLIC_DATA_SERVICE_KEY 없음: live inspection을 건너뜁니다. .env.local 설정 후 다시 실행하세요.");
    return;
  }
  await mkdir("docs/api-samples", { recursive: true });
  for (const adapter of publicAdapters) {
    try {
      const page = await adapter.fetchPage({ page: 1, pageSize: 5 });
      const file = `docs/api-samples/${fileByType[adapter.sourceType]}`;
      await writeFile(file, JSON.stringify(page.raw, null, 2), "utf8");
      const actualKeys = page.items[0] && typeof page.items[0] === "object" ? Object.keys(page.items[0] as object) : [];
      console.log(`\n${adapter.sourceType}\nSaved: ${file}\nExpected mapping: UNCONFIRMED\nActual JSON keys: ${actualKeys.join(", ") || "none"}`);
    } catch (error) {
      console.error(`${adapter.sourceType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

