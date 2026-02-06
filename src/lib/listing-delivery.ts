export const DELIVERY_TIME_OPTIONS = [
  { value: "INSTANT", label: "Instant delivery" },
  { value: "MIN_1_10", label: "1 min - 10 min" },
  { value: "MIN_10_30", label: "10 min - 30 min" },
  { value: "MIN_30_60", label: "30 min - 60 min" },
  { value: "HOUR_1_3", label: "1 hour - 3 hours" },
  { value: "HOUR_3_12", label: "3 hours - 12 hours" },
  { value: "HOUR_12_24", label: "12 hours - 24 hours" },
  { value: "DAY_1_3", label: "1 day - 3 days" },
] as const;

export type DeliveryTimeOptionValue = (typeof DELIVERY_TIME_OPTIONS)[number]["value"];

const DELIVERY_TIME_MAP = new Map<string, string>(
  DELIVERY_TIME_OPTIONS.map((option) => [option.value, option.label]),
);

function normalizeCategoryName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isDeliveryTimeOptionValue(value: string): value is DeliveryTimeOptionValue {
  return DELIVERY_TIME_MAP.has(value);
}

export function getDeliveryTimeLabel(value: DeliveryTimeOptionValue): string {
  return DELIVERY_TIME_MAP.get(value) ?? "Not specified";
}

export function isInstantDeliveryAllowedForCategory(categoryName: string): boolean {
  const normalized = normalizeCategoryName(categoryName);
  const compact = normalized.replace(/\s+/g, "");

  if (compact.includes("giftcard")) {
    return true;
  }

  return normalized.includes("account");
}

export function getAllowedDeliveryTimeOptions(categoryName: string) {
  if (isInstantDeliveryAllowedForCategory(categoryName)) {
    return DELIVERY_TIME_OPTIONS;
  }

  return DELIVERY_TIME_OPTIONS.filter((option) => option.value !== "INSTANT");
}
