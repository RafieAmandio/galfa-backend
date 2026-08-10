import PDFDocument from "pdfkit";
import type { InvestorReportData, VCPerformanceDataPoint, FundAllocationData } from "../actions/get-report-data";
import type { StatementYearData } from "../actions/get-statement-of-account-data";

const brand = {
  navy: "#253272",
  gold: "#E8C84A",
  white: "#ffffff",
  black: "#1a1a1a",
  gray: "#666666",
  lightGray: "#e0e0e0",
  border: "#cccccc",
};

const W = 720;
const H = 405;
const PAD_X = 35;
const PAD_TOP = 25;
const FOOTER_H = 22;

function formatIDR(amount: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
}

function formatIDRShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(0)}M`;
  return `Rp${amount.toFixed(0)}`;
}

function formatRoi(value: number | null): string {
  if (value == null) return "-";
  if (Number.isInteger(value)) return `${value}%`;
  return `${value.toFixed(2)}%`;
}

function formatMonth(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatMonthName(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "long" });
}

function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number) {
  doc.save();
  doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill(brand.navy);
  doc.font("Times-Bold").fontSize(8).fillColor(brand.white);
  doc.text("GalFaCapital", 15, H - FOOTER_H + 7, { width: 200 });
  doc.text(String(pageNumber), 0, H - FOOTER_H + 7, { width: W - 15, align: "right" });
  doc.restore();
}

function drawTitleSlide(doc: PDFKit.PDFDocument, reportMonth: string) {
  doc.addPage({ size: [W, H], margin: 0 });
  doc.rect(0, 0, W, H).fill(brand.navy);

  doc.font("Times-Bold").fontSize(28).fillColor(brand.white);
  doc.text("GalFa Capital", 60, H / 2 - 40);

  doc.font("Times-Roman").fontSize(22);
  doc.text(`Investment Report: ${reportMonth}.`, 60, H / 2 - 5);

  doc.rect(60, H / 2 + 25, 280, 4).fill(brand.gold);
}

function drawInvestmentPerformanceSlide(doc: PDFKit.PDFDocument, data: VCPerformanceDataPoint[], pageNumber: number) {
  doc.addPage({ size: [W, H], margin: 0 });
  drawFooter(doc, pageNumber);

  const cx = PAD_X;
  let cy = PAD_TOP;

  doc.font("Times-BoldItalic").fontSize(14).fillColor(brand.gold);
  doc.text("Investment Performance", cx, cy);
  cy += 18;

  doc.font("Helvetica").fontSize(8).fillColor(brand.black);
  doc.text("Galfa is still on track achieving the target of more than 20% gross profit p.a. - more than 10% nett profit for investors.", cx, cy, { width: W - PAD_X * 2, lineGap: 2 });
  cy += 22;

  const chartW = 380;
  const chartH = 200;
  const pL = 55;
  const pR = 40;
  const pT = 20;
  const pB = 40;
  const gW = chartW - pL - pR;
  const gH = chartH - pT - pB;

  const chartX = cx;
  const chartY = cy;

  const maxAum = Math.max(...data.map(d => d.aum));
  const barCount = data.length;
  const barSpacing = 2;
  const barWidth = Math.min(14, (gW - barSpacing * (barCount - 1)) / barCount);

  const aumStep = Math.ceil(maxAum / 4 / 1_000_000_000) * 1_000_000_000;
  const aumMax = aumStep * 4;

  const roiValues = data.map(d => [d.monthlyGrossRoi, d.monthlyNettRoi]).flat().filter((v): v is number => v != null);
  const maxRoi = roiValues.length > 0 ? Math.max(...roiValues) : 3;
  const roiMax = Math.ceil(maxRoi * 1.2 * 100) / 100;

  const scaleAumY = (v: number) => chartY + pT + gH - (v / aumMax) * gH;
  const scaleRoiY = (v: number) => chartY + pT + gH - (v / roiMax) * gH;

  // Legend
  const legendY = cy;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(brand.black);
  doc.text("Fund Performance", cx, legendY);
  cy = legendY + 12;

  doc.fontSize(5).fillColor(brand.gray);
  doc.rect(cx, cy, 8, 8).fill("#9CA3AF");
  doc.fillColor(brand.gray).text("AUM", cx + 11, cy + 1);
  doc.save().moveTo(cx + 40, cy + 4).lineTo(cx + 52, cy + 4).lineWidth(1.5).strokeColor(brand.navy).stroke().restore();
  doc.text("Monthly Gross ROI", cx + 55, cy + 1);
  doc.save().moveTo(cx + 120, cy + 4).lineTo(cx + 132, cy + 4).lineWidth(1.5).strokeColor(brand.gold).stroke().restore();
  doc.text("Monthly Nett ROI (Investor)", cx + 135, cy + 1);

  cy += 12;
  const chartOriginY = cy;

  // Grid lines + AUM Y-axis labels
  doc.save();
  for (let i = 0; i <= 4; i++) {
    const val = (aumMax / 4) * i;
    const y = chartOriginY + pT + gH - (val / aumMax) * gH;
    doc.moveTo(chartX + pL, y).lineTo(chartX + chartW - pR, y).lineWidth(0.5).strokeColor("#E5E7EB").stroke();
    doc.font("Helvetica").fontSize(5).fillColor(brand.gray);
    doc.text(formatIDRShort(val), chartX, y - 3, { width: pL - 4, align: "right" });
  }

  // ROI Y-axis labels (right)
  for (let i = 0; i <= 3; i++) {
    const val = (roiMax / 3) * i;
    const y = chartOriginY + pT + gH - (val / roiMax) * gH;
    doc.text(val.toFixed(2), chartX + chartW - pR + 4, y - 3);
  }

  // X axis
  doc.moveTo(chartX + pL, chartOriginY + pT + gH).lineTo(chartX + chartW - pR, chartOriginY + pT + gH).lineWidth(0.5).strokeColor("#D1D5DB").stroke();

  // Bars
  const totalBarW = barWidth + barSpacing;
  const startX = chartX + pL + (gW - totalBarW * barCount + barSpacing) / 2;

  data.forEach((point, i) => {
    const barH = Math.max(1, (point.aum / aumMax) * gH);
    const x = startX + i * totalBarW;
    const y = chartOriginY + pT + gH - barH;
    const opacity = 0.4 + (i / barCount) * 0.6;
    const g = Math.round(156 - opacity * 60);
    doc.rect(x, y, barWidth, barH).fill(`rgb(${g},${g},${g + 10})`);

    if (i % Math.max(1, Math.floor(barCount / 12)) === 0 || barCount <= 15) {
      doc.font("Helvetica").fontSize(4).fillColor(brand.gray);
      doc.text(formatMonth(point.date), x - 5, chartOriginY + pT + gH + 4, { width: barWidth + 10, align: "center" });
    }
  });

  // Gross ROI line
  const grossPoints = data.filter(p => p.monthlyGrossRoi != null).map((p, i) => {
    const idx = data.indexOf(p);
    return { x: startX + idx * totalBarW + barWidth / 2, y: scaleRoiY(p.monthlyGrossRoi!) + (chartOriginY - chartY) };
  });
  if (grossPoints.length > 1) {
    doc.save().lineWidth(1.5).strokeColor(brand.navy);
    doc.moveTo(grossPoints[0].x, grossPoints[0].y);
    grossPoints.slice(1).forEach(p => doc.lineTo(p.x, p.y));
    doc.stroke().restore();
    grossPoints.forEach(p => doc.circle(p.x, p.y, 1.5).fill(brand.navy));
  }

  // Nett ROI line
  const nettPoints = data.filter(p => p.monthlyNettRoi != null).map((p) => {
    const idx = data.indexOf(p);
    return { x: startX + idx * totalBarW + barWidth / 2, y: scaleRoiY(p.monthlyNettRoi!) + (chartOriginY - chartY) };
  });
  if (nettPoints.length > 1) {
    doc.save().lineWidth(1.5).strokeColor(brand.gold);
    doc.moveTo(nettPoints[0].x, nettPoints[0].y);
    nettPoints.slice(1).forEach(p => doc.lineTo(p.x, p.y));
    doc.stroke().restore();
    nettPoints.forEach(p => doc.circle(p.x, p.y, 1.5).fill(brand.gold));
  }
  doc.restore();

  // Data table (right side)
  const tableX = chartX + chartW + 15;
  const tableW = W - PAD_X - tableX;
  const tableData = data.slice(-9);

  let ty = chartOriginY;
  const colWidths = [tableW * 0.28, tableW * 0.32, tableW * 0.2, tableW * 0.2];
  const rowH = 16;

  // Table header
  doc.rect(tableX, ty, tableW, rowH).lineWidth(0.5).strokeColor(brand.border).stroke();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(brand.black);
  const headers = ["", "AUM\n(Mio IDR)", "Gross ROI\n(%)", "Nett ROI\n(100%)"];
  let hx = tableX;
  headers.forEach((h, i) => {
    doc.text(h, hx + 4, ty + 2, { width: colWidths[i] - 8, align: i > 0 ? "center" : "left" });
    hx += colWidths[i];
  });
  ty += rowH;

  // Table rows
  tableData.forEach((point, i) => {
    doc.rect(tableX, ty, tableW, 14).lineWidth(0.5).strokeColor(brand.border).stroke();
    let rx = tableX;

    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(brand.black);
    doc.text(formatMonthName(point.date), rx + 4, ty + 3, { width: colWidths[0] - 8 });
    rx += colWidths[0];

    doc.font("Helvetica").fontSize(6.5);
    doc.text(formatIDR(point.aum), rx + 4, ty + 3, { width: colWidths[1] - 8, align: "center" });
    rx += colWidths[1];
    doc.text(formatRoi(point.monthlyGrossRoi), rx + 4, ty + 3, { width: colWidths[2] - 8, align: "center" });
    rx += colWidths[2];
    doc.font("Helvetica-Bold").text(formatRoi(point.monthlyNettRoi), rx + 4, ty + 3, { width: colWidths[3] - 8, align: "center" });
    ty += 14;
  });
}

function drawTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  columns: { header: string; width: number; align?: string }[],
  rows: string[][],
  options?: { headerFont?: string; cellFont?: string; rowHeight?: number; fontSize?: number }
): number {
  const opts = { headerFont: "Helvetica-Bold", cellFont: "Helvetica", rowHeight: 14, fontSize: 6.5, ...options };
  const headerH = 18;

  doc.rect(x, y, width, headerH).lineWidth(0.5).strokeColor(brand.border).stroke();
  doc.font(opts.headerFont).fontSize(7).fillColor(brand.black);

  let cx = x;
  columns.forEach(col => {
    doc.text(col.header, cx + 4, y + 3, { width: col.width - 8, align: (col.align as any) || "left" });
    cx += col.width;
  });

  let ry = y + headerH;
  rows.forEach(row => {
    doc.rect(x, ry, width, opts.rowHeight).lineWidth(0.5).strokeColor(brand.border).stroke();
    cx = x;
    row.forEach((cell, ci) => {
      const col = columns[ci];
      const font = ci === 0 ? opts.headerFont : opts.cellFont;
      doc.font(font!).fontSize(opts.fontSize).fillColor(brand.black);
      doc.text(cell, cx + 4, ry + 3, { width: col.width - 8, align: (col.align as any) || "left" });
      cx += col.width;
    });
    ry += opts.rowHeight;
  });

  return ry;
}

function drawFundAllocationsSlide(doc: PDFKit.PDFDocument, allocations: FundAllocationData[], pageNumber: number) {
  doc.addPage({ size: [W, H], margin: 0 });
  drawFooter(doc, pageNumber);

  let cy = PAD_TOP;
  doc.font("Times-BoldItalic").fontSize(14).fillColor(brand.gold);
  doc.text("Galfa Fund II (Community Fund) Allocations", PAD_X, cy);
  cy += 18;

  doc.font("Helvetica").fontSize(8).fillColor(brand.black);
  doc.text("Most of the funds are used for bridging loans, charged at rate 1%-3% p.m. to portfolio companies.", PAD_X, cy, { width: W - PAD_X * 2 });
  cy += 16;

  const tableW = W - PAD_X * 2;
  const colW = { name: tableW * 0.2, desc: tableW * 0.42, aum: tableW * 0.19, rate: tableW * 0.19 };
  const headerH = 16;
  const fontSize = 6;
  const descFontSize = 5.5;

  // Header
  doc.rect(PAD_X, cy, tableW, headerH).lineWidth(0.5).strokeColor(brand.border).stroke();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(brand.black);
  let hx = PAD_X;
  doc.text("", hx + 4, cy + 4, { width: colW.name - 8 });
  hx += colW.name;
  doc.text("Allocation", hx + 4, cy + 4, { width: colW.desc - 8, align: "center" });
  hx += colW.desc;
  doc.text("AUM", hx + 4, cy + 4, { width: colW.aum - 8, align: "right" });
  hx += colW.aum;
  doc.text("Rate", hx + 4, cy + 4, { width: colW.rate - 8, align: "right" });
  cy += headerH;

  // Rows with dynamic height
  allocations.forEach(a => {
    const descText = a.description || "-";
    const descW = colW.desc - 10;
    doc.font("Helvetica").fontSize(descFontSize);
    const descH = doc.heightOfString(descText, { width: descW });
    const rowH = Math.max(16, descH + 8);

    doc.rect(PAD_X, cy, tableW, rowH).lineWidth(0.5).strokeColor(brand.border).stroke();

    let rx = PAD_X;
    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(brand.black);
    doc.text(a.name, rx + 4, cy + 4, { width: colW.name - 8 });
    rx += colW.name;

    doc.font("Helvetica").fontSize(descFontSize);
    doc.text(descText, rx + 4, cy + 4, { width: descW });
    rx += colW.desc;

    doc.font("Helvetica").fontSize(fontSize);
    doc.text(formatIDR(a.aum).replace("Rp", ""), rx + 4, cy + 4, { width: colW.aum - 8, align: "right" });
    rx += colW.aum;

    const rateText = a.rateLabel || `${a.rateType === "loan" ? "Loan" : "ROE"}: ${a.rateValue}% ${a.rateType === "loan" ? "p.a." : "(Div.)"}`;
    doc.text(rateText, rx + 4, cy + 4, { width: colW.rate - 8, align: "right" });

    cy += rowH;
  });
}

function drawStatementOfAccountSlide(
  doc: PDFKit.PDFDocument,
  investorName: string,
  yearData: StatementYearData,
  hasAnyRedemptions: boolean,
  pageNumber: number
) {
  doc.addPage({ size: [W, H], margin: 0 });
  drawFooter(doc, pageNumber);

  let cy = PAD_TOP;
  doc.font("Times-BoldItalic").fontSize(14).fillColor(brand.gold);
  doc.text("Statement of Account", PAD_X, cy);
  cy += 16;

  doc.font("Times-Roman").fontSize(13).fillColor(brand.navy);
  doc.text(investorName, PAD_X, cy);
  cy += 20;

  const drawHalfYear = (startMonth: number, showYear: boolean) => {
    const monthNames = startMonth === 0
      ? ["January", "February", "March", "April", "May", "June"]
      : ["July", "August", "September", "October", "November", "December"];

    const monthData = monthNames.map(name => yearData.months.find(m => m.month === name));

    const tableW = W - PAD_X * 2;
    const labelW = tableW * 0.14;
    const monthW = (tableW - labelW) / 6;
    const rowLabels = ["Total Invested", "Total Profit", ...(hasAnyRedemptions ? ["Redeemed"] : []), "Present Value", "Total Profit to Total\nInvested Ratio"];
    const totalRows = rowLabels.length + 1; // +1 for header
    const rowH = 14;
    const headerH = 16;

    // Header row
    doc.rect(PAD_X, cy, tableW, headerH).lineWidth(0.5).strokeColor(brand.border).stroke();
    if (showYear) {
      doc.font("Times-Bold").fontSize(13).fillColor(brand.black);
      doc.text(String(yearData.year), PAD_X + 6, cy + 2, { width: labelW - 12 });
    }
    monthNames.forEach((name, i) => {
      const mx = PAD_X + labelW + i * monthW;
      doc.moveTo(mx, cy).lineTo(mx, cy + headerH).lineWidth(0.5).strokeColor(brand.border).stroke();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(brand.black);
      doc.text(name, mx + 2, cy + 3, { width: monthW - 4, align: "center" });
    });
    cy += headerH;

    // Data rows
    const getMonthValue = (data: typeof monthData[0], label: string): string => {
      if (!data) return "";
      switch (label) {
        case "Total Invested": return formatIDR(data.totalInvested);
        case "Total Profit": return formatIDR(data.totalProfit);
        case "Redeemed": return data.redeemed > 0 ? formatIDR(data.redeemed) : "";
        case "Present Value": return formatIDR(data.presentValue);
        default: return data.profitRatio.toFixed(2) + "%";
      }
    };

    rowLabels.forEach((label, ri) => {
      doc.rect(PAD_X, cy, tableW, rowH).lineWidth(0.5).strokeColor(brand.border).stroke();
      doc.moveTo(PAD_X + labelW, cy).lineTo(PAD_X + labelW, cy + rowH).lineWidth(0.5).strokeColor(brand.border).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(brand.black);
      doc.text(label, PAD_X + 6, cy + 2, { width: labelW - 12 });

      monthData.forEach((data, i) => {
        const mx = PAD_X + labelW + i * monthW;
        doc.moveTo(mx, cy).lineTo(mx, cy + rowH).lineWidth(0.5).strokeColor(brand.border).stroke();
        const val = getMonthValue(data, label);
        doc.font("Helvetica").fontSize(6.5).fillColor(val ? brand.black : brand.lightGray);
        doc.text(val, mx + 2, cy + 3, { width: monthW - 4, align: "right" });
      });
      cy += rowH;
    });

    cy += 6;
  };

  drawHalfYear(0, true);
  drawHalfYear(6, false);
}

function drawCapitalMarketSlide(
  doc: PDFKit.PDFDocument,
  investorName: string,
  year: number,
  investments: { performanceDate: Date; totalInvested: number; grossPerformance: number; netPerformance: number }[],
  pageNumber: number
) {
  doc.addPage({ size: [W, H], margin: 0 });
  drawFooter(doc, pageNumber);

  let cy = PAD_TOP;
  doc.font("Times-BoldItalic").fontSize(14).fillColor(brand.gold);
  doc.text("Capital Market Fund Performance", PAD_X, cy);
  cy += 18;

  doc.font("Times-Roman").fontSize(13).fillColor(brand.black);
  doc.text(investorName, PAD_X, cy);
  cy += 20;

  const tableW = W - PAD_X * 2;
  const fmtPct = (v: number, total: number) => total === 0 ? "0.00%" : ((v / total) * 100).toFixed(2) + "%";

  const columns = [
    { header: String(year), width: tableW * 0.14 },
    { header: "Total Invested", width: tableW * 0.16, align: "right" },
    { header: "Gross\nPerformance", width: tableW * 0.18, align: "right" },
    { header: "Gross\nPerformance (%)", width: tableW * 0.16, align: "right" },
    { header: "Net Performance", width: tableW * 0.18, align: "right" },
    { header: "Net Performance\n(%)", width: tableW * 0.18, align: "right" },
  ];

  const rows = investments.map(inv => {
    const month = new Date(inv.performanceDate).toLocaleDateString("en-US", { month: "long" });
    return [
      month,
      formatIDR(inv.totalInvested),
      formatIDR(inv.grossPerformance),
      fmtPct(inv.grossPerformance, inv.totalInvested),
      formatIDR(inv.netPerformance),
      fmtPct(inv.netPerformance, inv.totalInvested),
    ];
  });

  drawTable(doc, PAD_X, cy, tableW, columns, rows);
}

export async function generatePdfBuffer(data: InvestorReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const reportDate = new Date();
    const reportMonth = reportDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    let pageNumber = 2;

    // Slide 1: Title
    drawTitleSlide(doc, reportMonth);

    // Slide 2: Investment Performance
    if (data.vcPerformance.length > 0) {
      drawInvestmentPerformanceSlide(doc, data.vcPerformance, pageNumber++);
    }

    // Slide 3: Fund Allocations
    if (data.fundAllocations.length > 0) {
      drawFundAllocationsSlide(doc, data.fundAllocations, pageNumber++);
    }

    // Slides 4+: Statement of Account
    const hasAnyRedemptions = data.statementOfAccount?.years.some(y => y.months.some(m => m.redeemed > 0)) ?? false;
    const investorName = data.statementOfAccount?.investorName || data.email;

    if (data.statementOfAccount) {
      for (const yearData of data.statementOfAccount.years) {
        drawStatementOfAccountSlide(doc, investorName, yearData, hasAnyRedemptions, pageNumber++);
      }
    }

    // Capital Market slides
    const cmByYear = new Map<number, typeof data.capitalMarketInvestments>();
    for (const inv of data.capitalMarketInvestments) {
      const year = new Date(inv.performanceDate).getFullYear();
      if (!cmByYear.has(year)) cmByYear.set(year, []);
      cmByYear.get(year)!.push(inv);
    }
    const cmYears = Array.from(cmByYear.entries()).sort(([a], [b]) => a - b);
    for (const [year, investments] of cmYears) {
      drawCapitalMarketSlide(doc, investorName, year, investments, pageNumber++);
    }

    doc.end();
  });
}

export function generatePdfFilename(email: string): string {
  const date = new Date().toISOString().split("T")[0];
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  return `investment-report-${sanitizedEmail}-${date}.pdf`;
}
