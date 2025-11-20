# NBA Scores

A modern web application for viewing NBA game schedules, live scores, box scores, and standings for the 2025-26 season.

**Live Site:** [2025-26-nba-scores.vercel.app](https://2025-26-nba-scores.vercel.app/)

## Features

### Schedule & Scores
- **Interactive Calendar:** Browse any date in the season with a horizontally scrollable calendar
- **Live Score Updates:** Real-time scores with automatic polling during live games
- **Game Cards:** Clean horizontal layout showing team logos, abbreviations, and scores
- **URL Persistence:** Selected date is saved in URL for easy sharing and refresh

### Box Scores
- **Detailed Stats:** Full player statistics including minutes, FG, 3PT, FT, rebounds, assists, steals, blocks, turnovers, and points
- **Responsive Tables:** Sticky player name column with horizontal scroll for stats
- **Mobile Optimized:** Shortened player names (first initial + last name) on mobile devices

### Standings
- **Conference Standings:** Eastern and Western conference tables
- **Full Stats:** Wins, losses, PCT, GB, home/road records, conference records
- **Visual Indicators:** Playoff and play-in spots highlighted

### Design & UX
- **Dark Theme:** Modern dark UI with accent colors
- **Responsive Design:** Optimized for desktop and mobile
- **Bottom Navigation (Mobile):** Easy access to Schedule and Standings tabs
- **Team Logos:** Sprite-based logos for fast loading
- **Smart Caching:** Efficient data fetching with 1-minute cache for live games

## Technologies

- **Front-End:** HTML, CSS, Vanilla JavaScript
- **Data Source:** ESPN API for real-time game data
- **Fonts:** Poppins (Google Fonts)
- **Deployment:** Vercel

## How to Use

1. **Browse Dates:** Scroll through the calendar to select a date
2. **View Games:** Game cards show matchups with scores and game status
3. **Box Scores:** Click "Box Score" button on any live or completed game
4. **Standings:** Navigate to Standings page via header (desktop) or bottom nav (mobile)

## Credits

- [ESPN](https://www.espn.com/) for NBA game data
- [Google Fonts](https://fonts.google.com/) for Poppins font

---

Made by [markoljuboja.com](https://markoljuboja.com)
