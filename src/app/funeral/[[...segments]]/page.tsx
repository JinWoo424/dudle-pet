import { FacilityDirectory, directoryMetadata } from "@/components/facility/facility-directory";

type Props = { params: Promise<{ segments?: string[] }> };
export async function generateMetadata({ params }: Props) { return directoryMetadata("PET_FUNERAL", (await params).segments ?? []); }
export default async function FuneralPage({ params }: Props) { return <FacilityDirectory type="PET_FUNERAL" segments={(await params).segments ?? []} />; }

