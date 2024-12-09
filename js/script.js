// Constants and configuration
const TEAM_LOGOS = {
    'Atlanta Hawks': 'team-logo atlanta-hawks',
    'Boston Celtics': 'team-logo boston-celtics',
    'Brooklyn Nets': 'team-logo brooklyn-nets',
    'Charlotte Hornets': 'team-logo charlotte-hornets',
    'Chicago Bulls': 'team-logo chicago-bulls',
    'Cleveland Cavaliers': 'team-logo cleveland-cavaliers',
    'Dallas Mavericks': 'team-logo dallas-mavericks',
    'Denver Nuggets': 'team-logo denver-nuggets',
    'Detroit Pistons': 'team-logo detroit-pistons',
    'Golden State Warriors': 'team-logo golden-state-warriors',
    'Houston Rockets': 'team-logo houston-rockets',
    'Indiana Pacers': 'team-logo indiana-pacers',
    'LA Clippers': 'team-logo la-clippers',
    'Los Angeles Lakers': 'team-logo los-angeles-lakers',
    'Memphis Grizzlies': 'team-logo memphis-grizzlies',
    'Miami Heat': 'team-logo miami-heat',
    'Milwaukee Bucks': 'team-logo milwaukee-bucks',
    'Minnesota Timberwolves': 'team-logo minnesota-timberwolves',
    'New Orleans Pelicans': 'team-logo new-orleans-pelicans',
    'New York Knicks': 'team-logo new-york-knicks',
    'Oklahoma City Thunder': 'team-logo oklahoma-city-thunder',
    'Orlando Magic': 'team-logo orlando-magic',
    'Philadelphia 76ers': 'team-logo philadelphia-76ers',
    'Phoenix Suns': 'team-logo phoenix-suns',
    'Portland Trail Blazers': 'team-logo portland-trail-blazers',
    'Sacramento Kings': 'team-logo sacramento-kings',
    'San Antonio Spurs': 'team-logo san-antonio-spurs',
    'Toronto Raptors': 'team-logo toronto-raptors',
    'Utah Jazz': 'team-logo utah-jazz',
    'Washington Wizards': 'team-logo washington-wizards'
};

const SEASON_START = new Date('2024-10-22');
const SEASON_END = new Date('2025-04-13');

class NBASchedule {
    constructor() {
        // Initialize state
        this.isLoading = false;
        this.selectedDate = null;
        this.displayStartDate = null; // The start date of the visible window of days

        // Determine how many days to show based on screen width
        this.daysToShow = window.innerWidth >= 1200 ? 14 : 7;

        // Get DOM elements
        this.scoreboard = document.getElementById('scoreboard');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.weekContainer = document.getElementById('weekContainer');
        this.dateDisplay = document.getElementById('date-display');

        // Bind event handlers
        document.getElementById('prevDate').addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('nextDate').addEventListener('click', () => this.changeWeek(1));

        // Initialize calendar
        this.initializeCalendar();
    }

    initializeCalendar() {
        const today = new Date();
        
        // Clamp today within season
        let initialDate;
        if (today < SEASON_START) {
            initialDate = new Date(SEASON_START);
        } else if (today > SEASON_END) {
            initialDate = new Date(SEASON_END);
        } else {
            initialDate = new Date(today);
        }

        initialDate.setHours(12, 0, 0, 0);

        // The selectedDate will be today's date (within season bounds)
        this.selectedDate = initialDate;

        // Center the visible range on the selected date
        const halfRange = Math.floor(this.daysToShow / 2);
        this.displayStartDate = new Date(this.selectedDate);
        this.displayStartDate.setDate(this.displayStartDate.getDate() - halfRange);

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    changeWeek(delta) {
        // Move the entire date range by the number of days displayed (like shifting by a full "window")
        this.displayStartDate.setDate(this.displayStartDate.getDate() + delta * this.daysToShow);

        // Adjust selected date accordingly to stay in the middle
        this.selectedDate.setDate(this.selectedDate.getDate() + delta * this.daysToShow);

        // Clamp within season bounds
        if (this.selectedDate < SEASON_START) {
            this.selectedDate = new Date(SEASON_START);
            const halfRange = Math.floor(this.daysToShow / 2);
            this.displayStartDate = new Date(this.selectedDate);
            this.displayStartDate.setDate(this.displayStartDate.getDate() - halfRange);
        } else if (this.selectedDate > SEASON_END) {
            this.selectedDate = new Date(SEASON_END);
            const halfRange = Math.floor(this.daysToShow / 2);
            this.displayStartDate = new Date(this.selectedDate);
            this.displayStartDate.setDate(this.displayStartDate.getDate() - halfRange);
        }

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    // Renders the multiple-day range in the calendar
    renderCalendar() {
        this.weekContainer.innerHTML = '';

        const today = new Date();
        today.setHours(12,0,0,0);

        for (let i = 0; i < this.daysToShow; i++) {
            const dayDate = new Date(this.displayStartDate);
            dayDate.setDate(this.displayStartDate.getDate() + i);

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';

            // Highlight today if it's that day
            if (dayDate.toDateString() === today.toDateString()) {
                dayEl.classList.add('today');
            }

            // Highlight selected day
            if (dayDate.toDateString() === this.selectedDate.toDateString()) {
                dayEl.classList.add('selected');
            }

            const dayName = document.createElement('div');
            dayName.className = 'day-name';
            dayName.textContent = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayDate.getDate();

            dayEl.appendChild(dayName);
            dayEl.appendChild(dayNumber);

            // Click event to select that date
            dayEl.addEventListener('click', () => {
                this.selectedDate = new Date(dayDate);

                // Ensure selectedDate is within season
                if (this.selectedDate < SEASON_START) {
                    this.selectedDate = new Date(SEASON_START);
                } else if (this.selectedDate > SEASON_END) {
                    this.selectedDate = new Date(SEASON_END);
                }

                this.renderCalendar();
                this.loadGamesForDate(this.formatDate(this.selectedDate));
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
            const response = await fetch(`/api/games?start_date=${date}&end_date=${date}&per_page=100`);
            if (!response.ok) throw new Error('Failed to fetch games');
            
            const data = await response.json();
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
