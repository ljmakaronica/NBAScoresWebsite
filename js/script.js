// Constants and configuration
const TEAM_LOGOS = {
    'Portland Trail Blazers': 'team-logo portland-trail-blazers',
    'Milwaukee Bucks': 'team-logo milwaukee-bucks',
    'Memphis Grizzlies': 'team-logo memphis-grizzlies',
    'Dallas Mavericks': 'team-logo dallas-mavericks',
    'San Antonio Spurs': 'team-logo san-antonio-spurs',
    'Chicago Bulls': 'team-logo chicago-bulls',
    'Cleveland Cavaliers': 'team-logo cleveland-cavaliers',
    'Atlanta Hawks': 'team-logo atlanta-hawks',
    'Brooklyn Nets': 'team-logo brooklyn-nets',
    'Phoenix Suns': 'team-logo phoenix-suns',
    'Charlotte Hornets': 'team-logo charlotte-hornets',
    'Boston Celtics': 'team-logo boston-celtics',
    'Miami Heat': 'team-logo miami-heat',
    'Denver Nuggets': 'team-logo denver-nuggets',
    'Oklahoma City Thunder': 'team-logo oklahoma-city-thunder',
    'Utah Jazz': 'team-logo utah-jazz',
    'Sacramento Kings': 'team-logo sacramento-kings',
    'Indiana Pacers': 'team-logo indiana-pacers',
    'Minnesota Timberwolves': 'team-logo minnesota-timberwolves',
    'New York Knicks': 'team-logo new-york-knicks',
    'Los Angeles Lakers': 'team-logo los-angeles-lakers',
    'Orlando Magic': 'team-logo orlando-magic',
    'New Orleans Pelicans': 'team-logo new-orleans-pelicans',
    'Golden State Warriors': 'team-logo golden-state-warriors',
    'Detroit Pistons': 'team-logo detroit-pistons',
    'Toronto Raptors': 'team-logo toronto-raptors',
    'Houston Rockets': 'team-logo houston-rockets',
    'Philadelphia 76ers': 'team-logo philadelphia-76ers',
    'Washington Wizards': 'team-logo washington-wizards',
    'LA Clippers': 'team-logo la-clippers'
};

const SEASON_START = new Date('2024-10-22T12:00:00');
const SEASON_END = new Date('2025-04-13T12:00:00');

class NBASchedule {
    constructor() {
        this.isLoading = false;
        this.selectedDate = null;

        // Dynamically determine how many days to show based on screen width
        const width = window.innerWidth;
        if (width >= 1200) {
            this.daysToShow = 14;
        } else if (width >= 768) {
            this.daysToShow = 7;
        } else {
            // On mobile, show 5 dates and no arrows
            this.daysToShow = 5;
        }

        this.scoreboard = document.getElementById('scoreboard');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.weekContainer = document.getElementById('weekContainer');
        this.dateDisplay = document.getElementById('date-display');

        // Only attach arrow event listeners if not mobile
        if (this.daysToShow > 5) {
            document.getElementById('prevDate').addEventListener('click', (e) => {
                e.preventDefault();
                this.changeWeek(-1);
            });
            document.getElementById('nextDate').addEventListener('click', (e) => {
                e.preventDefault();
                this.changeWeek(1);
            });
        }

        this.initializeCalendar();
    }

