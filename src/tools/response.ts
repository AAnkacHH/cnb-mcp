import { CnbApiError } from "../api/client.js";

export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function fail(err: unknown, fallbackMessage = "Unexpected error") {
  const msg =
    typeof err === "string" ? err : err instanceof CnbApiError ? err.message : fallbackMessage;
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true as const,
  };
}
