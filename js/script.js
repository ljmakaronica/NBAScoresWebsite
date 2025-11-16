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

const SEASON_START = new Date('2025-10-15T12:00:00');
const SEASON_END = new Date('2026-06-13T12:00:00');

class NBASchedule {
    constructor() {
        this.isLoading = false;
        this.scoreboard = document.getElementById('scoreboard');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.weekContainer = document.getElementById('weekContainer');
        this.dateDisplay = document.getElementById('date-display');

        // Event delegation for date clicks
        this.weekContainer.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (dayEl && dayEl.dataset.date) {
                const dayDate = new Date(dayEl.dataset.date);
                this.selectedDate = dayDate;
                this.renderCalendar();
                this.loadGamesForDate(this.formatDate(this.selectedDate));
            }
        });

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

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    renderCalendar() {
        this.weekContainer.innerHTML = '';

        const today = new Date();
        today.setHours(12, 0, 0, 0);

        let selectedDayEl = null;
        let currentDate = new Date(SEASON_START);

        // Render ALL dates from season start to end
        while (currentDate <= SEASON_END) {
            const dayEl = this.createDayElement(currentDate, today);
            this.weekContainer.appendChild(dayEl);

            if (this.selectedDate && currentDate.toDateString() === this.selectedDate.toDateString()) {
                selectedDayEl = dayEl;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Scroll to selected date
        if (selectedDayEl) {
            setTimeout(() => {
                selectedDayEl.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
            }, 100);
        }
    }

    createDayElement(dayDate, today) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = dayDate.toISOString();

        const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const month = dayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const dayNum = dayDate.getDate();

        const dayTextEl = document.createElement('div');
        dayTextEl.className = 'day-text';
        dayTextEl.innerHTML = `<div>${weekday}</div><div>${month} ${dayNum}</div>`;

        if (dayDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        if (this.selectedDate && dayDate.toDateString() === this.selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }

        dayEl.appendChild(dayTextEl);

        return dayEl;
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

            const isPastDate = selectedDateObj < today;
            let data;

            if (isPastDate) {
                const cachedData = localStorage.getItem('games_' + date);
                if (cachedData) {
                    data = JSON.parse(cachedData);
                } else {
                    const response = await fetch(`/api/scrape-games?date=${date}`);
                    if (!response.ok) throw new Error('Failed to fetch games');
                    data = await response.json();
                    localStorage.setItem('games_' + date, JSON.stringify(data));
                }
            } else {
                const response = await fetch(`/api/scrape-games?date=${date}`);
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
        } else if (game.status.includes('Qtr') || game.status.includes('Half')) {
            return {
                text: game.status,
                isComplete: false,
                isLive: true
            };
        } else {
            // For upcoming games, use the game.date field
            const gameTime = new Date(game.date);

            // Check if it's a valid date
            if (!isNaN(gameTime.getTime())) {
                return {
                    text: gameTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                    }),
                    isComplete: false,
                    isLive: false
                };
            } else {
                // Fallback to status text
                return {
                    text: game.status,
                    isComplete: false,
                    isLive: false
                };
            }
        }
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
