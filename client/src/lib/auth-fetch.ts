/**
 * fetch wrapper that always sends the session cookie.
 *
 * Callers inspect response.ok themselves, so this deliberately does not throw
 * on a non-2xx response.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}
