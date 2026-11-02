# Village Agro rebuild — roadmap

- [x] Inspect original app + export data
- [x] Connect Google Sheets, create 12 tabs, migrate 166 rows
- [ ] Design system (green Bengali theme) + root layout/nav
- [ ] Sheets data layer (server functions via connector gateway)
- [ ] Auth: admin-created users, phone/email+password login, roles
- [ ] Public pages: / dashboard, /projects, /projects/$id, /investors, /download
- [ ] Admin pages: /requests, /admin, /admin/cashout
- [ ] Investor-only financial history with running balances
- [x] Current request: own investment breakdown, detailed list/chart, permission-checked investor profile history
- [x] Current request: all four linked investors and administrators can view every investor profile and history; permission tests pass, signed-in investor sees all four histories and another investor chart, signed-out history blocked
- [x] Complete dated financial breakdown for active/completed projects (shared read-only view; live dataset currently has one completed project)
- [x] Current request: every project's complete history visible to everyone; fixed parent layout hiding details, verified signed-out and signed-in access, 27 expenses, 3 sales, 4 shares, 4 distributions, list filters, chart and narrow layout; 19 tests pass; stored records unchanged
- [ ] Confirmed project-specific profit/loss allocations, consistent summaries and duplicate protection
- [x] Current request: automatically credit/debit investor funds by project on completion and credit the existing ৳20,550 once by recorded percentages
- [ ] Controlled corrections and historical allocation reconciliation
- [ ] End-to-end test requested accounting workflows
