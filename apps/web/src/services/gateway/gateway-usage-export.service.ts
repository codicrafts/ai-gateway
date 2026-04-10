import { listGatewayUsage } from '@/services/gateway/gateway-usage.service';

export type GatewayUsageExportRow = {
  time: string;
  model: string;
  status: 'success' | 'failed';
  api_key_name: string;
  channel_id: number | '';
  request_id: string;
  latency_ms: number | '';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  stream: 'yes' | 'no';
  summary: string;
  error: string;
};

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function compactSummary(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapPdfText(value: string, maxLength = 88): string[] {
  const sanitized = sanitizePdfText(value);
  if (!sanitized) {
    return [''];
  }

  const parts: string[] = [];
  let remaining = sanitized;

  while (remaining.length > maxLength) {
    parts.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }

  parts.push(remaining);
  return parts;
}

function buildSimplePdfDocument(lines: string[]): Uint8Array {
  const pageHeight = 792;
  const pageWidth = 612;
  const marginTop = 752;
  const lineHeight = 14;
  const linesPerPage = 48;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / linesPerPage)) }, (_, index) =>
    lines.slice(index * linesPerPage, (index + 1) * linesPerPage)
  );

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids: string[] = [];
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  let objectIndex = 4;
  for (const pageLines of pages) {
    const pageObjectId = objectIndex++;
    const contentObjectId = objectIndex++;
    kids.push(`${pageObjectId} 0 R`);

    const textOps = [
      'BT',
      '/F1 10 Tf',
      `${lineHeight} TL`,
      `40 ${marginTop} Td`,
      ...pageLines.flatMap((line, lineIndex) => {
        const wrapped = wrapPdfText(line);
        return wrapped.map((segment, segmentIndex) => `${lineIndex === 0 && segmentIndex === 0 ? '' : 'T* '}(${segment}) Tj`.trim());
      }),
      'ET',
    ].join('\n');
    const contentStream = `<< /Length ${Buffer.byteLength(textOps, 'utf8')} >>\nstream\n${textOps}\nendstream`;

    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] = contentStream;
  }

  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export async function getGatewayUsageExportRows(options: {
  userId: string;
  teamId?: string | null;
  limit?: number;
  tokenId?: number;
  model?: string;
}): Promise<GatewayUsageExportRow[]> {
  const result = await listGatewayUsage({
    userId: options.userId,
    teamId: options.teamId,
    page: 0,
    limit: Math.min(500, Math.max(1, options.limit ?? 200)),
    tokenId: options.tokenId,
    model: options.model,
  });

  return result.logs.map((log) => ({
    time: log.created_at,
    model: log.model,
    status: log.status,
    api_key_name: log.api_key_name,
    channel_id: typeof log.runtime_channel_id === 'number' ? log.runtime_channel_id : '',
    request_id: log.runtime_request_id || '',
    latency_ms: typeof log.runtime_use_time === 'number' ? log.runtime_use_time : '',
    input_tokens: Number(log.prompt_tokens || 0),
    output_tokens: Number(log.completion_tokens || 0),
    total_tokens: Number(log.total_tokens || 0),
    cost: Number(log.quota_cost || 0),
    stream: log.runtime_is_stream ? 'yes' : 'no',
    summary: compactSummary(log.runtime_content || log.error_message || log.runtime_request_id || ''),
    error: compactSummary(log.error_message || ''),
  }));
}

export function buildGatewayUsageExportCsv(rows: GatewayUsageExportRow[]): string {
  const headers = [
    'time',
    'model',
    'status',
    'api_key_name',
    'channel_id',
    'request_id',
    'latency_ms',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'cost',
    'stream',
    'summary',
    'error',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.time,
        row.model,
        row.status,
        row.api_key_name,
        row.channel_id,
        row.request_id,
        row.latency_ms,
        row.input_tokens,
        row.output_tokens,
        row.total_tokens,
        row.cost,
        row.stream,
        row.summary,
        row.error,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

export function buildGatewayUsageExportPdf(rows: GatewayUsageExportRow[]): Uint8Array {
  const now = new Date().toISOString();
  const successCount = rows.filter((row) => row.status === 'success').length;
  const failedCount = rows.length - successCount;
  const totalCost = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
  const totalTokens = rows.reduce((sum, row) => sum + Number(row.total_tokens || 0), 0);

  const lines = [
    'AI Gateway Request Logs Export',
    `Generated At: ${now}`,
    `Rows: ${rows.length} | Success: ${successCount} | Failed: ${failedCount}`,
    `Total Tokens: ${totalTokens} | Total Cost: ${totalCost.toFixed(6)}`,
    '',
  ];

  rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.time} | ${row.model} | ${row.status.toUpperCase()} | ${row.api_key_name}`,
      `   req=${row.request_id || '-'} channel=${row.channel_id || '-'} latency=${row.latency_ms || '-'}ms stream=${row.stream}`,
      `   tokens in/out/total=${row.input_tokens}/${row.output_tokens}/${row.total_tokens} cost=${row.cost}`,
      `   summary=${row.summary || '-'}`,
      row.error ? `   error=${row.error}` : '   error=-',
      ''
    );
  });

  return buildSimplePdfDocument(lines);
}
