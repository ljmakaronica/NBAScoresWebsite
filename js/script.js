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

        // Get DOM elements
        this.scoreboard = document.getElementById('scoreboard');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.currentDateDisplay = document.getElementById('currentDate');

        // Bind event handlers
        document.getElementById('prevDate').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nextDate').addEventListener('click', () => this.changeDate(1));

        // Initialize calendar
        this.initializeCalendar();
    }

    initializeCalendar() {
        const today = new Date();
        
        // Set initial date based on current date and season bounds
        if (today < SEASON_START) {
            this.selectedDate = new Date(SEASON_START);
        } else if (today > SEASON_END) {
            this.selectedDate = new Date(SEASON_END);
        } else {
            this.selectedDate = new Date(today);
        }

        // Set time to noon to avoid timezone issues
        this.selectedDate.setHours(12, 0, 0, 0);

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    changeDate(delta) {
        this.selectedDate.setDate(this.selectedDate.getDate() + delta);

        // Keep date within season bounds
        if (this.selectedDate < SEASON_START) {
            this.selectedDate = new Date(SEASON_START);
        } else if (this.selectedDate > SEASON_END) {
            this.selectedDate = new Date(SEASON_END);
        }

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    renderCalendar() {
        // Update date display
        this.currentDateDisplay.textContent = this.selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
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
        } catch (error) {
            console.error('Error loading games:', error);
            this.showError('Failed to load games. Please try again later.');
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
                    <div class="team-logo ${TEAM_LOGOS[game.home_team.full_name]}"></div>
                    <span class="team-name">${game.home_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.home_team_score > game.visitor_team_score ? 'winner' : ''}">
                    ${status.isComplete ? game.home_team_score : ''}
                </div>
            </div>
            <div class="team-row">
                <div class="team-info">
                    <div class="team-logo ${TEAM_LOGOS[game.visitor_team.full_name]}"></div>
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NBASchedule();
});