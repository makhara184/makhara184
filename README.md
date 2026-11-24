# Studio Makhara — ten little applications

A responsive, installable portfolio of ten focused browser apps. Each app has its own route and local data store. No sign-in, analytics, server, or build step is required.

## Applications

| App | What it does |
|---|---|
| NotchBuddy | Schedule personal reminders and mark them complete. On macOS the original SwiftUI companion remains a separate native project. |
| FocusDesk | A 25-minute focus timer, short and long breaks, and a personal task list. |
| DealFlow | Track deals by stage, move them through a pipeline, and see total value. |
| SprintBoard | Track milestones and project risks, issues, and dependencies; copy a status report. |
| LedgerLite | Record expenses, set a monthly budget, and export a CSV. |
| TidyDesk | Preview file groups by type and export a safe organization plan before moving anything. |
| InvoiceCraft | Build line items, calculate tax and totals, and print or save as PDF. |
| CVForge | Edit a Markdown-style resume with live preview and download/print options. |
| GeoPin | Plot ordered coordinates, calculate great-circle distance, and export GeoJSON. |
| HabitPulse | Track daily check-ins and see a simple weekly view. |

## Run or publish

Open `index.html` directly for basic use, or serve this folder from localhost/HTTPS to enable app installation and service-worker caching. GitHub Pages deployment is configured in `.github/workflows/pages.yml`; after Pages is set to **GitHub Actions** in repository settings, pushes to `main` publish the site.

## Privacy and limits

App data is stored in the browser's local storage and stays on that device/browser profile. Clearing browser data clears app data, so export files where available. NotchBuddy browser reminders only fire while the page is open; browser timers are not a reliable background alarm when the app is closed or the device sleeps. For dependable background delivery, use the separate native macOS app or add a notification service. TidyDesk only analyzes selected filenames and creates a plan; it never moves files.

The visual map in GeoPin is a coordinate plot rather than a street map, and its straight-line route distance is a great-circle estimate. LedgerLite currently formats amounts in USD. These tools are personal utilities, not financial, tax, or navigation advice.

## Technology

Vanilla HTML, CSS, and JavaScript keep the suite fast, portable, dependency-free, and easy to host. The existing Swift and Python projects can continue to evolve in their dedicated repositories.

