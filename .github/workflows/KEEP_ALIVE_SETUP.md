# Keep-alive setup (Render free tier)

Render free-tier web services sleep after ~15 minutes with no inbound HTTP
traffic, then take ~30–60s to cold-start on the next request. This keeps them
awake by pinging **one** endpoint on the API gateway.

## How it works

The gateway exposes `GET /keepalive` (in `api-gateway/server.js`). One request to
it fans out to every downstream service's `/health` over the public network, so a
single external ping keeps the whole mesh warm and reports per-service status.

```
external scheduler ──ping──> gateway /keepalive ──fan-out──> auth  /health
                                                             business /health
                                                             billing  /health
                                                             inventory /health
```

Pick **one** scheduler below. Do not run both — one external pinger is enough.

---

## Option A — GitHub Actions cron (in this repo)

Workflow: `.github/workflows/keep-alive.yml`. Runs **automatically every 5
minutes** — no manual action needed once the secrets are set. It pings the
gateway aggregator AND each service's `/health` directly (two layers, so a
gateway cold start can't leave the others asleep).

**Setup (one time):** Repo → **Settings → Secrets and variables → Actions → New
repository secret**. Add each service's base URL (no trailing slash):

| Secret name | Value (example) |
|---|---|
| `GATEWAY_URL` | `https://your-api-gateway.onrender.com` |
| `AUTH_URL` | `https://auth-service-015z.onrender.com` |
| `BUSINESS_URL` | `https://<real-business-service>.onrender.com` |
| `BILLING_URL` | `https://billing-service-td7u.onrender.com` |
| `INVENTORY_URL` | `https://nava-nava-vyapaar-dfvw.onrender.com` |

Missing secrets are skipped with a warning (the run won't fail), but any service
without a URL won't be kept awake. After adding them the cron runs on its own; the
**Run workflow** button in the Actions tab is only for an optional one-time test.

**Caveats:**
- GitHub scheduled runs are **best-effort** and can be delayed a few minutes under
  load. The 5-min cron leaves margin under the 15-min sleep window even when a run
  slips.
- Scheduled workflows are **auto-disabled after 60 days** of no repo activity — a
  push or a manual run re-enables them.
- The step always exits 0 and logs a warning (not a failure) if a service was
  asleep, because that same request triggers the cold start; the next run confirms.

---

## Option B — UptimeRobot (more reliable timing, recommended)

Better for dependable timing and gives you a dashboard + alerts. Free tier allows
5-minute checks, comfortably under the 15-min sleep threshold.

1. Create a free account at uptimerobot.com.
2. **Add New Monitor** →
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `naya-nava-vyapaar keepalive`
   - URL: `https://<your-gateway>.onrender.com/keepalive`
   - Monitoring Interval: **5 minutes**
3. Save. UptimeRobot staggers checks automatically (built-in jitter) and will
   alert if the gateway stops returning 200.

`Cron-job.org` is an equivalent alternative and allows intervals down to 1 minute.

---

## What this does and doesn't cover

- **Covers:** keeping all public web services awake, as long as the scheduler
  fires under the 15-min threshold. The DB is external (Supabase) and does not
  sleep. There are no background jobs to miss.
- **Doesn't cover:** the billing → inventory *synchronous* call during invoice
  creation. If inventory is asleep at that exact moment, billing's short retries
  (10s timeout) expire before a 30–60s cold start finishes, so stock deduction
  fails soft (invoice still succeeds, `inventoryDeducted: false`). Keep-alive
  shrinks but can't close this window. If stock accuracy at invoice time is
  critical, put **inventory-service** on a paid always-on plan.
- Keep-alive is a free-tier workaround, not a production guarantee.

## Notes

- `BUSINESS_SERVICE_URL` in `render.yaml` is set to
  `https://business-service-kex2.onrender.com`. If that ever changes, update both
  `render.yaml` and the `BUSINESS_URL` repo secret used by this workflow.
