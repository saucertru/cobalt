# saucer

A browser games site with games, Saucer AI, music, a chat room, a coin shop and themes.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo. `vercel.json` already tells it what to do (build command `node scripts/build-games.js`, output folder `dist`).
3. Every push rebuilds the site, and any new folder in `games/` appears on the games page. See `games/README.md`.

## Notes

- Saucer AI runs in the visitor's browser with an open model (SmolLM2 360M). The first start downloads about 250 MB.
- Accounts, the chat room, the shop and game requests use claude.ai's storage, so they only work in the claude.ai version. On Vercel they show a message instead. Making them work here needs a backend such as Firebase or Supabase.
