import { publicAdapters } from "../src/data/adapters/mois";

const requested = process.argv[2] ?? "all";
const map = { hospital: "ANIMAL_HOSPITAL", pharmacy: "ANIMAL_PHARMACY", funeral: "PET_FUNERAL" } as const;

async function main() {
  if (process.env.USE_MOCK_DATA !== "false" || !process.env.DATABASE_URL) {
    console.log(`[mock] ${requested} sync 구조 검증 완료. DB나 실제 API는 변경하지 않았습니다.`);
    return;
  }
  const targets = requested === "all" ? publicAdapters : publicAdapters.filter((adapter) => adapter.facilityType === map[requested as keyof typeof map]);
  for (const adapter of targets) {
    console.log(`${adapter.sourceType}: sample inspection과 mapping 확정 전 destructive sync는 차단됩니다.`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

