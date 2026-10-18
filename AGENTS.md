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
- Investment history permissions resolve the signed-in Cloud profile ID server-side and allow only that profile or a verified administrator; Sheets investor IDs reference original profile UUIDs.
- List and chart read the same filtered, server-returned transaction model so monthly investment totals match historical rows.
