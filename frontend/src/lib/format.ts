// Display formatting helpers

// 90 -> "1 h 30 min"
export function formatDuration(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return null;

  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;

  return `${hours} h ${rest} min`;
}

// "2026-11-01T00:00:00.000Z" -> "Sun 1 Nov 2026" (dates are stored at UTC midnight)
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  // Built from parts so every browser shows the same "Sun 1 Nov 2026"
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  return `${part("weekday")} ${part("day")} ${part("month")} ${part("year")}`;
}

// Today's date as YYYY-MM-DD in the visitor's time zone
export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

// "05:30", "20:00" -> "05:30–20:00"
export function formatOpeningHours(opening?: string | null, closing?: string | null) {
  if (opening === "00:00" && closing === "23:59") return "Open 24 hours";
  if (opening && closing) return `${opening}–${closing}`;
  if (opening) return `Opens ${opening}`;
  if (closing) return `Closes ${closing}`;
  return null;
}

export function formatKm(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return null;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// "Families, Children, Nature" -> ["Families", "Children", "Nature"]
export function splitList(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// before_you_go is stored one item per line, optionally "Label: text"
export function parseGuidance(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([A-Za-z][A-Za-z ]{1,24}):\s*(.+)$/.exec(line);
      return match ? { label: match[1], text: match[2] } : { label: null, text: line };
    });
}
