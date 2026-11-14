export const MS_IN_DAY = 24 * 60 * 60 * 1000;

export const FREQUENCY_LABELS = {
  Daily: "Ежедневная",
  Weekly: "Еженедельная",
  Monthly: "Ежемесячная",
};

export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const getUtcTodayDateString = () => new Date().toISOString().split("T")[0];

export function msUntilNextUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 1);
  return next - now.getTime();
}

export function toDateOnlyString(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

export function parseUtcDateOnly(value) {
  const [y, m, d] = String(value).split("T")[0].split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const formatUtcDate = (date) => date.toISOString().split("T")[0];

const addDaysUtc = (date, days) => new Date(date.getTime() + days * MS_IN_DAY);

function addMonthsFromCreatedUtc(created, months) {
  const first = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(created.getUTCDate(), lastDay))
  );
}

export function getCurrentPeriod(createdAtUtc, frequency) {
  const created = parseUtcDateOnly(createdAtUtc);
  const today = parseUtcDateOnly(getUtcTodayDateString());

  if (frequency === "Weekly") {
    const days = Math.max(0, Math.floor((today - created) / MS_IN_DAY));
    const start = addDaysUtc(created, Math.floor(days / 7) * 7);
    return { start, end: addDaysUtc(start, 7) };
  }

  if (frequency === "Monthly") {
    let idx = Math.max(
      0,
      (today.getUTCFullYear() - created.getUTCFullYear()) * 12 +
        today.getUTCMonth() - created.getUTCMonth()
    );
    if (addMonthsFromCreatedUtc(created, idx) > today) idx = Math.max(0, idx - 1);
    return {
      start: addMonthsFromCreatedUtc(created, idx),
      end: addMonthsFromCreatedUtc(created, idx + 1),
    };
  }

  return { start: today, end: addDaysUtc(today, 1) };
}

export function isDateInPeriod(dateString, period) {
  const d = parseUtcDateOnly(dateString);
  return d >= period.start && d < period.end;
}
