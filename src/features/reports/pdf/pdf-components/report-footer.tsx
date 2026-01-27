import { View, Text } from "@react-pdf/renderer";
import { styles } from "../pdf-styles";

interface ReportFooterProps {
  generatedAt: Date;
}

export function ReportFooter({ generatedAt }: ReportFooterProps) {
  const formattedDateTime = generatedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        {/* Logo */}
        <View style={styles.footerLogo}>
          <Text style={styles.footerLogoText}>G</Text>
        </View>
        <View>
          <Text style={styles.footerBrand}>Galfa Investment Platform</Text>
          <Text style={styles.footerText}>Report generated {formattedDateTime}</Text>
        </View>
      </View>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}
