import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  primary: "#1e40af",
  secondary: "#64748b",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#ea580c",
  background: "#f8fafc",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  investorInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  investorEmail: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "bold",
  },
  reportDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },
  summaryCard: {
    width: "30%",
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCardLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  summaryCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
  },
  summaryCardValuePositive: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.success,
  },
  summaryCardValueNegative: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.danger,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlternate: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 8,
    color: colors.text,
  },
  tableCellPositive: {
    fontSize: 8,
    color: colors.success,
  },
  tableCellNegative: {
    fontSize: 8,
    color: colors.danger,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textMuted,
  },
  noData: {
    padding: 20,
    textAlign: "center",
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

export const columnWidths = {
  flatRate: {
    accountNumber: "12%",
    gross: "12%",
    fee: "10%",
    net: "12%",
    rate: "8%",
    startDate: "10%",
    endDate: "10%",
    npv: "13%",
    gainLoss: "13%",
  },
  floatingRate: {
    accountNumber: "15%",
    gross: "14%",
    fee: "12%",
    net: "14%",
    presentValue: "15%",
    gained: "15%",
    status: "15%",
  },
  installment: {
    accountNumber: "14%",
    gross: "12%",
    fee: "10%",
    net: "12%",
    cof: "10%",
    duration: "10%",
    type: "12%",
    redeemed: "12%",
  },
};
