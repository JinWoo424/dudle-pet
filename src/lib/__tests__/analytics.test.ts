import {describe,it,expect} from "vitest";
import {pageContext,safeEventContext} from "../analytics";
describe('privacy-safe analytics',()=>{
 it('drops query strings and raw search terms',()=>{expect(pageContext('/search?q=person@example.com').source_page).toBe('/search');expect(safeEventContext({region:'person@example.com',fee_item:'010-1234-5678?secret'})).toEqual({})});
 it('keeps only allowlisted parameters',()=>{expect(safeEventContext({placement:'related',result_count:3,source_page:'/cost/busan?weight=KG_5'})).toEqual({placement:'related',result_count:3,source_page:'/cost/busan'})});
 it('classifies public facilities and rejects arbitrary private paths',()=>{expect(pageContext('/hospital/busan/12345678-abcd-abcd-abcd-123456789abc').page_type).toBe('hospital_detail');expect(pageContext('/admin/private').source_page).toBe('/')});
});
