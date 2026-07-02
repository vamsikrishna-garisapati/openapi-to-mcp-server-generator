export const WARNING_CODES = {
  P001: "P001",
  P002: "P002",
  P003: "P003",
  P004: "P004",
  P005: "P005",
} as const;

export const ERROR_CODES = {
  E001: "E001",
  E002: "E002",
  E003: "E003",
  E004: "E004",
  E005: "E005",
  E006: "E006",
} as const;

export type WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function warning(
  code: WarningCode,
  message: string,
  location?: string,
) {
  return { code, message, location };
}

export function error(code: ErrorCode, message: string, location?: string) {
  return { code, message, location };
}
