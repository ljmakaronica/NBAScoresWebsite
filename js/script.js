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
        this.liveUpdateTimeout = null;

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
                selectedDayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
        // Only show loading overlay if we're not doing a background update
        if (!this.isBackgroundUpdate) {
            this.loadingOverlay.classList.toggle('visible', show);
        }
    }

    async loadGamesForDate(date) {
        if (this.isLoading) return;

        this.showLoading(true);
        this.isLoading = true;

        // Stop any existing live updates when switching dates
        this.stopLiveUpdates();

        try {
            // Use string comparison for dates to avoid timezone issues
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
            const isToday = date === todayStr;
            const isPastDate = date < todayStr;
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
                const response = await fetch(`/api/scrape-games?date=${date}&t=${Date.now()}`);
                if (!response.ok) throw new Error('Failed to fetch games');
                data = await response.json();

                // If it's today, start smart polling
                if (isToday) {
                    this.scheduleNextUpdate(data.data, date);
                }
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
            this.isBackgroundUpdate = false;
        }
    }

    scheduleNextUpdate(games, date) {
        // Clear any existing timeout
        this.stopLiveUpdates();

        // 1. Check for live games
        const hasLiveGames = games.some(g => {
            const status = this.formatGameStatus(g);
            return status.isLive;
        });

        if (hasLiveGames) {
            // If there are live games, poll every 30 seconds
            console.log('Live games in progress. Scheduling update in 30s.');
            this.liveUpdateTimeout = setTimeout(() => this.fetchUpdate(date), 30000);
            return;
        }

        // 2. Check for upcoming games
        const upcomingGames = games.filter(g => {
            const status = this.formatGameStatus(g);
            return !status.isComplete && !status.isLive;
        });

        if (upcomingGames.length > 0) {
            // Find the earliest start time
            const now = new Date();
            let nextStartTime = null;

            upcomingGames.forEach(g => {
                const gameDate = new Date(g.date);
                if (gameDate > now) {
                    if (!nextStartTime || gameDate < nextStartTime) {
                        nextStartTime = gameDate;
                    }
                }
            });

            if (nextStartTime) {
                // Schedule update for when the next game starts + 1 minute buffer
                const delay = nextStartTime.getTime() - now.getTime() + 60000;
                // Cap the delay at 1 hour to be safe (e.g. if game times change)
                const safeDelay = Math.min(delay, 3600000);

                console.log(`Next game starts at ${nextStartTime.toLocaleTimeString()}. Scheduling update in ${Math.round(safeDelay / 60000)} minutes.`);
                this.liveUpdateTimeout = setTimeout(() => this.fetchUpdate(date), safeDelay);
                return;
            }
        }

        // 3. If all games are final, do nothing (stop polling)
        console.log('All games final or no upcoming games today. Stopping updates.');
    }

    async fetchUpdate(date) {
        try {
            this.isBackgroundUpdate = true;
            // Add timestamp to prevent browser caching
            const response = await fetch(`/api/scrape-games?date=${date}&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                this.displayGames(data.data);
                // Reschedule based on new data
                this.scheduleNextUpdate(data.data, date);
            }
        } catch (error) {
            console.error('Error updating live scores:', error);
            // Retry in 1 minute on error
            this.liveUpdateTimeout = setTimeout(() => this.fetchUpdate(date), 60000);
        } finally {
            this.isBackgroundUpdate = false;
        }
    }

    stopLiveUpdates() {
        if (this.liveUpdateTimeout) {
            clearTimeout(this.liveUpdateTimeout);
            this.liveUpdateTimeout = null;
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

        // Game has started if it's live or complete
        const hasStarted = status.isComplete || status.isLive;

        card.innerHTML = `
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.home_team.full_name]}"></div>
                    <span class="team-name">${game.home_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.home_team_score < game.visitor_team_score ? 'loser' : ''}">
                    ${hasStarted ? game.home_team_score : ''}
                </div>
            </div>
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.visitor_team.full_name]}"></div>
                    <span class="team-name">${game.visitor_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.visitor_team_score < game.home_team_score ? 'loser' : ''}">
                    ${hasStarted ? game.visitor_team_score : ''}
                </div>
            </div>
            <div class="game-status">
                ${status.isLive ? '<div class="live-indicator"></div>' : ''}
                <span>${status.text}</span>
            </div>
            ${hasStarted ? '<div class="box-score-btn">Box Score</div>' : ''}
        `;

        // Add click event to box score button
        if (hasStarted) {
            const btn = card.querySelector('.box-score-btn');
            btn.onclick = () => this.showBoxScore(game.id);
        }

        return card;
    }

    async showBoxScore(gameId) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('box-score-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'box-score-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div id="modal-body">Loading...</div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close button logic
            modal.querySelector('.close-modal').onclick = () => {
                modal.style.display = 'none';
            };

            // Click outside to close
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }

        modal.style.display = 'block';
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const response = await fetch(`/api/game-details?gameId=${gameId}&t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch game details');
            const data = await response.json();

            this.renderBoxScore(data, modalBody);
        } catch (error) {
            console.error('Error loading box score:', error);
            modalBody.innerHTML = '<div class="error-message">Failed to load box score.</div>';
        }
    }

    renderBoxScore(data, container) {
        const { homeTeam, awayTeam, gameInfo } = data;

        const renderPlayerTable = (playerStatsGroups) => {
            // ESPN returns an array of stat groups, usually we want the first one (standard stats)
            if (!playerStatsGroups || playerStatsGroups.length === 0) return '<div class="no-stats">No stats available</div>';

            const statsGroup = playerStatsGroups[0];
            const { names, athletes } = statsGroup;

            return `
                <div class="stats-table-wrapper">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th class="sticky-col">Player</th>
                                <th>MIN</th>
                                <th>FG</th>
                                <th>3PT</th>
                                <th>FT</th>
                                <th>OREB</th>
                                <th>DREB</th>
                                <th>REB</th>
                                <th>AST</th>
                                <th>STL</th>
                                <th>BLK</th>
                                <th>TO</th>
                                <th>PF</th>
                                <th>+/-</th>
                                <th>PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${athletes.map(athleteEntry => {
                const p = athleteEntry.athlete;
                const stats = athleteEntry.stats;

                // Helper to get stat value by name
                const getStat = (abbr) => {
                    const statIndex = names.indexOf(abbr);
                    return statIndex !== -1 ? stats[statIndex] : '-';
                };

                // Check if player played (has minutes)
                const min = getStat('MIN');
                if (!min || min === '0' || min === '--' || athleteEntry.didNotPlay) return '';

                return `
                                    <tr>
                                        <td class="player-name sticky-col">
                                            <span class="name-full">${p.displayName}</span>
                                            <span class="name-short">${p.shortName}</span>
                                        </td>
                                        <td>${min}</td>
                                        <td>${getStat('FG')}</td>
                                        <td>${getStat('3PT')}</td>
                                        <td>${getStat('FT')}</td>
                                        <td>${getStat('OREB')}</td>
                                        <td>${getStat('DREB')}</td>
                                        <td>${getStat('REB')}</td>
                                        <td>${getStat('AST')}</td>
                                        <td>${getStat('STL')}</td>
                                        <td>${getStat('BLK')}</td>
                                        <td>${getStat('TO')}</td>
                                        <td>${getStat('PF')}</td>
                                        <td>${getStat('+/-')}</td>
                                        <td class="stat-pts">${getStat('PTS')}</td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        const isComplete = gameInfo.status === 'Final' || gameInfo.status === 'Final/OT';
        const homeScore = parseInt(homeTeam.score) || 0;
        const awayScore = parseInt(awayTeam.score) || 0;

        container.innerHTML = `
            <div class="box-score-header">
                <!-- Home Team (Left) -->
                <div class="team-header home">
                    <img src="${homeTeam.info.logo}" alt="${homeTeam.info.abbreviation}" class="team-logo-large">
                    <div class="team-details">
                        <h2>${homeTeam.info.displayName}</h2>
                    </div>
                    <div class="score-large ${isComplete && homeScore < awayScore ? 'loser' : ''}">${homeTeam.score || '0'}</div>
                </div>

                <!-- Game Info (Center) -->
                <div class="game-info-large">
                    <div class="game-status-large">${gameInfo.status}</div>
                    <div class="game-clock-large">${gameInfo.clock || ''}</div>
                </div>

                <!-- Away Team (Right) -->
                <div class="team-header away">
                    <div class="score-large ${isComplete && awayScore < homeScore ? 'loser' : ''}">${awayTeam.score || '0'}</div>
                    <div class="team-details">
                        <h2>${awayTeam.info.displayName}</h2>
                    </div>
                    <img src="${awayTeam.info.logo}" alt="${awayTeam.info.abbreviation}" class="team-logo-large">
                </div>
            </div>
            
            <div class="box-score-tabs">
                <button class="tab-btn active" data-tab="home">${homeTeam.info.displayName}</button>
                <button class="tab-btn" data-tab="away">${awayTeam.info.displayName}</button>
            </div>

            <div class="stats-container">
                <div id="stats-home" class="team-stats-view active">
                    ${renderPlayerTable(homeTeam.players)}
                </div>
                <div id="stats-away" class="team-stats-view" style="display: none;">
                    ${renderPlayerTable(awayTeam.players)}
                </div>
            </div>
        `;

        // Add Tab Event Listeners
        const tabs = container.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');

                // Hide all views
                container.querySelectorAll('.team-stats-view').forEach(view => {
                    view.style.display = 'none';
                    view.classList.remove('active');
                });

                // Show selected view
                const team = tab.dataset.tab;
                const view = container.querySelector(`#stats-${team}`);
                view.style.display = 'block';
                // Small timeout to allow display:block to apply before adding opacity class for fade effect
                setTimeout(() => view.classList.add('active'), 10);
            });
        });
    }

    formatGameStatus(game) {
        if (game.status === 'Final') {
            return {
                text: 'Final',
                isComplete: true,
                isLive: false
            };
        } else if (
            game.status.includes('Qtr') ||
            game.status.includes('Half') ||
            game.status.includes('OT') ||
            game.status.match(/\b1st\b/) ||
            game.status.match(/\b2nd\b/) ||
            game.status.match(/\b3rd\b/) ||
            game.status.match(/\b4th\b/)
        ) {
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
        today.setHours(12, 0, 0, 0);

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
