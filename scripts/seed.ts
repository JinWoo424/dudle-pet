import { mockFacilities } from "../src/data/mock";

async function main() {
  if (process.env.VERCEL_ENV === "production") throw new Error("Production에서는 mock seed를 실행할 수 없습니다.");
  const counts = mockFacilities.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.type]: (acc[item.type] ?? 0) + 1 }), {});
  console.log("두들펫 가상 seed 준비 완료:", counts);
  if (process.env.DATABASE_URL) console.log("안전상 자동 DB write는 하지 않습니다. 초기 migration 후 seed adapter를 명시적으로 활성화하세요.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

