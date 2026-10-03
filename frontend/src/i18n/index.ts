import messages from "./zh-CN.json";
import extra from "./extra-zh-CN.json";

const dictionary: Readonly<Record<string, string>> = { ...messages, ...extra };

/** Localize display values only. Never use this to construct API payloads or keys. */
export function zh<T>(value: T): T {
  if (typeof value !== "string") return value;
  // A plural suffix is a template fragment, never a standalone unit or value.
  if (value === "s") return value;
  const translated = dictionary[value] ?? dictionary[value.replace(/_/g, " ")] ?? dictionary[value.toLowerCase()];
  return (translated ?? value) as T;
}

/** Translate the fixed parts of display templates while preserving their values. */
export function zhFragment(value: string): string {
  const translated = dictionary[value];
  if (translated !== undefined) return translated;
  const trimmed = value.trim();
  const center = dictionary[trimmed];
  if (center === undefined) return value;
  return value.replace(trimmed, center);
}
