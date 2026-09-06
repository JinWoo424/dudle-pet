import { FacilityDirectory, directoryMetadata, type DirectoryProps } from "@/components/facility/facility-directory";
export const revalidate=21600;
export const runtime="nodejs";
export async function generateMetadata({params,searchParams}:DirectoryProps){return directoryMetadata("PET_FUNERAL",(await params).segments??[],await searchParams);}
export default async function Page({params,searchParams}:DirectoryProps){return <FacilityDirectory type="PET_FUNERAL" segments={(await params).segments??[]} query={await searchParams}/>;}
