// Keep-alive service: pings TARGET_URL on an interval so a Render free web
// service never hits its 15-minute idle sleep. Zero dependencies (Node 18+).
//
// Env:
//   TARGET_URL        required, e.g. https://naya-nava-vyapaar.onrender.com
//   PING_PATH         default /health
//   INTERVAL_MINUTES  default 10 (must be < 15)
//   REQUEST_TIMEOUT_MS default 70000 (tolerates a 30-60s cold start)
//   PORT              default 8080 (own /health so the host sees this app as healthy)
const http = require("http");

const TARGET_URL = (process.env.TARGET_URL || "").replace(/\/+$/, "");
const PING_PATH = process.env.PING_PATH || "/health";
const INTERVAL_MS = Math.min(Number(process.env.INTERVAL_MINUTES) || 10, 14) * 60 * 1000;
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 70000;
const PORT = Number(process.env.PORT) || 8080;

if (!TARGET_URL) {
  console.error("TARGET_URL is not set. Exiting.");
  process.exit(1);
}

const stats = { lastPing: null, lastStatus: null, ok: 0, failed: 0 };

async function ping() {
  const url = TARGET_URL + PING_PATH;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "nnv-keep-alive/1.0" },
    });
    stats.lastStatus = res.status;
    res.ok ? stats.ok++ : stats.failed++;
    console.log(`${new Date().toISOString()} ${res.status} ${Date.now() - started}ms ${url}`);
  } catch (err) {
    stats.lastStatus = "error";
    stats.failed++;
    console.error(`${new Date().toISOString()} FAIL ${err.message} ${url}`);
    // Service may be cold-starting; retry once shortly after.
    setTimeout(ping, 30000).unref();
  }
  stats.lastPing = new Date().toISOString();
}

ping();
setInterval(ping, INTERVAL_MS);

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", target: TARGET_URL, ...stats }));
  })
  .listen(PORT, () => console.log(`keep-alive running on :${PORT}, pinging ${TARGET_URL}${PING_PATH} every ${INTERVAL_MS / 60000} min`));
