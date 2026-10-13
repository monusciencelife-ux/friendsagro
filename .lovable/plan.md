# Village Agro — Rebuild Plan

Recreate the somobay.lovable.app cooperative investment app ("Village Agro") with a polished version of its green Bengali UI, Google Sheets as the data store, and the same login behavior.

## What the original app has (from inspection)

- **Public:** Home dashboard (net fund, available, invested, investors, active/completed projects, total profit, recent transactions, investor share %, monthly investment chart), Projects list, Investors list, Download page (Excel/ZIP export), Login
- **Admin:** Requests (approve/reject investments & projects), Admin dashboard (create users, bill causes, change password), Cashout form, project management
- **Data (exported from original app):** 12 tables — 61 investments, 37 requests, 1 completed project (সুপারী ক্রয়/বিক্রয়, ৳20,550 profit), 27 expense steps, 3 sales, profit distributions, percentage snapshots, 4 profiles, chat messages, bill causes

## Data: Google Sheets (your choice)

The linked sheet is currently empty. Plan:

1. Link your Google account via Lovable's Google Sheets connector (one approval card) so the app can read/write the sheet securely server-side. No credentials in frontend code.
2. Create tabs in your sheet mirroring the original structure: `profiles`, `investments`, `cashouts`, `requests`, `projects`, `project_steps`, `project_sales`, `profit_distributions`, `percentage_snapshots`, `bill_causes`, `chat_messages`.
3. Migrate all exported records into those tabs exactly as-is (same values, same IDs).
4. All app reads/writes go through server functions → Google Sheets API (batched, cached to respect the 60 req/min quota).

**Limitations to be aware of:** Sheets is slower than a database; chat and approval workflows will work but with short refresh delays; concurrent edits are last-write-wins.

## Login (recreate same behavior)

- Admin creates users with name + phone + password (like the original).
- Investors log in with phone/email + password.
- Auth handled by Lovable Cloud's built-in secure authentication (passwords never stored in the sheet or source code); roles (admin/investor) enforced server-side on every data operation, not just by hiding buttons.

## Pages to build

1. `/` — dashboard with summary cards, recent transactions, investor share pie, monthly trend chart
2. `/projects` — project list + project detail (steps, sales, profit distribution, chat)
3. `/investors` — investor list with totals and share %
4. `/download` — Excel/ZIP export of all tabs
5. `/login` — Bengali login form
6. `/requests` — admin approval queue
7. `/admin` — admin dashboard (users, bill causes, password change)
8. `/admin/cashout` — cashout form

## Design

Same green cooperative theme and Bengali text, polished: cleaner cards, consistent spacing, smooth charts, responsive for mobile/desktop.

## Order of work

1. Connect Google Sheets + create tabs + migrate exported data
2. Design system + layout + navigation
3. Public pages (dashboard, projects, investors, download)
4. Auth + login
5. Admin features (requests, cashout, users, project management)
6. End-to-end testing of every workflow
