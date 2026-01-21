import { View, Text } from "@react-pdf/renderer";
import { styles } from "../pdf-styles";

interface ReportHeaderProps {
  investorEmail: string;
  reportDate: Date;
}

export function ReportHeader({ investorEmail, reportDate }: ReportHeaderProps) {
  const formattedDate = reportDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.header}>
      <Text style={styles.title}>Investment Portfolio Report</Text>
      <Text style={styles.subtitle}>Galfa Investment Platform</Text>
      <View style={styles.investorInfo}>
        <Text style={styles.investorEmail}>Investor: {investorEmail}</Text>
        <Text style={styles.reportDate}>Generated: {formattedDate}</Text>
      </View>
    </View>
  );
}
