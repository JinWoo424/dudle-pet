import {describe,expect,it} from "vitest";
import {paginationPages} from "@/lib/pagination";
describe("paginationPages",()=>{
 it("shows every page for a short result set",()=>expect(paginationPages(1,120,30)).toEqual([1,2,3,4]));
 it("keeps boundaries and the current neighborhood without an unbounded link list",()=>{
  const pages=paginationPages(50,3000,30);
  expect(pages).toContain(1);expect(pages).toContain(100);expect(pages).toContain(50);expect(pages.length).toBeLessThanOrEqual(9);
 });
});
