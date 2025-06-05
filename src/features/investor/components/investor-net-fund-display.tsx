"use client";

import { useState, useTransition } from "react";
import { getInvestorSummary } from "@/features/investor/actions/get-investor-summary";

interface InvestorNetFundDisplayProps {
  initialEmail?: string;
}

export function InvestorNetFundDisplay({
  initialEmail = "",
}: InvestorNetFundDisplayProps) {
  const [email, setEmail] = useState(initialEmail);
  const [netFund, setNetFund] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchNetFund = () => {
    console.log("🔍 InvestorNetFundDisplay - fetchNetFund called");
    console.log("📧 Email input:", email);

    if (!email.trim()) {
      console.log("❌ Empty email provided");
      const errorMessage = "Please enter an email address";
      console.log("⚠️ Error set:", errorMessage);
      setError(errorMessage);
      return;
    }

    setError("");
    console.log("🔄 Starting transition for investor summary fetch...");

    startTransition(async () => {
      try {
        console.log("📞 Calling getInvestorSummary with email:", email);
        const result = await getInvestorSummary(email);

        console.log("📊 Server action result:", result);

        if (!result) {
          console.log("❌ No result returned from server action");
          const errorMessage =
            "Investor not found or has no active investments";
          console.log("⚠️ Error set:", errorMessage);
          setError(errorMessage);
          setNetFund(null);
          setSummary(null);
          return;
        }

        console.log("✅ Successfully received investor data:");
        console.log("  - Email:", result.email);
        console.log("  - Total Net Fund:", result.totalNetInvestedFund);
        console.log("  - Total Gross Fund:", result.totalGrossInvestedFund);
        console.log("  - Total Admin Fees:", result.totalAdminFees);
        console.log("  - Active Investments:", result.activeInvestments);
        console.log("  - Investments array:", result.investments);

        setNetFund(result.totalNetInvestedFund);
        setSummary(result);

        console.log(
          "🎯 Component state updated with net fund:",
          result.totalNetInvestedFund
        );
      } catch (err) {
        console.log("💥 Error occurred during fetch:");
        console.error(err);
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        console.log("⚠️ Error set:", errorMessage);
        setError(errorMessage);
        setNetFund(null);
        setSummary(null);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

    console.log("💰 Formatting currency:", amount, "→", formatted);
    return formatted;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Total Net Invested Fund</h2>

      <div className="flex gap-4 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            console.log("📝 Email input changed to:", e.target.value);
            setEmail(e.target.value);
          }}
          placeholder="investor@example.com"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={fetchNetFund}
          disabled={isPending}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Get Fund"}
        </button>
      </div>

      {error && (
        <div>
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      )}

      {netFund !== null && summary && (
        <div className="space-y-4">
          <div className="bg-green-50 p-6 rounded-lg text-center">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              Total Amount Working for You
            </h3>
            <p className="text-3xl font-bold text-green-900">
              {formatCurrency(netFund)}
            </p>
            <p className="text-sm text-green-700 mt-2">
              (After admin fees deduction)
            </p>
          </div>

          {/* Debug Info */}
          <div className="bg-gray-50 p-4 rounded-lg text-xs">
            <h4 className="font-semibold mb-2">Debug Information:</h4>
            <div className="space-y-1">
              <p>
                <strong>Gross Fund:</strong>{" "}
                {formatCurrency(summary.totalGrossInvestedFund)}
              </p>
              <p>
                <strong>Admin Fees:</strong>{" "}
                {formatCurrency(summary.totalAdminFees)}
              </p>
              <p>
                <strong>Net Fund:</strong>{" "}
                {formatCurrency(summary.totalNetInvestedFund)}
              </p>
              <p>
                <strong>Active Investments:</strong> {summary.activeInvestments}
              </p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">
                Investment Details
              </summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(summary.investments, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
