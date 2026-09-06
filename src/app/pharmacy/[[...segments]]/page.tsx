import { FacilityDirectory, directoryMetadata, type DirectoryProps } from "@/components/facility/facility-directory";
export const revalidate=21600;
export const runtime="nodejs";
export async function generateMetadata({params,searchParams}:DirectoryProps){return directoryMetadata("ANIMAL_PHARMACY",(await params).segments??[],await searchParams);}
export default async function Page({params,searchParams}:DirectoryProps){return <FacilityDirectory type="ANIMAL_PHARMACY" segments={(await params).segments??[]} query={await searchParams}/>;}
