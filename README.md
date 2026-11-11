# cobalt

A browser games site with games, Cobalt AI, music, a chat room, a coin shop and themes.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo. `vercel.json` already sets the build (`node scripts/build-games.js`, output folder `dist`).
3. Every push rebuilds the site. Any folder in `games/` (with an `index.html`) appears on the Games page. Optional `game.json` sets the name, description, controls and colour; optional `thumbnail.png` sets the card image.

## Turn on accounts, chat, the shop and game requests (Supabase, free plan)

1. Create a project at supabase.com (pick the Sydney region).
2. SQL Editor → New query → paste all of `supabase.sql` → Run.
3. Authentication → URL Configuration: set Site URL to your Vercel address.
4. Project Settings → API: copy the Project URL and the anon/public key into `supabase-config.js`.
5. Push. Sign up on your site (confirm the email), then Settings → Copy ID.
6. Paste that ID into `ownerUid` in `supabase-config.js` and into `supabase.sql` (replace `PASTE_YOUR_USER_ID`), run `supabase.sql` again, and push.

Coins, the daily bonus and buying are handled by the database, so they can't be cheated from the browser.

## Notes

- Flash games: anyone can play a .swf from their device on the Flash player page. You can also put .swf files in `games/` (loose, or in a folder) and they get a Ruffle player page automatically. Ruffle loads from unpkg.com.

- Cobalt AI runs in the visitor's browser with an open model (SmolLM2 360M). The first start downloads about 250 MB.
- Optional Google sign-in: turn on Authentication → Providers → Google in Supabase (needs a Google Cloud OAuth client), then set `google: true` in `supabase-config.js`.
