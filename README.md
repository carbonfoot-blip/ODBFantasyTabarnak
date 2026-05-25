# ODB Fantasy 2026 — Draft Tool

A player research and team-building tool for the ODB Fantasy 2026 poker league (25KFantasy).

## Features

- 🔍 Fast-follow search across all 480+ players in the database
- 📊 Year-by-year scoring history fetched live from 25KFantasy via Claude AI
- 💰 Budget tracker for your 8-player team + 1 bonus pick
- ⭐ ODB Bonus-eligible players flagged in search
- 📈 5-year rolling average projections per player and for the full team
- 💾 All data cached in localStorage — no re-fetching needed

## Setup

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com) (for fetching player stats)

### Install & run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Build for production

```bash
npm run build
```

### Deploy to GitHub Pages

1. Update `package.json` → set `"homepage"` to your GitHub Pages URL:
   ```json
   "homepage": "https://YOUR-USERNAME.github.io/YOUR-REPO-NAME"
   ```

2. Run:
   ```bash
   npm run deploy
   ```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch automatically.

3. In your GitHub repo → Settings → Pages → set source to `gh-pages` branch.

Your app will be live at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`

## Usage

1. **Set your API key** — paste your Anthropic API key when prompted. It's stored only in your browser.
2. **Search a player** — start typing to filter the list.
3. **Load stats** — click "Load stats from 25KFantasy" to fetch their year-by-year history (costs ~$0.05–0.10 per player via Claude).
4. **Set 2026 cost** — enter the draft price once known; pts/$ updates instantly.
5. **Add to team** — build your 8-player roster + bonus pick.
6. **Set budget** — enter your total budget cap to track spending.

## Scoring notes

Points are as recorded on 25KFantasy. 2026 rule changes:
- Bracelet bonus: flat +25 (no multiplier)
- Low-stakes events (≤$1,500): field size bonus capped at 100 pts, max 81 players

## Tech stack

- React 18 + Vite
- CSS Modules
- Anthropic Claude Sonnet 4 (web search tool) for live scraping
- GitHub Pages for hosting
