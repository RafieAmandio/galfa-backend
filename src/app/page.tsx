import Image from "next/image";
import { FlatRateInvestmentsTable } from "@/features/flat-rate/views/flat-rate-investments-table";
export default function Home() {
  return (
    <div>
      <FlatRateInvestmentsTable />
    </div>
  );
}
