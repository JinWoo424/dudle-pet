export const origin: string;
export const key: string;
export const keyLocation: string;
export const endpoint: string;
export function productionUrl(value: string): string;
export function facilityDetailUrl(value: string): boolean;
export function locations(xml: string): string[];
export function batches(values: string[], size?: number): string[][];
