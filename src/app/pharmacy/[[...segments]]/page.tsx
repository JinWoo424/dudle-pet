import { FacilityDirectory, directoryMetadata } from "@/components/facility/facility-directory";

type Props = { params: Promise<{ segments?: string[] }> };
export async function generateMetadata({ params }: Props) { return directoryMetadata("ANIMAL_PHARMACY", (await params).segments ?? []); }
export default async function PharmacyPage({ params }: Props) { return <FacilityDirectory type="ANIMAL_PHARMACY" segments={(await params).segments ?? []} />; }

