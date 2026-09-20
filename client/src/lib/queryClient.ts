import { QueryClient, type QueryFunction } from "@tanstack/react-query";

/**
 * Raises an Error carrying the server's message for a non-2xx response.
 * The body is read as text so that HTML error pages and JSON bodies both
 * produce something readable.
 */
async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  const text = await res.text().catch(() => "");
  let message = text || res.statusText;

  if (text) {
    try {
      const body = JSON.parse(text);
      message = body.error || body.message || text;
    } catch {
      // Not JSON; fall back to the raw text already assigned.
    }
  }

  throw new Error(`${res.status}: ${message}`);
}

/**
 * Issues a same-origin API request with the session cookie attached.
 * Throws on a non-2xx response; the caller receives the Response otherwise.
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Builds a query function that GETs queryKey[0]. With on401 "returnNull" a 401
 * resolves to null instead of raising, which is how the auth hook distinguishes
 * "signed out" from a genuine failure.
 */
export const getQueryFn =
  <T,>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, { credentials: "include" });

    if (on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
