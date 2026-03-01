import { type ValidationResult, valid, invalid } from "./base.js";

interface ConvertData {
  sameCurrency: boolean;
}

export function validateConvert(input: {
  amount: number;
  from: string;
  to: string;
}): ValidationResult<ConvertData> {
  if (input.amount <= 0) {
    return invalid("Error: Amount must be greater than zero.");
  }

  return valid({ sameCurrency: input.from === input.to });
}
