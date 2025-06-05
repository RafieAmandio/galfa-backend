import { InvestorNetFundDisplay } from "@/features/investor/components/investor-net-fund-display";

export default function InvestorNetFundPage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Investor Net Fund</h1>
      <p className="text-gray-600 mb-6">
        Enter an investor email to see their total net invested fund (amount
        working for them after admin fees). Check the browser console for
        detailed logging information.
      </p>

      <InvestorNetFundDisplay initialEmail="rafie@test.com" />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">
          Debug Instructions:
        </h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Open browser Developer Tools (F12)</li>
          <li>2. Go to the Console tab</li>
          <li>3. Enter an email and click "Get Fund"</li>
          <li>4. Watch the detailed logging output</li>
        </ol>
      </div>
    </div>
  );
}
