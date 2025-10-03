# Admin tools

reset-analytics.ps1

- Purpose: Safe, one-time admin script to reset server analytics data when you want to start fresh (e.g., on a major version bump).
- Usage (PowerShell):

```powershell
# Interactive confirmation (recommended)
.\tools\reset-analytics.ps1

# Non-interactive (force) with custom URL and secret
.\tools\reset-analytics.ps1 -Url "https://superspace-server-production.up.railway.app/analytics/reset" -Secret "superspaceRESET_8f7c2b1e4d9a" -Force
```

Security note: keep the reset secret safe. Prefer setting `ANALYTICS_RESET_SECRET` in your server environment rather than relying on this hard-coded secret.

---

Simulating tutorial events (QA helper)

File: `tools/send-sample-tutorial-events.ps1`

This helper will POST a sequence of tutorial events to your analytics tracking endpoint so you can verify the Tutorial Insights panel in `analytics.html`.

Basic usage (PowerShell):

	.\tools\send-sample-tutorial-events.ps1

Options:
- `-Url` - URL to POST events to (default: `http://localhost:3000/analytics/track`)
- `-PlayerId` - player id to use (default: `test_player`)
- `-Steps` - how many tutorial steps to simulate (default: 6)
- `-DelayMs` - ms delay between events (default: 500)

See the file header for more details.
