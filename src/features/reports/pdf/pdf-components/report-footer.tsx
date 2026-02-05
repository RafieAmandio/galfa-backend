import { View, Text, Image } from "@react-pdf/renderer";
import { styles } from "../pdf-styles";
import path from "path";

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

  // Get the absolute path to the logo
  const logoPath = path.join(process.cwd(), "public", "logo_galfa.png");

  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        {/* Logo */}
        <Image
          src={logoPath}
          style={{ width: 50, height: 20, objectFit: "contain", marginRight: 6 }}
        />
        <View>
          <Text style={styles.footerBrand}>Investment Platform</Text>
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
