import {describe,it,expect} from 'vitest';
import {shareMetadata} from '../share-metadata';
describe('sharing metadata',()=>{
 it('uses the existing production canonical without filters',()=>{expect(shareMetadata('부산 동물병원','공식 정보','/hospital/busan?sort=name')).toMatchObject({title:'부산 동물병원',url:'https://pet.dudle.co.kr/hospital/busan',locale:'ko_KR'})});
 it('rejects a Preview canonical',()=>{expect(()=>shareMetadata('제목','설명','https://test.vercel.app/')).toThrow()});
});
