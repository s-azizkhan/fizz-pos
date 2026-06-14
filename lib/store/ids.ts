import { z } from "zod";

// Parse and validate a UUID coming from a FormData field. Returns null when
// the value is missing or malformed so callers can reject cleanly.
const uuidSchema = z.uuid();

export function parseId(value: FormDataEntryValue | null): string | null {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
}
