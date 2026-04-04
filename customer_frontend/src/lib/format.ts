const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value?: number | null) {
  return currency.format(value ?? 0);
}

export function formatPoints(value?: number | null) {
  return `${compactNumber.format(value ?? 0)} pts`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatStatus(status?: string | null) {
  return (status ?? "").replaceAll("_", " ").trim() || "UNKNOWN";
}

export function slugifyLabel(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function combineDateAndTime(date: string, time: string) {
  const local = new Date(`${date}T${time}:00`);
  return local.toISOString();
}

export function getTodayDateInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getNearestTimeInput() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
