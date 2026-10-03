# Keep-alive setup (Render free tier)

Render free-tier web services sleep after ~15 minutes with no inbound HTTP
traffic, then take ~30–60s to cold-start on the next request. This keeps the
app awake by pinging its `/health` endpoint.

## How it works

The monolith exposes `GET /health`. One scheduled request every few minutes keeps
the single service warm.

```
external scheduler ──ping──> /health
```

Pick **one** scheduler below. Do not run both — one external pinger is enough.

---

## Option A — GitHub Actions cron (in this repo)

Workflow: `.github/workflows/keep-alive.yml`. Runs **automatically every 5
minutes** once the secret is set.

**Setup (one time):** Repo → **Settings → Secrets and variables → Actions → New
repository secret**:

| Secret name | Value (example) |
|---|---|
| `SERVICE_URL` | `https://naya-nava-vyapaar.onrender.com` |

(no trailing slash). If the secret is missing the run fails with a clear message.
The **Run workflow** button in the Actions tab is only for an optional one-time test.

**Caveats:**
- GitHub scheduled runs are **best-effort** and can be delayed a few minutes under
  load. The 5-min cron leaves margin under the 15-min sleep window even when a run
  slips.
- Scheduled workflows are **auto-disabled after 60 days** of no repo activity — a
  push or a manual run re-enables them.
- The step exits 0 and logs a warning (not a failure) if the service was asleep,
  because that same request triggers the cold start; the next run confirms.

---

## Option B — UptimeRobot (more reliable timing, recommended)

Better for dependable timing and gives you a dashboard + alerts. Free tier allows
5-minute checks, comfortably under the 15-min sleep threshold.

1. Create a free account at uptimerobot.com.
2. **Add New Monitor** →
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `naya-nava-vyapaar keepalive`
   - URL: `https://<your-service>.onrender.com/health`
   - Monitoring Interval: **5 minutes**
3. Save.

`Cron-job.org` is an equivalent alternative and allows intervals down to 1 minute.

---

## What this does and doesn't cover

- **Covers:** keeping the single web service awake, as long as the scheduler fires
  under the 15-min threshold.
- Because inventory deduction during invoice creation is now an in-process call
  (not a cross-service HTTP request), there is no longer a separate service that
  can be asleep at invoice time — the old billing → inventory cold-start gap is gone.
- Keep-alive is a free-tier workaround, not a production guarantee. For always-on
  behavior, use a paid Render plan.
