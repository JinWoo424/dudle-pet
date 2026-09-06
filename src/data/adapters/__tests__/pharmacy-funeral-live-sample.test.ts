import { describe,it,expect } from "vitest";
import { readFile } from "node:fs/promises";
import { MoisAnimalPharmacyAdapter,MoisPetFuneralAdapter } from "../mois";

describe("pharmacy and funeral inspected samples",()=>{
 for(const [name,adapter] of [["pharmacy",new MoisAnimalPharmacyAdapter()],["funeral",new MoisPetFuneralAdapter()]] as const){
  it(`${name} sample matches the confirmed contract`,async()=>{
   const page=await adapter.parse(JSON.parse(await readFile(`docs/api-samples/${name}.json`,"utf8")));
   expect(page.items).toHaveLength(5);
   for(const raw of page.items){const item=await adapter.normalize(raw);expect(adapter.validate(item).valid).toBe(true);}
  });
 }
});
