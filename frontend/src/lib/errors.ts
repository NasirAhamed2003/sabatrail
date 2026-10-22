// Helpers for reading error responses from the SabaTrail API

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: { message?: string; errors?: Record<string, string> };
  };
}

function asApiError(error: unknown): ApiErrorShape | null {
  return typeof error === "object" && error !== null ? (error as ApiErrorShape) : null;
}

// A user-facing message: the API's own message when it sent one, a
// connection message when the server couldn't be reached, else the fallback.
export function apiErrorMessage(error: unknown, fallback: string) {
  const apiError = asApiError(error);

  if (!apiError?.response) {
    return "We couldn't reach SabaTrail. Check your connection and try again.";
  }

  return apiError.response.data?.message || fallback;
}

// Per-field validation messages, keyed by field name
export function apiFieldErrors(error: unknown): Record<string, string> {
  return asApiError(error)?.response?.data?.errors ?? {};
}

export function apiStatus(error: unknown) {
  return asApiError(error)?.response?.status;
}
