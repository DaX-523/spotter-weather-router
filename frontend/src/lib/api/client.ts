const API_PREFIX = "/api/v1";
const UNREACHABLE =
  "Could not reach the server. Check your connection and try again.";

type QueryValue = string | number;

/** A failed API call. `fieldErrors` maps request fields to the API's message for each. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type RequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
};

export async function request<Result>(
  method: "GET" | "POST",
  path: string,
  { query, body }: RequestOptions = {},
): Promise<Result> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Result;
}

function buildUrl(path: string, query: RequestOptions["query"] = {}): string {
  // Empty means the same origin: in development Vite proxies /api to Django.
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();
  return `${base}${API_PREFIX}${path}${params ? `?${params}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body)) {
    return new ApiError(
      response.status,
      `Something went wrong (${response.status}).`,
    );
  }
  if (typeof body.detail === "string") {
    return new ApiError(response.status, body.detail);
  }
  return new ApiError(
    response.status,
    "Check the highlighted fields.",
    fieldErrors(body),
  );
}

/** DRF's validation errors, one message per top-level field. Nested errors (a coordinate's
 * latitude) are reported on the field that holds them. */
function fieldErrors(body: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(body).map(([field, value]) => [field, firstMessage(value)]),
  );
}

function firstMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstMessage(value[0]);
  if (isRecord(value)) return firstMessage(Object.values(value)[0]);
  return "This value is not valid.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
