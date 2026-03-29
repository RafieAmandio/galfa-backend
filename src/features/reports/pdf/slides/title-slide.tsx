import { Page, View, Text } from "@react-pdf/renderer";
import { slide, SLIDE_WIDTH, SLIDE_HEIGHT } from "../slide-styles";

interface TitleSlideProps {
  reportMonth: string; // e.g., "January 2025"
}

export function TitleSlide({ reportMonth }: TitleSlideProps) {
  return (
    <Page
      size={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
      style={slide.titlePage}
    >
      <Text style={slide.titleCompany}>GalFa Capital</Text>
      <Text style={slide.titleReport}>
        Investment Report: {reportMonth}.
      </Text>
      <View style={slide.titleUnderline} />
    </Page>
  );
}
