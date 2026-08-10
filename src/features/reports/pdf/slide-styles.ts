import { StyleSheet } from "@react-pdf/renderer";

export const brand = {
  navy: "#253272",
  gold: "#E8C84A",
  white: "#ffffff",
  black: "#1a1a1a",
  gray: "#666666",
  lightGray: "#e0e0e0",
  border: "#cccccc",
};

// 16:9 slide size in points (720 x 405)
export const SLIDE_WIDTH = 720;
export const SLIDE_HEIGHT = 405;

export const slide = StyleSheet.create({
  // Base slide
  page: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: brand.black,
    backgroundColor: brand.white,
    position: "relative",
  },

  // Title slide (navy background)
  titlePage: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    backgroundColor: brand.navy,
    justifyContent: "center",
    paddingLeft: 60,
    paddingRight: 60,
  },
  titleCompany: {
    fontFamily: "Times-Bold",
    fontSize: 28,
    color: brand.white,
    marginBottom: 4,
  },
  titleReport: {
    fontFamily: "Times-Roman",
    fontSize: 22,
    color: brand.white,
    marginBottom: 8,
  },
  titleUnderline: {
    width: 280,
    height: 4,
    backgroundColor: brand.gold,
  },

  // Footer bar
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: brand.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  footerText: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    color: brand.white,
  },
  footerPage: {
    fontSize: 8,
    color: brand.white,
  },

  // Content area (above footer)
  content: {
    paddingTop: 25,
    paddingLeft: 35,
    paddingRight: 35,
    paddingBottom: 30, // space for footer
    flex: 1,
  },

  // Section header (gold text)
  sectionTitle: {
    fontFamily: "Times-BoldItalic",
    fontSize: 14,
    color: brand.gold,
    marginBottom: 2,
  },
  investorName: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: brand.navy,
    marginBottom: 12,
  },

  // Statement of Account table
  soaTable: {
    borderWidth: 1,
    borderColor: brand.border,
    marginBottom: 8,
  },
  soaHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  soaYearCell: {
    width: "14%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  soaYearText: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: brand.black,
  },
  soaMonthCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: brand.border,
  },
  soaMonthText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
  },
  soaDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  soaDataRowLast: {
    borderBottomWidth: 0,
  },
  soaLabelCell: {
    width: "14%",
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: brand.border,
  },
  soaLabelText: {
    fontSize: 7,
    color: brand.black,
  },
  soaValueCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: brand.border,
  },
  soaValueCellFirst: {
    borderLeftWidth: 0,
  },
  soaValueText: {
    fontSize: 6.5,
    color: brand.black,
  },
  soaValueEmpty: {
    fontSize: 6.5,
    color: brand.lightGray,
  },

  // Investment Performance styles
  perfTitle: {
    fontFamily: "Times-BoldItalic",
    fontSize: 14,
    color: brand.gold,
    marginBottom: 4,
  },
  perfSubtitle: {
    fontSize: 8,
    color: brand.black,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  perfChartArea: {
    flexDirection: "row",
    flex: 1,
  },
  perfChart: {
    width: "60%",
    paddingRight: 15,
  },
  perfInfoBox: {
    width: "40%",
    paddingLeft: 10,
  },

  // Fund allocations
  allocTitle: {
    fontFamily: "Times-BoldItalic",
    fontSize: 14,
    color: brand.gold,
    marginBottom: 4,
  },
  allocSubtitle: {
    fontSize: 8,
    color: brand.black,
    marginBottom: 10,
  },

  // Generic table for fund allocations / capital market
  table: {
    borderWidth: 1,
    borderColor: brand.border,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    backgroundColor: brand.white,
  },
  tableHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: brand.border,
    justifyContent: "center",
  },
  tableHeaderCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: brand.border,
    justifyContent: "center",
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableCellText: {
    fontSize: 6.5,
    color: brand.black,
  },
  tableCellTextBold: {
    fontSize: 6.5,
    color: brand.black,
    fontFamily: "Helvetica-Bold",
  },

  // Capital Market styles
  cmTitle: {
    fontFamily: "Times-BoldItalic",
    fontSize: 14,
    color: brand.gold,
    marginBottom: 8,
  },
  cmInvestorName: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: brand.black,
    marginBottom: 12,
  },
});
