import { describe,expect,it } from 'vitest';
import { crosswalkFeeRegion,mapFeeCondition } from '../fee-source-mapping';
describe('official fee contract',()=>{
 it('keeps official shared vaccine code and weight meaning',()=>{
  expect(mapFeeCondition('MEDIT00005','ANITY00001').itemCode).toBe('dog-combination-vaccine');
  expect(mapFeeCondition('MEDIT00005','ANITY00005').itemCode).toBe('cat-combination-vaccine');
  expect(mapFeeCondition('MEDIT00001','ANITY00006')).toMatchObject({animalType:'NOT_APPLICABLE',weightClass:'KG_5'});
  expect(mapFeeCondition('MEDIT00004','ANITY00006')).toMatchObject({animalType:'DOG',weightClass:'KG_5'});
  expect(()=>mapFeeCondition('MEDIT00016','invented')).toThrow();
 });
 it('never maps historical province totals to a merged province',()=>{
  expect(crosswalkFeeRegion('PROVINCE','전라남도',null,'46',[])).toEqual({currentRegionSlug:null,method:'HISTORICAL_ONLY'});
 });
 it('requires verified parent and exact city, never fuzzy names',()=>{
  const regions=[{id:1,parent_id:null,level:'PROVINCE',name:'전남광주통합특별시',full_slug:'jeonnam-gwangju',official_code:'1200000000'},
   {id:2,parent_id:1,level:'CITY',name:'여수시',full_slug:'jeonnam-gwangju/yeosu',official_code:'1213000000'}];
  expect(crosswalkFeeRegion('CITY','전라남도','여수시','46130',regions).method).toBe('HISTORICAL_PARENT_EXACT_CITY');
  expect(crosswalkFeeRegion('CITY','전라남도','여수','46130',regions).method).toBe('REVIEW_REQUIRED');
 });
});
