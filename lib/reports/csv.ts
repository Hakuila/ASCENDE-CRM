export function toCsv(rows: Record<string, string | number | null>[], headers: string[]): string {
  const escape = (value: string | number | null) => {
    const str = value == null ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  // BOM no início para o Excel abrir acentuação em UTF-8 corretamente.
  return "\uFEFF" + lines.join("\n");
}
