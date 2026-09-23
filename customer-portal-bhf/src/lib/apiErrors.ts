export class ApiError extends Error {
  status: number;
  // Duck-typing marker, checked by isApiError() below instead of
  // `instanceof` — Next's dev-mode module graph can load this file via
  // more than one resolution path across a hot reload, which makes
  // `instanceof` unreliable even for a genuine ApiError instance.
  readonly isApiError = true as const;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { isApiError?: unknown }).isApiError === true &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}
