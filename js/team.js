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
                <div class="next-game-card">
                    <div class="next-game-label">NEXT GAME</div>
                    <div class="next-game-info">
                        <div class="next-game-opponent">
                            <img src="${opponentLogo}" alt="${opponent.displayName}" class="opponent-logo" onerror="this.style.display='none'">
                            <span class="opponent-name">${vsAt} ${opponent.abbreviation}</span>
                        </div>
                        <div class="next-game-time">
                            <div class="game-date">${this.formatGameDate(nextGame.date)}</div>
                            <div class="game-time">${this.formatGameTime(nextGame.date)}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        this.teamHeader.innerHTML = `
            <div class="team-hero" style="background: linear-gradient(to right, ${team.color}dd, ${team.color}99), url('${team.logo}') no-repeat center/cover;">
                <div class="team-hero-content">
                    <div class="team-identity">
                        <img src="${team.logo}" alt="${team.name}" class="team-logo-hero" onerror="this.style.display='none'">
                        <div class="team-text">
                            <h1 class="team-name-hero">${team.name}</h1>
                            <div class="team-record-hero">
                                <span class="record-badge">${record.overall}</span>
                                <span class="standing-text">${record.standing}</span>
                            </div>
                        </div>
                    </div>
                    <div class="team-next-game">
                        ${nextGameHTML || '<div class="no-upcoming-game">No upcoming games scheduled</div>'}
                    </div>
                </div>
            </div>
            <div class="team-stats-bar">
                <div class="stat-box">
                    <span class="stat-label">Home</span>
                    <span class="stat-value">${record.home}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Away</span>
                    <span class="stat-value">${record.away}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Streak</span>
                    <span class="stat-value">${this.getStreak(schedule)}</span>
                </div>
            </div>
        `;
    }

    getStreak(schedule) {
        if (!schedule || !schedule.events) return '-';
        const completedGames = schedule.events.filter(event =>
            event.competitions?.[0]?.status?.type?.completed
        ).reverse(); // Most recent first

        if (completedGames.length === 0) return '-';

        let streak = 0;
        let type = '';

        for (const game of completedGames) {
            const competition = game.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isHome = homeTeam.team.displayName === this.teamData.team.name;
            const homeScore = parseFloat(homeTeam.score?.value || homeTeam.score?.displayValue || homeTeam.score || 0);
            const awayScore = parseFloat(awayTeam.score?.value || awayTeam.score?.displayValue || awayTeam.score || 0);

            const won = isHome ? homeScore > awayScore : awayScore > homeScore;
            const result = won ? 'W' : 'L';

            if (streak === 0) {
                type = result;
                streak = 1;
            } else if (type === result) {
                streak++;
            } else {
                break;
            }
        }
        return `${type}${streak}`;
    }

    renderTeamContent() {
        this.teamContent.innerHTML = `
            <div class="team-grid-layout">
                <div class="main-column">
                    <div class="section-header">
                        <h3 class="section-title">Team Leaders</h3>
                    </div>
                    ${this.renderTeamLeaders()}
                    
                    <div class="section-header" style="margin-top: 2rem;">
                        <h3 class="section-title">Roster</h3>
                    </div>
                    ${this.renderRoster()}
                </div>
                <div class="sidebar-column">
                    <div class="section-header">
                        <h3 class="section-title">Game Log</h3>
                    </div>
                    ${this.renderGameLog()}
                    
                    <div class="section-header" style="margin-top: 2rem;">
                        <h3 class="section-title">Team Stats</h3>
                    </div>
                    ${this.renderStatistics()}
                </div>
            </div>
        `;

        // Add click listeners to game log items
        this.setupGameLogListeners();

        // Adjust heights
        setTimeout(() => this.adjustColumnHeights(), 0);
    }

    setupGameLogListeners() {
        const gameLogRows = document.querySelectorAll('.game-log-row[data-game-id]');
        gameLogRows.forEach(row => {
            if (row.classList.contains('completed')) {
                row.addEventListener('click', () => {
                    const gameId = row.getAttribute('data-game-id');
                    if (gameId) {
                        this.showBoxScore(gameId);
                    }
                });
            }
        });
    }

    adjustColumnHeights() {
        // With the new grid layout, we might not need manual height adjustment as much,
        // but let's keep it for the sidebar if needed.
        // For now, let CSS Grid handle the layout.
    }

    renderTeamLeaders() {
        const { roster } = this.teamData;
        if (!roster || roster.length === 0) return '';

        // Helper to get stat value safely
        const getStatValue = (player, abbr) => {
            const stats = player.statistics?.[0]?.stats || [];
            const stat = stats.find(s => s.abbreviation === abbr);
            return stat ? parseFloat(stat.displayValue) : 0;
        };

        // Find leaders
        const ppgLeader = [...roster].sort((a, b) => getStatValue(b, 'PPG') - getStatValue(a, 'PPG'))[0];
        const rpgLeader = [...roster].sort((a, b) => getStatValue(b, 'RPG') - getStatValue(a, 'RPG'))[0];
        const apgLeader = [...roster].sort((a, b) => getStatValue(b, 'APG') - getStatValue(a, 'APG'))[0];

        const leaders = [
            { label: 'Points', player: ppgLeader, stat: 'PPG' },
            { label: 'Rebounds', player: rpgLeader, stat: 'RPG' },
            { label: 'Assists', player: apgLeader, stat: 'APG' }
        ];

        return `
            <div class="team-leaders-grid">
                ${leaders.map(item => {
            const player = item.player;
            if (!player) return '';
            const statValue = getStatValue(player, item.stat);

            return `
                        <div class="leader-card">
                            <div class="leader-label">${item.label}</div>
                            <div class="leader-info">
                                <img src="${player.headshot || ''}" alt="${player.displayName}" class="leader-headshot" onerror="this.src='assets/default-player.png'">
                                <div class="leader-details">
                                    <div class="leader-value">${statValue}</div>
                                    <div class="leader-name">${player.displayName}</div>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    renderStatistics() {
        const { statistics } = this.teamData;

        if (!statistics || statistics.length === 0) {
            return '<p class="no-data">No statistics available</p>';
        }

        let statsHTML = '<div class="team-stats-list">';

        statistics.forEach(category => {
            if (category.stats && category.stats.length > 0) {
                // Filter for key stats only to keep it clean
                const keyStats = category.stats.filter(s =>
                    ['PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%', 'TO', 'SPG', 'BPG'].includes(s.abbreviation)
                );

                if (keyStats.length > 0) {
                    statsHTML += `<div class="stats-category-group">`;
                    keyStats.forEach(stat => {
                        statsHTML += `
                            <div class="team-stat-row">
                                <span class="team-stat-label">${stat.displayName}</span>
                                <span class="team-stat-value">${stat.displayValue}</span>
                            </div>
                        `;
                    });
                    statsHTML += `</div>`;
                }
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

        let rosterHTML = '<div class="roster-grid-modern">';

        roster.forEach(player => {
            const position = player.position?.abbreviation || 'N/A';
            const jersey = player.jersey || '--';
            const displayName = player.displayName || player.fullName || 'Unknown';
            const playerId = player.id;
            const headshot = player.headshot;

            // Get stats if available
            const stats = player.statistics?.[0]?.stats || [];
            const ppg = stats.find(s => s.abbreviation === 'PPG')?.displayValue || '--';

            rosterHTML += `
                <a href="#" onclick="return false;" class="player-card-modern" style="cursor: default;">
                    <div class="player-card-top">
                        <span class="player-card-jersey">#${jersey}</span>
                        <span class="player-card-pos">${position}</span>
                    </div>
                    <div class="player-card-image-container">
                        ${headshot ?
                    `<img src="${headshot}" alt="${displayName}" class="player-card-img" onerror="this.style.display='none'">` :
                    `<div class="player-card-placeholder"><i class="fas fa-user"></i></div>`
                }
                    </div>
                    <div class="player-card-info">
                        <div class="player-card-name">${displayName}</div>
                        <div class="player-card-stat">
                            <span class="stat-label">PPG</span>
                            <span class="stat-val">${ppg}</span>
                        </div>
                    </div>
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

        // Separate games
        const completedGames = schedule.events.filter(event =>
            event.competitions?.[0]?.status?.type?.completed
        ).reverse();

        const upcomingGames = schedule.events.filter(event =>
            !event.competitions?.[0]?.status?.type?.completed
        );

        // Limit to last 5 completed and next 3 upcoming for the sidebar view
        const recentGames = completedGames.slice(0, 5);
        const nextGames = upcomingGames.slice(0, 3);

        let gameLogHTML = `
            <div class="game-log-modern">
                <table class="game-log-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Opponent</th>
                            <th>Result/Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Combine for display: Next games first (if any), then recent games
        // Actually, usually users want to see "Schedule" vs "Results".
        // Let's show recent results first as that's "Game Log".

        recentGames.forEach(event => {
            const competition = event.competitions?.[0];
            if (!competition) return;

            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            const isCompleted = competition.status?.type?.completed;

            const result = this.getGameResult(homeTeam, awayTeam);
            const resultClass = result === 'W' ? 'win' : 'loss';

            const homeScore = homeTeam.score?.displayValue || homeTeam.score || '0';
            const awayScore = awayTeam.score?.displayValue || awayTeam.score || '0';

            const isHome = homeTeam.team.displayName === this.teamData.team.name;
            const opponent = isHome ? awayTeam.team.displayName : homeTeam.team.displayName;
            const opponentAbbr = isHome ? awayTeam.team.abbreviation : homeTeam.team.abbreviation;
            const vsAt = isHome ? 'vs' : '@';
            const gameId = event.id;

            gameLogHTML += `
                <tr class="game-log-row completed" data-game-id="${gameId}">
                    <td class="date-col">
                        <span class="date-day">${this.formatGameDate(event.date)}</span>
                    </td>
                    <td class="opponent-col">
                        <span class="vs-at">${vsAt}</span>
                        <span class="opp-name">${opponentAbbr}</span>
                    </td>
                    <td class="result-col">
                        <span class="result-badge ${resultClass}">${result}</span>
                        <span class="score-text">${isHome ? homeScore : awayScore}-${isHome ? awayScore : homeScore}</span>
                    </td>
                </tr>
            `;
        });

        gameLogHTML += `
                    </tbody>
                </table>
                ${completedGames.length > 5 ? `<div class="view-all-games">View full schedule</div>` : ''}
            </div>
        `;

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
                                            <a href="#" onclick="return false;" class="player-name-link" style="cursor: default;">
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
                    <a href="#" onclick="return false;" class="team-logo-link" style="cursor: default;">
                        <img src="${homeTeam.info.logo}" alt="${homeTeam.info.abbreviation}" class="team-logo-large">
                    </a>
                    <div class="team-details">
                        <h2><a href="#" onclick="return false;" class="team-link" style="cursor: default;">${homeTeam.info.displayName}</a></h2>
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
                        <h2><a href="#" onclick="return false;" class="team-link" style="cursor: default;">${awayTeam.info.displayName}</a></h2>
                    </div>
                    <a href="#" onclick="return false;" class="team-logo-link" style="cursor: default;">
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
