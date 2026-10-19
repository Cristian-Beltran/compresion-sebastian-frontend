import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "@/lib/axios";

export type ReportColumn = { header: string; key: string; width?: number };
export type ReportDefinition = {
  filename: string;
  title: string;
  subtitle: string;
  section?: string;
  filters?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  generatedBy?: string;
};

const colors = { navy: "083B66", blue: "1673C8", green: "14A37F", pale: "EAF4FB", line: "CFE0EE", text: "1D2B3A" };

const value = (raw: unknown) => {
  if (raw === null || raw === undefined) return "—";
  if (raw instanceof Date) return raw.toLocaleString();
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function metadata(definition: ReportDefinition) {
  return [
    ["Generado", new Date().toLocaleString()],
    ["Responsable", definition.generatedBy ?? "Usuario VenoFlow"],
    ["Registros incluidos", String(definition.rows.length)],
    ["Filtros", definition.filters || "Sin filtros aplicados"],
  ];
}

export async function downloadExcelReport(definition: ReportDefinition) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VenoFlow";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Reporte", { views: [{ state: "frozen", ySplit: 8 }] });
  const lastColumn = Math.max(definition.columns.length, 2);
  const end = worksheet.getColumn(lastColumn).letter;
  worksheet.mergeCells(`A1:${end}1`);
  worksheet.getCell("A1").value = "VenoFlow";
  worksheet.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 18 };
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.navy}` } };
  worksheet.getCell("A1").alignment = { vertical: "middle" };
  worksheet.getRow(1).height = 30;
  worksheet.mergeCells(`A2:${end}2`);
  worksheet.getCell("A2").value = "Plataforma biomédica";
  worksheet.getCell("A2").font = { color: { argb: "FFFFFFFF" }, italic: true, size: 10 };
  worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.navy}` } };
  worksheet.mergeCells(`A3:${end}3`);
  worksheet.getCell("A3").value = definition.title;
  worksheet.getCell("A3").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 15 };
  worksheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.blue}` } };
  worksheet.getRow(3).height = 26;
  worksheet.mergeCells(`A4:${end}4`);
  worksheet.getCell("A4").value = definition.subtitle;
  worksheet.getCell("A4").font = { color: { argb: "FF0C5E46" }, italic: true };
  worksheet.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.pale}` } };
  metadata(definition).forEach(([label, data], index) => {
    const row = 5 + index;
    worksheet.getCell(`A${row}`).value = label;
    worksheet.getCell(`A${row}`).font = { bold: true, color: { argb: `FF${colors.navy}` } };
    worksheet.getCell(`B${row}`).value = data;
    worksheet.mergeCells(`B${row}:${end}${row}`);
    for (let col = 1; col <= lastColumn; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F9FC" } };
    }
  });
  const titleRow = 10;
  worksheet.mergeCells(`A${titleRow}:${end}${titleRow}`);
  worksheet.getCell(`A${titleRow}`).value = definition.section ?? "Actividad registrada";
  worksheet.getCell(`A${titleRow}`).font = { bold: true, color: { argb: `FF${colors.navy}` }, size: 12 };
  worksheet.getCell(`A${titleRow}`).border = { bottom: { style: "medium", color: { argb: `FF${colors.green}` } } };
  const header = worksheet.getRow(titleRow + 1);
  definition.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.blue}` } };
    cell.alignment = { vertical: "middle", wrapText: true };
    worksheet.getColumn(index + 1).width = column.width ?? Math.max(14, Math.min(34, column.header.length + 8));
  });
  definition.rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(titleRow + 2 + rowIndex);
    definition.columns.forEach((column, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = value(row[column.key]);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: `FF${colors.line}` } } };
      if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6FAFD" } };
    });
  });
  worksheet.autoFilter = { from: { row: titleRow + 1, column: 1 }, to: { row: titleRow + 1, column: lastColumn } };
  const data = await workbook.xlsx.writeBuffer();
  download(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${definition.filename}.xlsx`);
}

export function downloadPdfReport(definition: ReportDefinition) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(colors.navy); pdf.rect(0, 0, width, 72, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.text("VenoFlow", 38, 34);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text("Plataforma biomédica", 39, 50);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(definition.title, width - 38, 34, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(definition.subtitle, width - 38, 50, { align: "right" });
  pdf.setFillColor(colors.green); pdf.rect(0, 72, width, 4, "F");
  pdf.setFillColor(colors.pale); pdf.rect(38, 92, width - 76, 60, "F");
  pdf.setTextColor(colors.text); pdf.setFontSize(9);
  metadata(definition).forEach(([label, data], index) => {
    const x = index % 2 === 0 ? 52 : width / 2 + 12;
    const y = 113 + Math.floor(index / 2) * 22;
    pdf.setFont("helvetica", "bold"); pdf.text(`${label}:`, x, y);
    pdf.setFont("helvetica", "normal"); pdf.text(String(data), x + 84, y, { maxWidth: width / 2 - 140 });
  });
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(colors.navy); pdf.setFontSize(13); pdf.text(definition.section ?? "Actividad registrada", 38, 180);
  pdf.setFillColor(colors.green); pdf.rect(38, 185, 150, 2, "F");
  autoTable(pdf, {
    startY: 198,
    head: [definition.columns.map((column) => column.header)],
    body: definition.rows.map((row) => definition.columns.map((column) => value(row[column.key]))),
    theme: "grid",
    margin: { left: 38, right: 38, bottom: 35 },
    styles: { fontSize: 8, cellPadding: 6, textColor: colors.text, lineColor: colors.line, lineWidth: 0.4 },
    headStyles: { fillColor: colors.blue, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: "F6FAFD" },
    didDrawPage: () => {
      const page = pdf.getNumberOfPages();
      if (page > 1) {
        pdf.setFillColor(colors.navy); pdf.rect(0, 0, width, 34, "F");
        pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text("VenoFlow", 38, 22);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(definition.title, width - 38, 22, { align: "right" });
      }
      pdf.setDrawColor(colors.line); pdf.line(38, pdf.internal.pageSize.getHeight() - 28, width - 38, pdf.internal.pageSize.getHeight() - 28);
      pdf.setFontSize(8); pdf.setTextColor("627184"); pdf.text("Documento generado por VenoFlow", 38, pdf.internal.pageSize.getHeight() - 16);
      pdf.text(`Página ${page}`, width - 38, pdf.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });
  pdf.save(`${definition.filename}.pdf`);
}

export async function fetchAllReportPages<T>(path: string, params: URLSearchParams): Promise<T[]> {
  const firstParams = new URLSearchParams(params);
  firstParams.set("page", "1");
  firstParams.set("pageSize", "100");
  const first = await axios.get<{ items: T[]; total: number }>(`${path}?${firstParams}`);
  const rows = first.data.items ?? [];
  const pages = Math.ceil((first.data.total ?? rows.length) / 100);
  if (pages <= 1) return rows;
  const remaining = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => {
    const pageParams = new URLSearchParams(params); pageParams.set("page", String(index + 2)); pageParams.set("pageSize", "100");
    return axios.get<{ items: T[] }>(`${path}?${pageParams}`);
  }));
  return [...rows, ...remaining.flatMap((response) => response.data.items ?? [])];
}
