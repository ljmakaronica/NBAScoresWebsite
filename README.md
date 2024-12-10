# 2024-25 NBA Scores

A sleek, modern web application that displays NBA game schedules and scores for the 2024-25 season. The website provides an interactive calendar to navigate through game days, with real-time scoring updates and smart caching strategies to ensure fast, efficient performance.

**Live Site:** [2024-25-nba-scores.vercel.app](https://2024-25-nba-scores.vercel.app/)

## Features

- **Modern UI & Styling:**  
  Enjoy a clean, dark-themed interface with a minimalist layout for easy browsing.

- **Responsive Design:**  
  Fully optimized for desktop and mobile devices. On larger screens, navigate by week using arrow buttons. On mobile, horizontally scroll (swipe) through dates, with lazy-loading to keep everything snappy.

- **“Today” Centered on Load:**  
  The calendar automatically positions itself to the current date, making it simple to view today’s games at a glance.

- **Real-Time Score Updates:**  
  Scores and game statuses update dynamically, indicating final results, live action, and future matchups.

- **Efficient Caching & Performance:**
  - **Daily Cache:** Frequently requested past dates are cached in `localStorage`, reducing the need for repeated network requests.
  - **On-Demand Fetching:** Only the currently viewed date is fetched from the API on load; no massive data downloads.
  - **Incremental Lazy Loading on Mobile:** Instead of loading the entire season at once, the calendar loads a window of dates around the current day and seamlessly fetches more as you scroll.

- **Loading Indicators:**
  - A smooth loading overlay is displayed while fetching new data, ensuring a polished user experience.

## Technologies Used

- **Front-End:**
  - HTML, CSS (custom dark theme, Poppins font, Font Awesome icons)
  - Vanilla JavaScript for dynamic content, data fetching, and event handling
  
- **Data Source:**
  - [Ball Dont Lie API](https://www.balldontlie.io/) for NBA schedule and game data

- **Deployment:**
  - Hosted on Vercel for fast, reliable performance

## How to Use

1. **Browse the Calendar:**
   - On desktop/tablet, use the arrow buttons to navigate weeks.
   - On mobile, swipe left or right to scroll through available dates.
   
2. **Select a Date:**
   - Click or tap a date to highlight it. The day’s games will load below.

3. **View Scores & Statuses:**
   - The scoreboard displays each matchup’s teams, logos, and final scores.
   - Live games show current status, and future games display their scheduled start times.

4. **Experience Faster Loading Over Time:**
   - Recently viewed past dates will load quicker on subsequent visits due to local caching.
   - As you scroll through dates on mobile, more days load seamlessly in the background.

## Credits

- [Ball Dont Lie API](https://www.balldontlie.io/) for real-time NBA game data.
- [Font Awesome](https://fontawesome.com/) for icons.
- [Google Fonts](https://fonts.google.com/) for the Poppins font.

**Enjoy the season and stay updated with the latest NBA scores!**
