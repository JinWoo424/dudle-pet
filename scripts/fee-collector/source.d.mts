export const sourceUrl:string;
export const cacheRoot:string;
export const parseVersion:string;
export const counters:{requests:number;cacheHits:number;httpErrors:number};
export function saveJson(path:string,value:unknown):Promise<void>;
export function query(operation:'gugunList'|'searchPrice'|'searchTotalPrice',parameters:Record<string,string>,metadata?:Record<string,unknown>,fresh?:boolean):Promise<{data:Record<string,unknown>[];snapshot:string}>;
export function parsePrices(row:Record<string,unknown>):{minimum:number|null;median:number|null;average:number|null;maximum:number|null};
