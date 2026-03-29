import { Page, View, Text } from "@react-pdf/renderer";
import { slide, brand, SLIDE_WIDTH, SLIDE_HEIGHT } from "../slide-styles";

interface SlideLayoutProps {
  children: React.ReactNode;
  pageNumber: number;
}

export function SlideLayout({ children, pageNumber }: SlideLayoutProps) {
  return (
    <Page
      size={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
      style={slide.page}
    >
      <View style={slide.content}>{children}</View>
      <View style={slide.footer}>
        <Text style={slide.footerText}>GalFaCapital</Text>
        <Text style={slide.footerPage}>{pageNumber}</Text>
      </View>
    </Page>
  );
}
