export interface DateRange {
  from: string; // ISO date string
  to: string;   // ISO date string
}

export interface DailyDataPoint {
  date: string;
  value: number;
}

export interface DailyMultiPoint {
  date: string;
  [key: string]: string | number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export type DatePreset = "7d" | "30d" | "90d" | "year" | "custom";

export function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();

  switch (preset) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
    case "custom":
      return {
        from: customFrom || from.toISOString(),
        to: customTo || to.toISOString(),
      };
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  const duration = toMs - fromMs;
  return {
    from: new Date(fromMs - duration).toISOString(),
    to: new Date(fromMs).toISOString(),
  };
}

export function formatDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}
