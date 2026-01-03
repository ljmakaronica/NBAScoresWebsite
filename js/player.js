class PlayerPage {
    constructor() {
        this.playerId = null;
        this.playerData = null;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.playerHeader = document.getElementById('player-header');
        this.playerContent = document.getElementById('player-content');
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
        const playerId = urlParams.get('id');

        if (!playerId) {
            this.showError('No player specified');
            return;
        }

        this.playerId = playerId;
        this.loadPlayerData();
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        this.playerContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    async loadPlayerData() {
        this.showLoading(true);
        try {
            const response = await fetch(`/api/player-details?playerId=${this.playerId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch player data');
            }

            this.playerData = await response.json();
            this.renderPlayerPage();
        } catch (error) {
            console.error('Error loading player data:', error);
            this.showError('Failed to load player data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    renderPlayerPage() {
        if (!this.playerData) return;

        const { player } = this.playerData;
        document.title = `${player.displayName} - NBA`;

        this.renderPlayerHeader();
        this.renderPlayerContent();
    }

    renderPlayerHeader() {
        const { player, team } = this.playerData;
        const { stats } = this.playerData;
        
        // Check if player is injured (status is not 'Active')
        const isInjured = player.status && player.status !== 'Active';
        const injuryBadge = isInjured ? `
            <span class="player-injury-tag">
                <i class="fas fa-kit-medical"></i>
                ${player.status}
            </span>
        ` : '';

        // Get key stats for the hero section
        const keyStats = stats?.season || stats?.career;
        const getStat = (key) => keyStats?.[key] || '--';

        this.playerHeader.innerHTML = `
            <div class="player-hero">
                <div class="player-hero-bg"></div>
                <div class="player-hero-content">
                    <div class="player-hero-photo">
                        ${player.headshot ? `
                            <img src="${player.headshot}" alt="${player.displayName}" onerror="this.parentElement.innerHTML='<div class=\\'player-hero-placeholder\\'><i class=\\'fas fa-user\\'></i></div>'">
                        ` : `
                            <div class="player-hero-placeholder">
                                <i class="fas fa-user"></i>
                            </div>
                        `}
                    </div>
                    <div class="player-hero-info">
                        <div class="player-hero-number">#${player.jersey || '--'}</div>
                        <h1 class="player-hero-name">${player.displayName}</h1>
                        <div class="player-hero-details">
                            <span class="player-hero-position">${player.position}</span>
                            ${team ? `<span class="player-hero-team">${team.name}</span>` : ''}
                            ${injuryBadge}
                        </div>
                    </div>
                    <div class="player-hero-stats">
                        <div class="hero-stat">
                            <div class="hero-stat-value">${getStat('avgPoints')}</div>
                            <div class="hero-stat-label">PTS</div>
                        </div>
                        <div class="hero-stat">
                            <div class="hero-stat-value">${getStat('avgRebounds')}</div>
                            <div class="hero-stat-label">REB</div>
                        </div>
                        <div class="hero-stat">
                            <div class="hero-stat-value">${getStat('avgAssists')}</div>
                            <div class="hero-stat-label">AST</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderPlayerContent() {
        const { player, stats } = this.playerData;

        this.playerContent.innerHTML = `
            <div class="player-page-grid">
                <div class="player-info-card">
                    <div class="card-header">
                        <span class="card-icon"><i class="fas fa-id-card"></i></span>
                        <span class="card-title">Bio</span>
                    </div>
                    ${this.renderPlayerBio()}
                </div>

                <div class="player-info-card">
                    <div class="card-header">
                        <span class="card-icon"><i class="fas fa-basketball"></i></span>
                        <span class="card-title">Last Game</span>
                    </div>
                    <div id="last-game-container" class="last-game-loading">
                        <div class="mini-loader"></div>
                    </div>
                </div>

                <div class="player-stats-card">
                    <div class="card-header">
                        <span class="card-icon"><i class="fas fa-chart-simple"></i></span>
                        <span class="card-title">Statistics</span>
                    </div>
                    ${this.renderStatsTable()}
                </div>
            </div>
        `;

        // Fetch and render last game stats
        await this.renderLastGameStats();
    }

    adjustColumnHeights() {
        // No longer needed with new grid layout
    }

    renderPlayerBio() {
        const { player } = this.playerData;

        const bioItems = [
            { icon: 'ruler-vertical', label: 'Height', value: player.height || '--' },
            { icon: 'weight-scale', label: 'Weight', value: player.weight || '--' },
            { icon: 'calendar', label: 'Age', value: player.age || '--' },
            { icon: 'map-marker-alt', label: 'From', value: player.birthPlace || '--' },
            { icon: 'graduation-cap', label: 'College', value: player.college || '--' },
            { icon: 'clock', label: 'Experience', value: player.experience ? `${player.experience} yrs` : 'Rookie' }
        ];

        return `
            <div class="bio-grid">
                ${bioItems.map(item => `
                    <div class="bio-row">
                        <div class="bio-row-label">
                            <i class="fas fa-${item.icon}"></i>
                            ${item.label}
                        </div>
                        <div class="bio-row-value">${item.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStatsTable() {
        const { stats } = this.playerData;

        if (!stats || (!stats.season && !stats.career)) {
            return '<p class="no-stats-message">No statistics available</p>';
        }

        const getStat = (statsObj, key) => statsObj?.[key] || '--';
        const seasonStats = stats.season;
        const careerStats = stats.career;

        const statColumns = [
            { key: 'gamesPlayed', label: 'GP' },
            { key: 'avgMinutes', label: 'MIN' },
            { key: 'avgPoints', label: 'PTS' },
            { key: 'avgRebounds', label: 'REB' },
            { key: 'avgAssists', label: 'AST' },
            { key: 'fieldGoalPct', label: 'FG%' },
            { key: 'threePointFieldGoalPct', label: '3P%' },
            { key: 'freeThrowPct', label: 'FT%' },
            { key: 'avgSteals', label: 'STL' },
            { key: 'avgBlocks', label: 'BLK' }
        ];

        return `
            <div class="stats-table-container">
                <table class="modern-stats-table">
                    <thead>
                        <tr>
                            <th></th>
                            ${statColumns.map(col => `<th>${col.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${seasonStats ? `
                            <tr>
                                <td class="row-label">Season</td>
                                ${statColumns.map(col => `<td>${getStat(seasonStats, col.key)}</td>`).join('')}
                            </tr>
                        ` : ''}
                        ${careerStats ? `
                            <tr>
                                <td class="row-label">Career</td>
                                ${statColumns.map(col => `<td>${getStat(careerStats, col.key)}</td>`).join('')}
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRecentGames() {
        // Removed - not needed in new layout
        return '';
    }

    renderPlayerStats() {
        const { stats } = this.playerData;

        if (!stats || (!stats.season && !stats.career)) {
            return '<p class="no-data">No statistics available</p>';
        }

        const getStat = (statsObj, key) => statsObj?.[key] || '--';
        const seasonStats = stats.season;
        const careerStats = stats.career;

        // Determine which stats to show in key cards (prefer season, fallback to career)
        const keyStats = seasonStats || careerStats;
        const statsLabel = seasonStats ? 'Season Avg' : 'Career Avg';

        return `
            <div class="key-stats-cards">
                <div class="key-stat-card">
                    <div class="key-stat-value">${getStat(keyStats, 'avgPoints')}</div>
                    <div class="key-stat-label">PTS</div>
                    <div class="key-stat-type">${statsLabel}</div>
                </div>
                <div class="key-stat-card">
                    <div class="key-stat-value">${getStat(keyStats, 'avgRebounds')}</div>
                    <div class="key-stat-label">REB</div>
                    <div class="key-stat-type">${statsLabel}</div>
                </div>
                <div class="key-stat-card">
                    <div class="key-stat-value">${getStat(keyStats, 'avgAssists')}</div>
                    <div class="key-stat-label">AST</div>
                    <div class="key-stat-type">${statsLabel}</div>
                </div>
            </div>

            <h3 class="section-title" style="margin-top: 1.5rem;">Season & Career Stats</h3>
            <div class="player-stats-table-wrapper">
                <table class="player-stats-table">
                    <thead>
                        <tr>
                            <th>STATS</th>
                            <th>GP</th>
                            <th>MIN</th>
                            <th>FG%</th>
                            <th>3P%</th>
                            <th>FT%</th>
                            <th>REB</th>
                            <th>AST</th>
                            <th>BLK</th>
                            <th>STL</th>
                            <th>PF</th>
                            <th>TO</th>
                            <th>PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${seasonStats ? `
                            <tr>
                                <td class="stat-label-col">Season</td>
                                <td>${getStat(seasonStats, 'gamesPlayed')}</td>
                                <td>${getStat(seasonStats, 'avgMinutes')}</td>
                                <td>${getStat(seasonStats, 'fieldGoalPct')}</td>
                                <td>${getStat(seasonStats, 'threePointFieldGoalPct')}</td>
                                <td>${getStat(seasonStats, 'freeThrowPct')}</td>
                                <td>${getStat(seasonStats, 'avgRebounds')}</td>
                                <td>${getStat(seasonStats, 'avgAssists')}</td>
                                <td>${getStat(seasonStats, 'avgBlocks')}</td>
                                <td>${getStat(seasonStats, 'avgSteals')}</td>
                                <td>${getStat(seasonStats, 'avgPersonalFouls')}</td>
                                <td>${getStat(seasonStats, 'avgTurnovers')}</td>
                                <td>${getStat(seasonStats, 'avgPoints')}</td>
                            </tr>
                        ` : ''}
                        ${careerStats ? `
                            <tr>
                                <td class="stat-label-col">Career</td>
                                <td>${getStat(careerStats, 'gamesPlayed')}</td>
                                <td>${getStat(careerStats, 'avgMinutes')}</td>
                                <td>${getStat(careerStats, 'fieldGoalPct')}</td>
                                <td>${getStat(careerStats, 'threePointFieldGoalPct')}</td>
                                <td>${getStat(careerStats, 'freeThrowPct')}</td>
                                <td>${getStat(careerStats, 'avgRebounds')}</td>
                                <td>${getStat(careerStats, 'avgAssists')}</td>
                                <td>${getStat(careerStats, 'avgBlocks')}</td>
                                <td>${getStat(careerStats, 'avgSteals')}</td>
                                <td>${getStat(careerStats, 'avgPersonalFouls')}</td>
                                <td>${getStat(careerStats, 'avgTurnovers')}</td>
                                <td>${getStat(careerStats, 'avgPoints')}</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRecentGames() {
        const { recentGames } = this.playerData;

        if (!recentGames || recentGames.length === 0) {
            return '';
        }

        return `
            <h3 class="section-title" style="margin-top: 2rem;">Recent Games</h3>
            <div class="recent-games-list">
                ${recentGames.map(game => `
                    <div class="recent-game-item">
                        <div class="recent-game-header">
                            <span class="recent-game-date">${this.formatGameDate(game.date)}</span>
                            <span class="recent-game-opponent">${game.opponent}</span>
                            <span class="recent-game-result ${game.result === 'W' ? 'win' : 'loss'}">${game.result}</span>
                        </div>
                        <div class="recent-game-score">${game.score}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async renderLastGameStats() {
        const container = document.getElementById('last-game-container');
        const { recentGames, player } = this.playerData;

        if (!recentGames || recentGames.length === 0) {
            container.innerHTML = '<p class="no-data">No recent games found</p>';
            return;
        }

        const lastGame = recentGames[0];
        const gameId = lastGame.id;

        try {
            const response = await fetch(`/api/game-details?gameId=${gameId}`);
            if (!response.ok) throw new Error('Failed to fetch game details');
            const gameData = await response.json();

            // Find player stats in the game data
            let playerStats = null;
            let statNames = [];

            // Helper to find player in team stats
            const findPlayerInTeam = (teamData) => {
                if (!teamData || !teamData.players || teamData.players.length === 0) return null;
                const statsGroup = teamData.players[0]; // Usually the first group contains the main stats
                if (!statsGroup || !statsGroup.athletes) return null;
                statNames = statsGroup.names || [];
                // Convert both IDs to strings for comparison
                return statsGroup.athletes.find(p => String(p.athlete.id) === String(player.id));
            };

            const homePlayer = findPlayerInTeam(gameData.homeTeam);
            if (homePlayer) {
                playerStats = { stats: homePlayer.stats };
            } else {
                const awayPlayer = findPlayerInTeam(gameData.awayTeam);
                if (awayPlayer) {
                    playerStats = { stats: awayPlayer.stats };
                }
            }

            if (playerStats) {
                const stats = playerStats.stats;
                
                // Use names array to find stat indices properly
                const getStatByName = (name) => {
                    const index = statNames.indexOf(name);
                    return index !== -1 ? (stats[index] || '--') : '--';
                };

                const pts = getStatByName('PTS');
                const reb = getStatByName('REB');
                const ast = getStatByName('AST');

                container.innerHTML = `
                    <div class="last-game-stats">
                        <div class="last-game-stat">
                            <span class="stat-value-lg">${pts}</span>
                            <span class="stat-label-sm">PTS</span>
                        </div>
                        <div class="last-game-stat">
                            <span class="stat-value-lg">${reb}</span>
                            <span class="stat-label-sm">REB</span>
                        </div>
                        <div class="last-game-stat">
                            <span class="stat-value-lg">${ast}</span>
                            <span class="stat-label-sm">AST</span>
                        </div>
                        <div class="last-game-details">
                            <div class="last-game-opp">vs ${lastGame.opponent}</div>
                            <div class="last-game-date">${this.formatGameDate(lastGame.date)}</div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = '<p class="no-data">Player did not play in last game</p>';
            }

        } catch (error) {
            console.error('Error loading last game stats:', error);
            container.innerHTML = '<p class="error-message">Failed to load last game stats</p>';
        }
    }

    formatGameDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatGameStats(stats) {
        if (!stats) return '--';
        return `<span>${stats}</span>`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlayerPage();
});
