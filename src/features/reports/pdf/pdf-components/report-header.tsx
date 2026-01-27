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

  const formattedTime = reportDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.header}>
      {/* Top row with logo and badge */}
      <View style={styles.headerTop}>
        <View style={styles.logoSection}>
          {/* Logo placeholder */}
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.brandName}>Galfa</Text>
        </View>
        <View style={styles.reportBadge}>
          <Text style={styles.reportBadgeText}>Investment Report</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Portfolio Statement</Text>
      <Text style={styles.subtitle}>
        Comprehensive overview of your investment portfolio
      </Text>

      {/* Investor info */}
      <View style={styles.investorInfo}>
        <View>
          <Text style={styles.investorLabel}>Investor</Text>
          <Text style={styles.investorEmail}>{investorEmail}</Text>
        </View>
        <View>
          <Text style={styles.investorLabel}>Report Generated</Text>
          <Text style={styles.reportDate}>{formattedDate}</Text>
          <Text style={styles.reportDate}>{formattedTime}</Text>
        </View>
      </View>
    </View>
  );
}