    initializeCalendar() {
        const today = new Date();
        
        let initialDate;
        if (today < SEASON_START) {
            initialDate = new Date(SEASON_START);
        } else if (today > SEASON_END) {
            initialDate = new Date(SEASON_END);
        } else {
            initialDate = new Date(today);
        }

        initialDate.setHours(12, 0, 0, 0);

        this.selectedDate = initialDate;

        const halfRange = Math.floor(this.daysToShow / 2);
        this.displayStartDate = new Date(this.selectedDate);
        this.displayStartDate.setDate(this.displayStartDate.getDate() - halfRange);

        this.clampDisplayStartDate();
        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    clampDisplayStartDate() {
        // Ensure the visible range doesn't go before season start or after season end
        if (this.displayStartDate < SEASON_START) {
            this.displayStartDate = new Date(SEASON_START);
        }

        const lastVisibleDay = new Date(this.displayStartDate);
        lastVisibleDay.setDate(lastVisibleDay.getDate() + this.daysToShow - 1);

        if (lastVisibleDay > SEASON_END) {
            const diff = (lastVisibleDay - SEASON_END) / (24*60*60*1000);
            this.displayStartDate.setDate(this.displayStartDate.getDate() - Math.ceil(diff));
            if (this.displayStartDate < SEASON_START) {
                this.displayStartDate = new Date(SEASON_START);
            }
        }
    }

    changeWeek(delta) {
        // Move by daysToShow days
        const newStart = new Date(this.displayStartDate);
        newStart.setDate(newStart.getDate() + delta * this.daysToShow);

        const lastVisibleDay = new Date(newStart);
        lastVisibleDay.setDate(lastVisibleDay.getDate() + this.daysToShow - 1);

        if (newStart < SEASON_START && lastVisibleDay < SEASON_START) {
            // Can't move before start of season
            return;
        }
        if (lastVisibleDay > SEASON_END && newStart > SEASON_END) {
            // Can't move beyond end of season
            return;
        }

        this.displayStartDate = newStart;
        this.clampDisplayStartDate();
        this.renderCalendar();
    }

    renderCalendar() {
        this.weekContainer.innerHTML = '';

        const today = new Date();
        today.setHours(12,0,0,0);

        for (let i = 0; i < this.daysToShow; i++) {
            const dayDate = new Date(this.displayStartDate);
            dayDate.setDate(this.displayStartDate.getDate() + i);

            // Don't render days beyond the season
            if (dayDate < SEASON_START || dayDate > SEASON_END) {
                continue;
            }

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';

            const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const month = dayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const dayNum = dayDate.getDate();

            const dayTextEl = document.createElement('div');
            dayTextEl.className = 'day-text';
            // Ensure weekday on top and month/day below
            dayTextEl.innerHTML = `<div>${weekday}</div><div>${month} ${dayNum}</div>`;

            if (dayDate.toDateString() === today.toDateString()) {
                dayEl.classList.add('today');
            }

            if (this.selectedDate && dayDate.toDateString() === this.selectedDate.toDateString()) {
                dayEl.classList.add('selected');
            }

            dayEl.appendChild(dayTextEl);

            // Clicking a day changes selectedDate and loads games
            dayEl.addEventListener('click', () => {
                if (dayDate >= SEASON_START && dayDate <= SEASON_END) {
                    this.selectedDate = new Date(dayDate);
                    this.renderCalendar();
                    this.loadGamesForDate(this.formatDate(this.selectedDate));
                }
            });

            this.weekContainer.appendChild(dayEl);
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('visible', show);
    }

    async loadGamesForDate(date) {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.isLoading = true;

        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            const selectedDateObj = new Date(date);
            selectedDateObj.setHours(12,0,0,0);

            // Check if date is in the past
            const isPastDate = selectedDateObj < today;
            let data;

            if (isPastDate) {
                // Try loading from localStorage
                const cachedData = localStorage.getItem('games_' + date);
                if (cachedData) {
                    data = JSON.parse(cachedData);
                } else {
                    // Fetch from server if not in cache
                    const response = await fetch(`/api/games?start_date=${date}&end_date=${date}&per_page=100`);
                    if (!response.ok) throw new Error('Failed to fetch games');
                    data = await response.json();

                    // Store in localStorage
                    localStorage.setItem('games_' + date, JSON.stringify(data));
                }
            } else {
                // For today's or future games, just fetch from server
                const response = await fetch(`/api/games?start_date=${date}&end_date=${date}&per_page=100`);
                if (!response.ok) throw new Error('Failed to fetch games');
                data = await response.json();
            }

            this.displayGames(data.data);
            this.updateDateDisplay();

        } catch (error) {
            console.error('Error loading games:', error);
            this.showError('Failed to load games. Please try again later.');
            this.updateDateDisplay();
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    displayGames(games) {
        this.scoreboard.innerHTML = '';
        
        if (games.length === 0) {
            const noGames = document.createElement('div');
            noGames.className = 'no-games';
            noGames.textContent = 'No games scheduled for this date';
            this.scoreboard.appendChild(noGames);
            return;
        }

        const gamesGrid = document.createElement('div');
        gamesGrid.className = 'games-grid';

        games.sort((a, b) => new Date(a.status) - new Date(b.status))
             .forEach(game => {
                 gamesGrid.appendChild(this.createGameCard(game));
             });

        this.scoreboard.appendChild(gamesGrid);
    }

    createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        const status = this.formatGameStatus(game);
        
        card.innerHTML = `
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.home_team.full_name]}"></div>
                    <span class="team-name">${game.home_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.home_team_score > game.visitor_team_score ? 'winner' : ''}">
                    ${status.isComplete ? game.home_team_score : ''}
                </div>
            </div>
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.visitor_team.full_name]}"></div>
                    <span class="team-name">${game.visitor_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.visitor_team_score > game.home_team_score ? 'winner' : ''}">
                    ${status.isComplete ? game.visitor_team_score : ''}
                </div>
            </div>
            <div class="game-status">
                ${status.isLive ? '<div class="live-indicator"></div>' : ''}
                <span>${status.text}</span>
            </div>
        `;
        
        return card;
    }

    formatGameStatus(game) {
        if (game.status === 'Final') {
            return { 
                text: 'Final', 
                isComplete: true,
                isLive: false
            };
        } else if (game.status.includes('T')) {
            const gameTime = new Date(game.status);
            return { 
                text: gameTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    timeZone: 'America/Chicago'
                }), 
                isComplete: false,
                isLive: false
            };
        } else if (game.status.includes('Qtr')) {
            return { 
                text: game.status, 
                isComplete: false,
                isLive: true
            };
        }
        return { 
            text: game.status, 
            isComplete: false,
            isLive: false
        };
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.scoreboard.appendChild(errorDiv);
    }

    updateDateDisplay() {
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const fullDateStr = this.selectedDate.toLocaleDateString('en-US', dateOptions);
        const today = new Date();
        today.setHours(12,0,0,0);
        
        let displayStr = fullDateStr;
        if (this.selectedDate.toDateString() === today.toDateString()) {
            displayStr += ' (Today)';
        }

        this.dateDisplay.textContent = displayStr;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NBASchedule();
});
