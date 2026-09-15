export type PeriodPreset = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export type DateRange = { from: Date; to: Date; label: string };

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function resolveDateRange(
  preset: PeriodPreset,
  custom?: { from?: string; to?: string }
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: "Hoje" };
    case "7d": {
      const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
      return { from, to: endOfDay(now), label: "Últimos 7 dias" };
    }
    case "30d": {
      const from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
      return { from, to: endOfDay(now), label: "Últimos 30 dias" };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now), label: "Este mês" };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to), label: "Mês anterior" };
    }
    case "custom": {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : startOfDay(now);
      const to = custom?.to ? endOfDay(new Date(custom.to)) : endOfDay(now);
      return { from, to, label: "Personalizado" };
    }
  }
}
