# games folder

Every folder in here shows up on the saucer games page automatically when you push to GitHub (Vercel rebuilds the site).

## Add a game

1. Make a new folder, e.g. `games/my-cool-game/`. The folder name becomes the game's link (`#my-cool-game`).
2. Put the game's main page in it as **`index.html`**. Any other files it needs (scripts, images, sounds) can go in the same folder.
3. Optional: add **`game.json`** to set how it looks on the games page:

   ```json
   {
     "name": "My Cool Game",
     "description": "One short line about the game.",
     "controls": "Arrow keys to move, Space to jump.",
     "color": "#ec4899"
   }
   ```

4. Optional: add a **`thumbnail.png`** (or .jpg / .webp / .gif), ideally 16:9, to show on the game's card.
5. Commit and push. The game appears on the site after Vercel finishes building.

Only add games you made yourself or have permission to share.
