import { StyleSheet } from "@react-pdf/renderer";

// Galfa Brand Colors
export const colors = {
  // Primary brand colors
  navy: "#192473",
  navyLight: "#2a3a9e",
  navyDark: "#0f1647",
  gold: "#FFEB7A",
  goldLight: "#fff5b3",
  goldDark: "#e6d356",

  // Semantic colors
  success: "#059669",
  successLight: "#d1fae5",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",

  // Neutral colors
  white: "#ffffff",
  background: "#f8fafc",
  backgroundAlt: "#f1f5f9",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
};

export const styles = StyleSheet.create({
  // Page Layout
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: colors.white,
    color: colors.text,
  },

  // Header Styles
  header: {
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.navy,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: colors.gold,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.navy,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.navy,
    letterSpacing: 0.5,
  },
  reportBadge: {
    backgroundColor: colors.navy,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  reportBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  investorInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  investorLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  investorEmail: {
    fontSize: 11,
    color: colors.navy,
    fontWeight: "bold",
  },
  reportDate: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "right",
  },

  // Section Styles
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.navy,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionIconText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  summaryCard: {
    width: "32%",
    marginRight: "2%",
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.navy,
  },
  summaryCardHighlight: {
    backgroundColor: colors.navy,
    borderLeftColor: colors.gold,
  },
  summaryCardSuccess: {
    borderLeftColor: colors.success,
  },
  summaryCardDanger: {
    borderLeftColor: colors.danger,
  },
  summaryCardLabel: {
    fontSize: 7,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryCardLabelLight: {
    color: colors.goldLight,
  },
  summaryCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
  },
  summaryCardValueLight: {
    color: colors.white,
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
  summaryCardSubtext: {
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryCardSubtextLight: {
    color: colors.goldLight,
  },

  // Table Styles
  table: {
    marginTop: 8,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.navy,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlternate: {
    backgroundColor: colors.backgroundAlt,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 8,
    color: colors.text,
  },
  tableCellBold: {
    fontSize: 8,
    color: colors.text,
    fontWeight: "bold",
  },
  tableCellPositive: {
    fontSize: 8,
    color: colors.success,
    fontWeight: "bold",
  },
  tableCellNegative: {
    fontSize: 8,
    color: colors.danger,
    fontWeight: "bold",
  },
  tableCellMuted: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Table Footer/Summary Row
  tableFooter: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundAlt,
    borderTopWidth: 2,
    borderTopColor: colors.navy,
  },
  tableFooterCell: {
    fontSize: 8,
    color: colors.navy,
    fontWeight: "bold",
  },

  // Status Badge
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  statusBadgeActive: {
    backgroundColor: colors.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.backgroundAlt,
  },
  statusBadgeText: {
    fontSize: 7,
    fontWeight: "bold",
  },
  statusBadgeTextActive: {
    color: colors.success,
  },
  statusBadgeTextInactive: {
    color: colors.textMuted,
  },

  // Footer Styles
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerLogo: {
    width: 16,
    height: 16,
    backgroundColor: colors.gold,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  footerLogoText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.navy,
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
  footerBrand: {
    fontSize: 8,
    color: colors.navy,
    fontWeight: "bold",
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textSecondary,
    fontWeight: "bold",
  },

  // No Data State
  noData: {
    padding: 30,
    textAlign: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: 6,
  },
  noDataText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 15,
  },

  // Performance Chart Section
  chartSection: {
    marginBottom: 20,
  },
  chartContainer: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  chartLabel: {
    width: "25%",
    fontSize: 8,
    color: colors.textSecondary,
  },
  chartBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  chartBarFill: {
    height: "100%",
    backgroundColor: colors.navy,
    borderRadius: 2,
  },
  chartValue: {
    width: "20%",
    fontSize: 8,
    color: colors.text,
    textAlign: "right",
    fontWeight: "bold",
  },
});

export const columnWidths = {
  flatRate: {
    accountNumber: "13%",
    gross: "12%",
    fee: "10%",
    net: "12%",
    rate: "8%",
    startDate: "11%",
    endDate: "11%",
    npv: "12%",
    gainLoss: "11%",
  },
  floatingRate: {
    accountNumber: "16%",
    gross: "15%",
    fee: "12%",
    net: "15%",
    presentValue: "14%",
    gained: "14%",
    status: "14%",
  },
  installment: {
    accountNumber: "14%",
    gross: "13%",
    fee: "10%",
    net: "13%",
    cof: "10%",
    duration: "10%",
    type: "14%",
    redeemed: "12%",
  },
  capitalMarket: {
    date: "25%",
    totalInvested: "25%",
    grossPerformance: "25%",
    netPerformance: "25%",
  },
};
