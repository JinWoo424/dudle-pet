import { describe,expect,it } from "vitest";
import { shareMetadata } from "@/lib/metadata";

describe("shareMetadata",()=>{
 it("keeps page-specific title, description, and canonical URL in social metadata",()=>{
  const value=shareMetadata("여수 동물병원 찾기","실제 설명","/hospital/jeonnam-gwangju/yeosu");
  expect(value.openGraph).toMatchObject({title:"여수 동물병원 찾기",description:"실제 설명",url:"/hospital/jeonnam-gwangju/yeosu"});
  expect(value.twitter).toMatchObject({title:"여수 동물병원 찾기",description:"실제 설명"});
 });
});
