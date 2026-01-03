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
            this.renderPage();
        } catch (error) {
            console.error('Error loading team data:', error);
            this.showError('Failed to load team data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    renderPage() {
        if (!this.teamData) return;

        const { team, record } = this.teamData;
        document.title = `${team.name} - NBA`;
        document.getElementById('team-name').textContent = team.name;

        this.renderHeader();
        this.renderContent();
    }

    renderHeader() {
        const { team, record } = this.teamData;

        this.teamHeader.innerHTML = `
            <div class="team-page-header">
                <img src="${team.logo}" alt="${team.name}" class="team-page-logo">
                <div class="team-page-info">
                    <h1 class="team-page-name">${team.name}</h1>
                    <div class="team-page-record">
                        <span class="record-value">${record.overall}</span>
                        <span class="record-separator">•</span>
                        <span class="record-standing">${record.standing}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderContent() {
        this.teamContent.innerHTML = `
            <div class="team-page-grid">
                <div class="team-page-main">
                    <section class="team-section">
                        <h2 class="team-section-title">Recent Games</h2>
                        ${this.renderGameLog()}
                    </section>
                </div>
                <div class="team-page-sidebar">
                    <section class="team-section">
                        <h2 class="team-section-title">Roster</h2>
                        ${this.renderRoster()}
                    </section>
                </div>
            </div>
        `;

        this.setupGameLogListeners();
    }

    renderGameLog() {
        const { schedule, team } = this.teamData;

        if (!schedule || !schedule.events || schedule.events.length === 0) {
            return '<p class="no-data">No games available</p>';
        }

        // Get completed games, most recent first
        const completedGames = schedule.events
            .filter(event => event.competitions?.[0]?.status?.type?.completed)
            .slice(-10)
            .reverse();

        if (completedGames.length === 0) {
            return '<p class="no-data">No completed games yet</p>';
        }

        let html = '<div class="game-log-list">';

        completedGames.forEach(game => {
            const competition = game.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isHome = homeTeam.team.displayName === team.name;
            const opponent = isHome ? awayTeam.team : homeTeam.team;
            const vsAt = isHome ? 'vs' : '@';

            const homeScore = parseInt(homeTeam.score?.displayValue || homeTeam.score || 0);
            const awayScore = parseInt(awayTeam.score?.displayValue || awayTeam.score || 0);
            const teamScore = isHome ? homeScore : awayScore;
            const opponentScore = isHome ? awayScore : homeScore;
            const won = teamScore > opponentScore;

            const gameDate = new Date(game.date);
            const dateStr = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            html += `
                <div class="game-log-item" data-game-id="${game.id}">
                    <div class="game-log-date">${dateStr}</div>
                    <div class="game-log-matchup">
                        <span class="game-log-vsat">${vsAt}</span>
                        <span class="game-log-opponent">${opponent.abbreviation}</span>
                    </div>
                    <div class="game-log-result ${won ? 'win' : 'loss'}">
                        <span class="game-log-wl">${won ? 'W' : 'L'}</span>
                        <span class="game-log-score">${teamScore}-${opponentScore}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    renderRoster() {
        const { roster } = this.teamData;

        if (!roster || roster.length === 0) {
            return '<p class="no-data">No roster available</p>';
        }

        let html = '<div class="roster-list">';

        roster.forEach(player => {
            const position = player.position?.abbreviation || '--';
            const jersey = player.jersey || '--';
            const displayName = player.displayName || player.fullName || 'Unknown';
            const playerId = player.id;

            html += `
                <div class="roster-item" data-player-id="${playerId}">
                    <span class="roster-jersey">#${jersey}</span>
                    <a href="/player.html?id=${playerId}" class="roster-name player-link">${displayName}</a>
                    <span class="roster-pos">${position}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    setupGameLogListeners() {
        const gameItems = document.querySelectorAll('.game-log-item[data-game-id]');
        gameItems.forEach(item => {
            item.addEventListener('click', () => {
                const gameId = item.dataset.gameId;
                this.openBoxScoreModal(gameId);
            });
        });
    }

    async openBoxScoreModal(gameId) {
        let modal = document.getElementById('box-score-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'box-score-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div id="box-score-container">Loading...</div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        modal.style.display = 'block';
        const container = document.getElementById('box-score-container');
        container.innerHTML = '<div class="loading-text">Loading box score...</div>';

        try {
            const response = await fetch(`/api/game-details?gameId=${gameId}`);
            if (!response.ok) throw new Error('Failed to fetch game details');

            const data = await response.json();
            this.renderBoxScore(data, container);
        } catch (error) {
            console.error('Error loading box score:', error);
            container.innerHTML = '<p class="error-message">Failed to load box score</p>';
        }
    }

    renderBoxScore(data, container) {
        const { gameInfo, homeTeam, awayTeam } = data;

        const renderPlayerTable = (players) => {
            if (!players || players.length === 0) {
                return '<p class="no-data">No player stats available</p>';
            }

            const statsGroup = players[0];
            if (!statsGroup || !statsGroup.athletes) {
                return '<p class="no-data">No player stats available</p>';
            }

            const athletes = statsGroup.athletes;
            const names = statsGroup.names || [];

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
                                            <a href="/player.html?id=${p.id}" class="player-name-link">
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
                    <span class="team-logo-link">
                        <img src="${homeTeam.info.logo}" alt="${homeTeam.info.abbreviation}" class="team-logo-large">
                    </span>
                    <div class="team-details">
                        <h2><span class="team-link">${homeTeam.info.displayName}</span></h2>
                        ${homeTeam.record ? `<span class="team-record">${homeTeam.record}</span>` : ''}
                    </div>
                    <div class="score-large ${isComplete && homeScore < awayScore ? 'loser' : ''}">${homeTeam.score || '0'}</div>
                </div>

                <div class="game-info-large">
                    <div class="game-status-large">${gameInfo.status}</div>
                    <div class="game-clock-large">${gameInfo.clock || ''}</div>
                </div>

                <div class="team-header away">
                    <div class="score-large ${isComplete && awayScore < homeScore ? 'loser' : ''}">${awayTeam.score || '0'}</div>
                    <div class="team-details">
                        <h2><span class="team-link">${awayTeam.info.displayName}</span></h2>
                        ${awayTeam.record ? `<span class="team-record">${awayTeam.record}</span>` : ''}
                    </div>
                    <span class="team-logo-link">
                        <img src="${awayTeam.info.logo}" alt="${awayTeam.info.abbreviation}" class="team-logo-large">
                    </span>
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

        const tabs = container.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabName = tab.dataset.tab;
                document.getElementById('stats-home').style.display = tabName === 'home' ? 'block' : 'none';
                document.getElementById('stats-away').style.display = tabName === 'away' ? 'block' : 'none';
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeamPage();
});
