# Keep-alive service

Pings your Render service's `/health` every 10 minutes (Render sleeps free services after 15 min idle).

## Run locally
```
$env:TARGET_URL="https://naya-nava-vyapaar.onrender.com"; node index.js
```

## Deploy (host it OUTSIDE Render)
A pinger on Render's free tier would sleep itself, and two always-on free services exceed the 750 free hours/month. Deploy this folder on another free host (Koyeb, Fly.io, Railway, a VPS, etc.) using the Dockerfile or `npm start`, and set:

- `TARGET_URL` = your Render URL (no trailing slash)
- optional: `INTERVAL_MINUTES` (max 14), `PING_PATH`

Keep the existing GitHub Actions workflow as a second, independent pinger for redundancy.
