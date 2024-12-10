# 2024-25 NBA Scores

A sleek, modern web application that displays NBA game schedules and scores for the 2024-25 season. The website provides an interactive calendar to navigate through game days, along with real-time scoring updates.

**Live Site:** [2024-25-nba-scores.vercel.app](https://2024-25-nba-scores.vercel.app/)

## Features

- **Modern UI & Styling:**  
  Enjoy a clean, dark-themed interface with a minimalist layout.
  
- **Responsive Design:**  
  Fully optimized for desktop and mobile. On desktop/tablet devices, you can navigate weeks at a time with arrows. On mobile devices, swipe horizontally to scroll through dates.
  
- **Automatic "Today" Highlighting:**  
  The calendar loads centered on the current date, making it easy to find and view today's scheduled games at a glance.
  
- **Real-Time Updates:**  
  Scores and game statuses update dynamically. Past games, current games (live), and future matchups are displayed clearly.
  
- **Lazy Loading on Mobile:**  
  To ensure fast load times on mobile, the calendar initially loads a window of dates around today. As you scroll, more dates are seamlessly fetched to prevent performance slowdowns.

## Technologies Used

- **Front-End:**  
  - HTML, CSS (Poppins font, Font Awesome for icons, custom dark theme)
  - Vanilla JavaScript for interactivity and data fetching.
  
- **Data Source:**  
  - Uses an NBA schedule and scores API ([Ball Dont Lie API](https://www.balldontlie.io/)) to fetch game data.
  
- **Deployment:**  
  - Hosted on Vercel for fast, reliable performance.

## How to Use

1. **Explore the Calendar:**  
   On desktop/tablet, navigate using the arrow buttons. On mobile, swipe left/right to scroll through the dates.
   
2. **Select a Date:**  
   Clicking (or tapping) on a date highlights it and loads the games for that day in the scoreboard below.
   
3. **View Scores & Statuses:**  
   The scoreboard shows each matchup’s teams, logos, and final or live scores. Completed games display their final scores, while upcoming games show the scheduled time.

## Credits

- [Ball Dont Lie API](https://www.balldontlie.io/) for providing NBA game data.
- [Font Awesome](https://fontawesome.com/) for icons.
- [Google Fonts](https://fonts.google.com/) for the Poppins font.

**Enjoy the games!**
