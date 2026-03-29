import { Document, Page } from "@react-pdf/renderer";
import { styles } from "./pdf-styles";
import { ReportHeader } from "./pdf-components/report-header";
import { PortfolioSummary } from "./pdf-components/portfolio-summary";
import { PerformanceChart } from "./pdf-components/performance-chart";
import { IHSGComparisonChart } from "./pdf-components/ihsg-comparison-chart";
import { FlatRateTable } from "./pdf-components/flat-rate-table";
import { FloatingRateTable } from "./pdf-components/floating-rate-table";
import { StatementOfAccount } from "./pdf-components/statement-of-account";
import { InstallmentTable } from "./pdf-components/installment-table";
import { CapitalMarketTable } from "./pdf-components/capital-market-table";
import { FundAllocationsTable } from "./pdf-components/fund-allocations-table";
import { ReportFooter } from "./pdf-components/report-footer";
import type { InvestorReportData } from "../actions/get-report-data";

interface InvestmentReportDocumentProps {
  data: InvestorReportData;
}

export function InvestmentReportDocument({
  data,
}: InvestmentReportDocumentProps) {
  const reportDate = new Date();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader investorEmail={data.email} reportDate={reportDate} />

        <PortfolioSummary
          totalNetFund={data.summary.totalNetInvestedFund}
          currentValue={data.summary.totalNetPresentValue}
          gainLoss={data.summary.totalGainLoss}
          gainLossPercentage={data.summary.totalGainLossPercentage}
          activeInvestments={data.summary.activeInvestments}
          adminFees={data.summary.totalAdminFees}
        />

        <PerformanceChart data={data.vcPerformance} />

        <IHSGComparisonChart data={data.vcPerformance} />

        <FlatRateTable investments={data.flatRateInvestments} />

        <FloatingRateTable investments={data.floatingRateInvestments} />

        {data.statementOfAccount && (
          <StatementOfAccount data={data.statementOfAccount} />
        )}

        <InstallmentTable investments={data.installmentInvestments} />

        <CapitalMarketTable investments={data.capitalMarketInvestments} />

        <FundAllocationsTable allocations={data.fundAllocations} />

        <ReportFooter generatedAt={reportDate} />
      </Page>
    </Document>
  );
}
