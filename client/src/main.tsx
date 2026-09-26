import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { prefetchRoute } from "./lib/route-chunks";

// Start the chunk for the route being opened before React mounts, so it
// downloads alongside the session check instead of after it. Without this a
// cold deep link to a split route waited for /api/user to resolve, then
// fetched the chunk, then rendered - one extra round trip that in-app
// navigation never pays because the nav prefetches on hover.
prefetchRoute(window.location.pathname);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(container).render(<App />);
