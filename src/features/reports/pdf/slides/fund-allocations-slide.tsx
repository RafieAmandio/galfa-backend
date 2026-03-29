import { View, Text } from "@react-pdf/renderer";
import { slide } from "../slide-styles";
import { SlideLayout } from "./slide-layout";
import type { FundAllocationData } from "../../actions/get-report-data";

interface FundAllocationsSlideProps {
  allocations: FundAllocationData[];
  pageNumber: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function FundAllocationsSlide({
  allocations,
  pageNumber,
}: FundAllocationsSlideProps) {
  if (!allocations || allocations.length === 0) return null;

  return (
    <SlideLayout pageNumber={pageNumber}>
      <Text style={slide.allocTitle}>
        Galfa Fund II (Community Fund) Allocations
      </Text>
      <Text style={slide.allocSubtitle}>
        Most of the funds are used for bridging loans, charged at rate 1%-3%
        p.m. to portfolio companies.
      </Text>

      <View style={slide.table}>
        {/* Header */}
        <View style={slide.tableHeader}>
          <View style={[slide.tableHeaderCell, { width: "15%" }]}>
            <Text style={slide.tableHeaderText}></Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "45%" }]}>
            <Text style={slide.tableHeaderText}></Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "20%" }]}>
            <Text style={[slide.tableHeaderText, { textAlign: "right" }]}>
              AUM
            </Text>
          </View>
          <View
            style={[
              slide.tableHeaderCell,
              slide.tableHeaderCellLast,
              { width: "20%" },
            ]}
          >
            <Text style={[slide.tableHeaderText, { textAlign: "right" }]}>
              Rate
            </Text>
          </View>
        </View>

        {/* Rows */}
        {allocations.map((alloc, i) => (
          <View
            key={alloc.id}
            style={[
              slide.tableRow,
              i === allocations.length - 1 ? slide.tableRowLast : {},
            ]}
          >
            <View style={[slide.tableCell, { width: "15%" }]}>
              <Text style={slide.tableCellTextBold}>{alloc.name}</Text>
            </View>
            <View style={[slide.tableCell, { width: "45%" }]}>
              <Text style={[slide.tableCellText, { fontSize: 5.5 }]}>
                {alloc.description
                  ? alloc.description.length > 120
                    ? alloc.description.substring(0, 120) + "..."
                    : alloc.description
                  : "-"}
              </Text>
            </View>
            <View style={[slide.tableCell, { width: "20%" }]}>
              <Text style={[slide.tableCellText, { textAlign: "right" }]}>
                {formatCurrency(alloc.aum)}
              </Text>
            </View>
            <View
              style={[
                slide.tableCell,
                slide.tableCellLast,
                { width: "20%" },
              ]}
            >
              <Text style={[slide.tableCellText, { textAlign: "right" }]}>
                {alloc.rateLabel ||
                  `${alloc.rateType === "loan" ? "Loan" : "ROE"}: ${alloc.rateValue}% ${alloc.rateType === "loan" ? "p.a." : "(Div.)"}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </SlideLayout>
  );
}
