import {describe,it,expect} from "vitest";
import {compareFees,feeEvidence} from "../fee-comparison";
import type {FeeStatisticView} from "@/domain/facility";
const row:FeeStatisticView={categoryCode:"exam",itemCode:"xray",itemName:"X-ray",region:"여수",regionSlug:"jeonnam-gwangju/yeosu",regionLevel:"CITY",surveyYear:2025,minimumPrice:100,maximumPrice:300,averagePrice:200,medianPrice:200,sampleCount:3,sourceName:"공식",surveyProvinceName:"전라남도",animalType:"DOG",weightClass:"KG_5"};
describe("same-condition official fee comparison",()=>{
 it("never infers an unpublished or single-observation sample",()=>{expect(feeEvidence({...row,sampleCount:null}).eligible).toBe(false);expect(feeEvidence({...row,sampleCount:1}).eligible).toBe(false);expect(feeEvidence(row).eligible).toBe(true)});
 it("excludes different year, animal, weight and historical province",()=>{expect(compareFees([row,{...row,surveyYear:2024},{...row,animalType:"CAT"},{...row,weightClass:"KG_10"},{...row,regionLevel:"PROVINCE",surveyProvinceName:"광주광역시"}],row)).toHaveLength(1)});
 it("supports official historical province and national without calculating averages",()=>{const national={...row,regionLevel:"NATIONAL" as const,regionSlug:undefined};expect(compareFees([row,{...row,regionLevel:"PROVINCE",regionSlug:"jeonnam"},national],row)).toHaveLength(3);expect(compareFees([row],{...row,animalType:undefined})).toEqual([])});
});
