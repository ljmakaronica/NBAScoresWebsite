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

        // Bind resize event
        window.addEventListener('resize', () => {
            this.adjustColumnHeights();
        });
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
        const { team, record, schedule } = this.teamData;

        // Find next game
        const nextGame = schedule?.events?.find(event =>
            !event.competitions?.[0]?.status?.type?.completed
        );

        let nextGameHTML = '';
        if (nextGame) {
            const competition = nextGame.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isHome = homeTeam.team.displayName === team.name;
            const opponent = isHome ? awayTeam.team : homeTeam.team;
            const opponentLogo = opponent.logo;
            const vsAt = isHome ? 'vs' : '@';

            nextGameHTML = `
                <div class="next-game-prominent">
                    <div class="next-game-label-prominent">NEXT GAME</div>
                    <div class="next-game-matchup">
                        <img src="${opponentLogo}" alt="${opponent.displayName}" class="next-game-logo" onerror="this.style.display='none'">
                        <div class="next-game-details">
                            <div class="next-game-opponent-prominent">${vsAt} ${opponent.displayName}</div>
                            <div class="next-game-datetime">
                                <i class="far fa-calendar"></i> ${this.formatGameDate(nextGame.date)} • <i class="far fa-clock"></i> ${this.formatGameTime(nextGame.date)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        this.teamHeader.innerHTML = `
            <div class="team-header-content">
                <div class="team-header-left">
                    <img src="${team.logo}" alt="${team.name}" class="team-logo-compact" onerror="this.style.display='none'">
                    <div class="team-info-compact">
                        <h2 class="team-name-compact">${team.name}</h2>
                        <div class="team-standing-compact">${record.standing}</div>
                    </div>
                </div>
                <div class="team-header-center">
                    ${nextGameHTML || '<div class="no-upcoming-game">No upcoming games scheduled</div>'}
                </div>
                <div class="team-header-right">
                    <div class="records-inline">
                        <div class="record-inline">
                            <span class="record-value-inline">${record.overall}</span>
                            <span class="record-label-inline">Overall</span>
                        </div>
                        <div class="record-inline">
                            <span class="record-value-inline">${record.home}</span>
                            <span class="record-label-inline">Home</span>
                        </div>
                        <div class="record-inline">
                            <span class="record-value-inline">${record.away}</span>
                            <span class="record-label-inline">Away</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTeamContent() {
        this.teamContent.innerHTML = `
            <div class="team-layout">
                <div class="gamelog-column">
                    <h3 class="section-title">Game Log</h3>
                    ${this.renderGameLog()}
                </div>
                <div class="stats-column">
                    <h3 class="section-title">Roster</h3>
                    ${this.renderRoster()}
                    <h3 class="section-title" style="margin-top: 1.5rem;">Team Statistics</h3>
                    ${this.renderStatistics()}
                </div>
            </div>
        `;

        // Add click listeners to game log items
        this.setupGameLogListeners();

        // Adjust heights
        // Small delay to ensure rendering is complete
        setTimeout(() => this.adjustColumnHeights(), 0);
    }

    setupGameLogListeners() {
        const gameLogItems = document.querySelectorAll('.game-log-item[data-game-id]');
        gameLogItems.forEach(item => {
            // Only add click listener for completed games
            if (item.classList.contains('completed')) {
                item.addEventListener('click', () => {
                    const gameId = item.getAttribute('data-game-id');
                    if (gameId) {
                        this.showBoxScore(gameId);
                    }
                });
            }
        });
    }

    adjustColumnHeights() {
        const statsColumn = this.teamContent.querySelector('.stats-column');
        const gameLogColumn = this.teamContent.querySelector('.gamelog-column');

        if (statsColumn && gameLogColumn) {
            // Reset height first to get natural height if needed, or just measure stats
            gameLogColumn.style.height = 'auto';

            // Only apply fixed height on desktop (when side-by-side)
            if (window.innerWidth > 968) { // Matching the media query breakpoint
                const height = statsColumn.offsetHeight;
                gameLogColumn.style.height = `${height}px`;
            } else {
                gameLogColumn.style.height = 'auto';
                gameLogColumn.style.maxHeight = '500px'; // Restore mobile max-height
            }
        }
    }

    renderStatistics() {
        const { statistics } = this.teamData;

        if (!statistics || statistics.length === 0) {
            return '<p class="no-data">No statistics available</p>';
        }

        let statsHTML = '<div class="stats-categories-compact">';

        statistics.forEach(category => {
            if (category.stats && category.stats.length > 0) {
                statsHTML += `<h4 class="category-title-compact">${category.displayName}</h4><div class="stats-grid-compact">`;

                category.stats.forEach(stat => {
                    statsHTML += `
                        <div class="stat-item-compact">
                            <span class="stat-label-compact">${stat.shortDisplayName || stat.displayName}</span>
                            <span class="stat-value-compact">${stat.displayValue}</span>
                        </div>
                    `;
                });

                statsHTML += `</div>`;
            }
        });

        statsHTML += '</div>';
        return statsHTML;
    }

    renderRoster() {
        const { roster } = this.teamData;

        if (!roster || roster.length === 0) {
            return '<p class="no-data">No roster available</p>';
        }

        let rosterHTML = '<div class="roster-grid-compact">';

        roster.forEach(athlete => {
            const player = athlete;
            const position = player.position?.abbreviation || 'N/A';
            const jersey = player.jersey || '--';
            const displayName = player.displayName || player.fullName || 'Unknown';
            const playerId = player.id;

            // Get stats if available
            const stats = player.statistics?.[0]?.stats || [];
            const ppg = stats.find(s => s.abbreviation === 'PPG')?.displayValue || '--';
            const rpg = stats.find(s => s.abbreviation === 'RPG')?.displayValue || '--';
            const apg = stats.find(s => s.abbreviation === 'APG')?.displayValue || '--';

            rosterHTML += `
                <a href="player.html?id=${playerId}" class="roster-player-card">
                    <div class="roster-player-header">
                        <span class="roster-jersey">#${jersey}</span>
                        <div class="roster-player-info">
                            <span class="roster-player-name">${displayName}</span>
                            <span class="roster-player-position">${position}</span>
                        </div>
                    </div>
                    ${ppg !== '--' || rpg !== '--' || apg !== '--' ? `
                        <div class="roster-player-stats">
                            <span class="roster-stat"><span class="roster-stat-label">PPG:</span> ${ppg}</span>
                            <span class="roster-stat"><span class="roster-stat-label">RPG:</span> ${rpg}</span>
                            <span class="roster-stat"><span class="roster-stat-label">APG:</span> ${apg}</span>
                        </div>
                    ` : ''}
                </a>
            `;
        });

        rosterHTML += '</div>';
        return rosterHTML;
    }

    renderGameLog() {
        const { schedule } = this.teamData;

        if (!schedule || !schedule.events || schedule.events.length === 0) {
            return '<p class="no-data">No games available</p>';
        }

        let gameLogHTML = '<div class="game-log-list">';

        // Separate games
        const completedGames = schedule.events.filter(event =>
            event.competitions?.[0]?.status?.type?.completed
        ).reverse();

        const upcomingGames = schedule.events.filter(event =>
            !event.competitions?.[0]?.status?.type?.completed
        );

        // Next game is first upcoming, then completed games, then rest of upcoming
        const nextGame = upcomingGames.length > 0 ? [upcomingGames[0]] : [];
        const futureGames = upcomingGames.slice(1);
        const orderedGames = [...nextGame, ...completedGames, ...futureGames];

        orderedGames.forEach(event => {
            const competition = event.competitions?.[0];
            if (!competition) return;

            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isCompleted = competition.status?.type?.completed;

            const result = isCompleted ? this.getGameResult(homeTeam, awayTeam) : 'vs';
            const resultClass = isCompleted ? (result === 'W' ? 'win' : 'loss') : 'upcoming';

            const homeScore = homeTeam.score?.displayValue || homeTeam.score || '0';
            const awayScore = awayTeam.score?.displayValue || awayTeam.score || '0';

            const isHome = homeTeam.team.displayName === this.teamData.team.name;
            const opponent = isHome ? awayTeam.team.displayName : homeTeam.team.displayName;
            const vsAt = isHome ? 'vs' : '@';

            // Extract ESPN game ID from the event ID
            const gameId = event.id;

            gameLogHTML += `
                <div class="game-log-item ${isCompleted ? `completed ${resultClass}` : 'upcoming'}" data-game-id="${gameId}" ${isCompleted ? 'style="cursor: pointer;"' : ''}>
                    <div class="game-left">
                        <div class="game-date-compact">${this.formatGameDate(event.date)}</div>
                        <div class="game-opponent-compact">${vsAt} ${opponent}</div>
                    </div>
                    ${isCompleted ? `
                        <div class="game-right">
                            <span class="result-compact ${resultClass}">${result}</span>
                            <span class="score-compact">${isHome ? homeScore : awayScore}-${isHome ? awayScore : homeScore}</span>
                        </div>
                    ` : `
                        <div class="game-right">
                            <span class="game-time-compact">${this.formatGameTime(event.date)}</span>
                        </div>
                    `}
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

        // Skeleton Loader HTML
        modalBody.innerHTML = `
            <div class="box-score-skeleton">
                <div class="skeleton-header">
                    <div class="skeleton-team">
                        <div class="skeleton-logo"></div>
                        <div class="skeleton-name"></div>
                        <div class="skeleton-score"></div>
                    </div>
                    <div class="skeleton-info">
                        <div class="skeleton-status"></div>
                        <div class="skeleton-clock"></div>
                    </div>
                    <div class="skeleton-team">
                        <div class="skeleton-score"></div>
                        <div class="skeleton-name"></div>
                        <div class="skeleton-logo"></div>
                    </div>
                </div>
                <div class="skeleton-tabs">
                    <div class="skeleton-tab"></div>
                    <div class="skeleton-tab"></div>
                </div>
                <div class="skeleton-table">
                    <div class="skeleton-row header"></div>
                    <div class="skeleton-row"></div>
                    <div class="skeleton-row"></div>
                    <div class="skeleton-row"></div>
                    <div class="skeleton-row"></div>
                    <div class="skeleton-row"></div>
                </div>
            </div>
        `;

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
            if (!playerStatsGroups || playerStatsGroups.length === 0) return '<div class="no-stats">No stats available</div>';

            const statsGroup = playerStatsGroups[0];
            const { names, athletes } = statsGroup;

            return `
                <div class="stats-table-wrapper">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th class="sticky-col">Player</th>
                                <th>PTS</th>
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
                            </tr>
                        </thead>
                        <tbody>
                            ${athletes.map(athleteEntry => {
                const p = athleteEntry.athlete;
                const stats = athleteEntry.stats;

                const getStat = (abbr) => {
                    const statIndex = names.indexOf(abbr);
                    return statIndex !== -1 ? stats[statIndex] : '-';
                };

                const min = getStat('MIN');
                if (!min || min === '0' || min === '--' || athleteEntry.didNotPlay) return '';

                return `
                                    <tr>
                                        <td class="player-name sticky-col">
                                            <a href="player.html?id=${p.id}" class="player-name-link">
                                                <span class="name-full">${p.displayName}</span>
                                                <span class="name-short">${p.shortName}</span>
                                            </a>
                                        </td>
                                        <td class="stat-pts">${getStat('PTS')}</td>
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
                <div class="team-header home">
                    <a href="team.html?id=${TEAM_ID_MAP[homeTeam.info.displayName]}" class="team-logo-link">
                        <img src="${homeTeam.info.logo}" alt="${homeTeam.info.abbreviation}" class="team-logo-large">
                    </a>
                    <div class="team-details">
                        <h2><a href="team.html?id=${TEAM_ID_MAP[homeTeam.info.displayName]}" class="team-link">${homeTeam.info.displayName}</a></h2>
                    </div>
                    <div class="score-large ${isComplete && homeScore < awayScore ? 'loser' : ''}">${homeTeam.score || '0'}</div>
                </div>

                <div class="game-info-large">
                    <div class="game-status-large">${gameInfo.status}</div>
                    <div class="game-clock-large">${gameInfo.clock || ''}</div>
                    ${gameInfo.broadcasts && gameInfo.broadcasts.length > 0 ? `<div class="broadcast-info-large">${gameInfo.broadcasts.join(', ')}</div>` : ''}
                </div>

                <div class="team-header away">
                    <div class="score-large ${isComplete && awayScore < homeScore ? 'loser' : ''}">${awayTeam.score || '0'}</div>
                    <div class="team-details">
                        <h2><a href="team.html?id=${TEAM_ID_MAP[awayTeam.info.displayName]}" class="team-link">${awayTeam.info.displayName}</a></h2>
                    </div>
                    <a href="team.html?id=${TEAM_ID_MAP[awayTeam.info.displayName]}" class="team-logo-link">
                        <img src="${awayTeam.info.logo}" alt="${awayTeam.info.abbreviation}" class="team-logo-large">
                    </a>
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
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetTab = tab.getAttribute('data-tab');
                container.querySelectorAll('.team-stats-view').forEach(view => {
                    view.style.display = 'none';
                    view.classList.remove('active');
                });

                const targetView = container.querySelector(`#stats-${targetTab}`);
                if (targetView) {
                    targetView.style.display = 'block';
                    targetView.classList.add('active');
                }
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeamPage();
});
