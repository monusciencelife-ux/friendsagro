<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Investor history uses a public page shell with component-called authenticated server functions; no private data is loaded during public prerender.
- Investment history permissions resolve the signed-in Cloud profile ID and administrator role server-side before applying the shared-history access rule; Sheets investor IDs reference original profile UUIDs.
- List and chart read the same filtered, server-returned transaction model so monthly investment totals match historical rows.
- Project history is a read-only view of existing project steps, sales, snapshots and distribution rows; shared pure helpers drive list/chart totals without altering financial records.
