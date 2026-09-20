import { describe,expect,it } from "vitest";
import { chooseNearbyPharmacyRadius } from "@/lib/nearby";

describe("chooseNearbyPharmacyRadius",()=>{
 it.each([
  [[1200,2800],3000],
  [[3200,4800],5000],
  [[1200,7200],10000],
  [[],10000],
 ])("chooses the smallest radius containing two pharmacies",(distances,expected)=>{
  expect(chooseNearbyPharmacyRadius(distances)).toBe(expected);
 });
});
