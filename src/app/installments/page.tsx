import InstallmentInvestmentsTable from "@/features/installment/views/installment-investments-table";

export default function InstallmentsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Installment Investments</h1>
      <InstallmentInvestmentsTable />
    </div>
  );
}
