import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

export interface ExportMetric {
  label: string;
  value: string;
}

export interface ExportRow {
  label: string;
  value: string | number;
}

export interface ReportExportPayload {
  companyName: string;
  periodLabel: string;
  generatedAt: string;
  metrics: ExportMetric[];
  orderStatusRows: ExportRow[];
  invoiceStatusRows: ExportRow[];
  topClientes: ExportRow[];
  topProdutos: ExportRow[];
}

const escapeCsv = (value: string | number) => {
  const raw = String(value ?? "");
  if (raw.includes(";") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const buildCsv = (payload: ReportExportPayload) => {
  const lines: string[] = [];

  lines.push("Relatório Operacional");
  lines.push(`Empresa;${escapeCsv(payload.companyName)}`);
  lines.push(`Período;${escapeCsv(payload.periodLabel)}`);
  lines.push(`Gerado em;${escapeCsv(payload.generatedAt)}`);
  lines.push("");

  lines.push("Métricas");
  lines.push("Indicador;Valor");
  payload.metrics.forEach((item) => {
    lines.push(`${escapeCsv(item.label)};${escapeCsv(item.value)}`);
  });
  lines.push("");

  lines.push("Status de Ordens");
  lines.push("Status;Quantidade");
  payload.orderStatusRows.forEach((row) => {
    lines.push(`${escapeCsv(row.label)};${escapeCsv(row.value)}`);
  });
  lines.push("");

  lines.push("Status de Notas");
  lines.push("Status;Quantidade");
  payload.invoiceStatusRows.forEach((row) => {
    lines.push(`${escapeCsv(row.label)};${escapeCsv(row.value)}`);
  });
  lines.push("");

  lines.push("Top Clientes");
  lines.push("Cliente;Valor");
  payload.topClientes.forEach((row) => {
    lines.push(`${escapeCsv(row.label)};${escapeCsv(row.value)}`);
  });
  lines.push("");

  lines.push("Top Produtos e Serviços");
  lines.push("Item;Valor");
  payload.topProdutos.forEach((row) => {
    lines.push(`${escapeCsv(row.label)};${escapeCsv(row.value)}`);
  });

  return `\uFEFF${lines.join("\n")}`;
};

const buildPdfHtml = (payload: ReportExportPayload) => {
  const tableRows = (rows: ExportRow[]) =>
    rows
      .map(
        (row) =>
          `<tr><td>${row.label}</td><td style="text-align:right;">${row.value}</td></tr>`,
      )
      .join("");

  const metricsRows = payload.metrics
    .map(
      (item) =>
        `<tr><td>${item.label}</td><td style="text-align:right;">${item.value}</td></tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 20px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 16px; margin: 20px 0 8px; }
          p { margin: 0 0 4px; color: #4B5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; }
          th { background: #F9FAFB; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Relatório Operacional</h1>
        <p><strong>Empresa:</strong> ${payload.companyName}</p>
        <p><strong>Período:</strong> ${payload.periodLabel}</p>
        <p><strong>Gerado em:</strong> ${payload.generatedAt}</p>

        <h2>Métricas</h2>
        <table>
          <tr><th>Indicador</th><th>Valor</th></tr>
          ${metricsRows}
        </table>

        <h2>Status de Ordens</h2>
        <table>
          <tr><th>Status</th><th>Quantidade</th></tr>
          ${tableRows(payload.orderStatusRows)}
        </table>

        <h2>Status de Notas</h2>
        <table>
          <tr><th>Status</th><th>Quantidade</th></tr>
          ${tableRows(payload.invoiceStatusRows)}
        </table>

        <h2>Top Clientes</h2>
        <table>
          <tr><th>Cliente</th><th>Valor</th></tr>
          ${tableRows(payload.topClientes)}
        </table>

        <h2>Top Produtos e Serviços</h2>
        <table>
          <tr><th>Item</th><th>Valor</th></tr>
          ${tableRows(payload.topProdutos)}
        </table>
      </body>
    </html>
  `;
};

const ensureShareAvailable = async () => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }
};

export async function exportReportCsv(payload: ReportExportPayload) {
  const fileUri = await generateReportCsvFile(payload);

  await ensureShareAvailable();
  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    dialogTitle: "Exportar relatório CSV",
  });
}

export async function exportReportPdf(payload: ReportExportPayload) {
  const fileUri = await generateReportPdfFile(payload);

  await ensureShareAvailable();
  await Sharing.shareAsync(fileUri, {
    mimeType: "application/pdf",
    dialogTitle: "Exportar relatório PDF",
  });
}

export async function generateReportCsvFile(
  payload: ReportExportPayload,
): Promise<string> {
  const csv = buildCsv(payload);
  const fileName = `relatorio-${Date.now()}.csv`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(csv);

  return file.uri;
}

export async function generateReportPdfFile(
  payload: ReportExportPayload,
): Promise<string> {
  const html = buildPdfHtml(payload);

  const printResult = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return printResult.uri;
}
