const BASE_URL = "https://api.cnb.cz/cnbapi";

export class CnbApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string,
  ) {
    super(message);
    this.name = "CnbApiError";
  }
}

export async function cnbFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 400) {
      throw new CnbApiError(
        400,
        path,
        "Invalid parameters. Check date format (YYYY-MM-DD), currency code (ISO 4217), and year values.",
      );
    }
    if (response.status === 404) {
      throw new CnbApiError(
        404,
        path,
        "No data available for the specified date/period. This may be a weekend or public holiday.",
      );
    }
    throw new CnbApiError(
      response.status,
      path,
      `CNB API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
