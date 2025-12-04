// Team name to ESPN ID mapping
const TEAM_ID_MAP = {
    'Atlanta Hawks': '1',
    'Boston Celtics': '2',
    'New Orleans Pelicans': '3',
    'Chicago Bulls': '4',
    'Cleveland Cavaliers': '5',
    'Dallas Mavericks': '6',
    'Denver Nuggets': '7',
    'Detroit Pistons': '8',
    'Golden State Warriors': '9',
    'Houston Rockets': '10',
    'Indiana Pacers': '11',
    'LA Clippers': '12',
    'Los Angeles Lakers': '13',
    'Miami Heat': '14',
    'Milwaukee Bucks': '15',
    'Minnesota Timberwolves': '16',
    'Brooklyn Nets': '17',
    'New York Knicks': '18',
    'Orlando Magic': '19',
    'Philadelphia 76ers': '20',
    'Phoenix Suns': '21',
    'Portland Trail Blazers': '22',
    'Sacramento Kings': '23',
    'San Antonio Spurs': '24',
    'Oklahoma City Thunder': '25',
    'Toronto Raptors': '28',
    'Memphis Grizzlies': '29',
    'Charlotte Hornets': '30',
    'Utah Jazz': '27',
    'Washington Wizards': '26'
};

class TeamPage {
    constructor() {
        this.teamId = null;
        this.teamData = null;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.teamHeader = document.getElementById('team-header');
        this.teamContent = document.getElementById('team-content');
        this.backButton = document.getElementById('back-button');

        this.backButton.addEventListener('click', () => {
            window.history.back();
        });

        this.initialize();
    }

    initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('id');

        if (!teamId) {
            this.showError('No team specified');
            return;
        }

        this.teamId = teamId;
        this.loadTeamData();
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        this.teamContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    async loadTeamData() {
        this.showLoading(true);
        try {
            const response = await fetch(`/api/team-details?teamId=${this.teamId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch team data');
            }

            this.teamData = await response.json();
            this.renderTeamPage();
        } catch (error) {
            console.error('Error loading team data:', error);
            this.showError('Failed to load team data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    renderTeamPage() {
        if (!this.teamData) return;

        document.title = `${this.teamData.team.name} - NBA`;
        document.getElementById('team-name').textContent = this.teamData.team.name;

        this.renderTeamHeader();
        this.renderTeamContent();
    }

    renderTeamHeader() {
        const { team, record, nextGame } = this.teamData;

        const nextGameHTML = nextGame ? `
            <div class="next-game">
                <span class="next-game-label">Next Game:</span>
                <span class="next-game-info">${nextGame.shortName} - ${this.formatDate(nextGame.date)}</span>
            </div>
        ` : '';

        this.teamHeader.innerHTML = `
            <div class="team-header-content">
                <div class="team-logo-section">
                    <img src="${team.logo}" alt="${team.name}" class="team-logo-large" onerror="this.style.display='none'">
                </div>
                <div class="team-info-section">
                    <h2 class="team-full-name">${team.name}</h2>
                    <div class="team-record-container">
                        <div class="record-item">
                            <span class="record-label">Overall:</span>
                            <span class="record-value">${record.overall}</span>
                        </div>
                        <div class="record-item">
                            <span class="record-label">Home:</span>
                            <span class="record-value">${record.home}</span>
                        </div>
                        <div class="record-item">
                            <span class="record-label">Away:</span>
                            <span class="record-value">${record.away}</span>
                        </div>
                    </div>
                    <div class="team-standing">${record.standing}</div>
                    ${nextGameHTML}
                </div>
            </div>
        `;
    }

    renderTeamContent() {
        this.teamContent.innerHTML = `
            <div class="team-sections">
                <div class="team-section">
                    <h3 class="section-title">Team Statistics</h3>
                    ${this.renderStatistics()}
                </div>
                <div class="team-section">
                    <h3 class="section-title">Game Log</h3>
                    ${this.renderGameLog()}
                </div>
            </div>
        `;
    }

    renderStatistics() {
        const { statistics } = this.teamData;

        if (!statistics || statistics.length === 0) {
            return '<p class="no-data">No statistics available</p>';
        }

        let statsHTML = '<div class="stats-grid">';

        statistics.forEach(category => {
            if (category.stats && category.stats.length > 0) {
                category.stats.forEach(stat => {
                    statsHTML += `
                        <div class="stat-item">
                            <span class="stat-label">${stat.displayName}</span>
                            <span class="stat-value">${stat.displayValue}</span>
                        </div>
                    `;
                });
            }
        });

        statsHTML += '</div>';
        return statsHTML;
    }

    renderGameLog() {
        const { schedule } = this.teamData;

        if (!schedule || !schedule.events || schedule.events.length === 0) {
            return '<p class="no-data">No games available</p>';
        }

        let gameLogHTML = '<div class="game-log-list">';

        // Show completed games first, then upcoming
        const completedGames = schedule.events.filter(event =>
            event.competitions?.[0]?.status?.type?.completed
        ).reverse();

        const upcomingGames = schedule.events.filter(event =>
            !event.competitions?.[0]?.status?.type?.completed
        );

        [...completedGames, ...upcomingGames].forEach(event => {
            const competition = event.competitions?.[0];
            if (!competition) return;

            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isCompleted = competition.status?.type?.completed;

            const result = isCompleted ? this.getGameResult(homeTeam, awayTeam) : 'vs';
            const resultClass = isCompleted ? (result === 'W' ? 'win' : 'loss') : 'upcoming';

            const homeScore = homeTeam.score?.displayValue || homeTeam.score || '0';
            const awayScore = awayTeam.score?.displayValue || awayTeam.score || '0';

            gameLogHTML += `
                <div class="game-log-item ${isCompleted ? 'completed' : 'upcoming'}">
                    <div class="game-date">${this.formatGameDate(event.date)}</div>
                    <div class="game-matchup">
                        <div class="game-opponent">
                            ${awayTeam.team.displayName} @ ${homeTeam.team.displayName}
                        </div>
                        ${isCompleted ? `
                            <div class="game-score">
                                <span class="result ${resultClass}">${result}</span>
                                <span class="score">${awayScore} - ${homeScore}</span>
                            </div>
                        ` : `
                            <div class="game-time">${this.formatGameTime(event.date)}</div>
                        `}
                    </div>
                </div>
            `;
        });

        gameLogHTML += '</div>';
        return gameLogHTML;
    }

    getGameResult(homeTeam, awayTeam) {
        const teamName = this.teamData.team.name;
        const homeScore = parseFloat(homeTeam.score?.value || homeTeam.score?.displayValue || homeTeam.score || 0);
        const awayScore = parseFloat(awayTeam.score?.value || awayTeam.score?.displayValue || awayTeam.score || 0);

        if (homeTeam.team.displayName === teamName) {
            return homeScore > awayScore ? 'W' : 'L';
        } else {
            return awayScore > homeScore ? 'W' : 'L';
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatGameDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatGameTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeamPage();
});
