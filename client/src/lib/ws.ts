/**
 * Opens a WebSocket to the server's /ws endpoint on the current origin,
 * selecting ws/wss to match the page protocol so it works behind TLS.
 */
export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(`${protocol}//${window.location.host}/ws`);
}
