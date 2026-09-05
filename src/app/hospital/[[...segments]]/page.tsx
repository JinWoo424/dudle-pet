import { FacilityDirectory, directoryMetadata, type DirectoryProps } from "@/components/facility/facility-directory";
export const revalidate=21600;
export async function generateMetadata({params,searchParams}:DirectoryProps){return directoryMetadata("ANIMAL_HOSPITAL",(await params).segments??[],await searchParams);}
export default async function Page({params,searchParams}:DirectoryProps){return <FacilityDirectory type="ANIMAL_HOSPITAL" segments={(await params).segments??[]} query={await searchParams}/>;}
