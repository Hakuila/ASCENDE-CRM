const FORMULA_TRIGGER_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * P1-05: neutraliza valores que começam com caracteres que planilhas
 * (Excel, Google Sheets, LibreOffice) podem interpretar como início de
 * fórmula — vetor conhecido como "CSV Injection"/"Formula Injection", que
 * pode levar à execução de comandos ao abrir o arquivo exportado.
 *
 * Só se aplica a valores string: um número real (ex.: o campo `value` de
 * um Lead/Deal) nunca carrega esse risco, já que não pode conter conteúdo
 * arbitrário além do próprio dígito/sinal.
 *
 * A checagem usa o primeiro caractere sem trim: espaços à esquerda já
 * impedem a interpretação como fórmula na prática, então não precisam ser
 * tratados como bypass.
 */
function sanitizeCsvValue(value: string | number | null): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);

  if (value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0])) {
    return `'${value}`;
  }
  return value;
}

export function toCsv(rows: Record<string, string | number | null>[], headers: string[]): string {
  const escape = (value: string | number | null) => {
    const sanitized = sanitizeCsvValue(value);
    if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  // BOM no início para o Excel abrir acentuação em UTF-8 corretamente.
  return "\uFEFF" + lines.join("\n");
}