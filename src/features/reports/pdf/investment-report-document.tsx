import { Document } from "@react-pdf/renderer";
import { TitleSlide } from "./slides/title-slide";
import { InvestmentPerformanceSlide } from "./slides/investment-performance-slide";
import { FundAllocationsSlide } from "./slides/fund-allocations-slide";
import { StatementOfAccountSlide } from "./slides/statement-of-account-slide";
import { CapitalMarketSlide } from "./slides/capital-market-slide";
import type { InvestorReportData } from "../actions/get-report-data";

interface InvestmentReportDocumentProps {
  data: InvestorReportData;
}

export function InvestmentReportDocument({
  data,
}: InvestmentReportDocumentProps) {
  const reportDate = new Date();
  const reportMonth = reportDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  let pageNumber = 2; // Start at 2 (title slide has no number)

  // Check if any statement year has redemptions
  const hasAnyRedemptions = data.statementOfAccount?.years.some((year) =>
    year.months.some((m) => m.redeemed > 0)
  ) ?? false;

  const investorName = data.statementOfAccount?.investorName || data.email;

  // Group capital market investments by year
  const cmByYear = new Map<number, typeof data.capitalMarketInvestments>();
  for (const inv of data.capitalMarketInvestments) {
    const year = new Date(inv.performanceDate).getFullYear();
    if (!cmByYear.has(year)) cmByYear.set(year, []);
    cmByYear.get(year)!.push(inv);
  }
  const cmYears = Array.from(cmByYear.entries()).sort(([a], [b]) => a - b);

  return (
    <Document>
      {/* Slide 1: Title */}
      <TitleSlide reportMonth={reportMonth} />

      {/* Slide 2: Investment Performance */}
      {data.vcPerformance.length > 0 && (
        <InvestmentPerformanceSlide
          data={data.vcPerformance}
          pageNumber={pageNumber++}
        />
      )}

      {/* Slide 3: Fund Allocations */}
      {data.fundAllocations.length > 0 && (
        <FundAllocationsSlide
          allocations={data.fundAllocations}
          pageNumber={pageNumber++}
        />
      )}

      {/* Slides 4+: Statement of Account (one year per slide) */}
      {data.statementOfAccount?.years.map((yearData) => (
        <StatementOfAccountSlide
          key={yearData.year}
          investorName={investorName}
          yearData={yearData}
          hasAnyRedemptions={hasAnyRedemptions}
          pageNumber={pageNumber++}
        />
      ))}

      {/* Capital Market Fund Performance (one year per slide) */}
      {cmYears.map(([year, investments]) => (
        <CapitalMarketSlide
          key={year}
          investorName={investorName}
          year={year}
          investments={investments}
          pageNumber={pageNumber++}
        />
      ))}
    </Document>
  );
}
