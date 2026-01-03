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
        document.getElementById('player-name').textContent = player.displayName;

        this.renderPlayerHeader();
        this.renderPlayerContent();
    }

    renderPlayerHeader() {
        const { player, team } = this.playerData;

        this.playerHeader.innerHTML = `
            <div class="player-header-content">
                <div class="player-header-left">
                    ${player.headshot ? `
                        <img src="${player.headshot}" alt="${player.displayName}" class="player-headshot" onerror="this.style.display='none'">
                    ` : `
                        <div class="player-headshot-placeholder">
                            <i class="fas fa-user"></i>
                        </div>
                    `}
                    <div class="player-info-header">
                        <h2 class="player-name-header">${player.displayName}</h2>
                        <div class="player-meta">
                            <span class="player-jersey">#${player.jersey || '--'}</span>
                            <span class="player-position-header">${player.position}</span>
                            ${team ? `
                                <span class="player-team-link">${team.name}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderPlayerContent() {
        this.playerContent.innerHTML = `
            <div class="player-layout">
                <div class="player-bio-section">
                    <h3 class="section-title">Player Info</h3>
                    ${this.renderPlayerBio()}
                    
                    <h3 class="section-title" style="margin-top: 2rem;">Last Game</h3>
                    <div id="last-game-container">Loading last game stats...</div>
                </div>
                <div class="player-stats-section">
                    <h3 class="section-title">Stats</h3>
                    ${this.renderPlayerStats()}
                    ${this.renderRecentGames()}
                </div>
            </div>
        `;

        // Fetch and render last game stats
        await this.renderLastGameStats();

        // Adjust heights
        setTimeout(() => this.adjustColumnHeights(), 0);
    }

    adjustColumnHeights() {
        const bioSection = this.playerContent.querySelector('.player-bio-section');
        const statsSection = this.playerContent.querySelector('.player-stats-section');

        if (bioSection && statsSection) {
            // Reset height
            statsSection.style.height = 'auto';

            // Only apply on desktop
            if (window.innerWidth > 768) {
                // const height = bioSection.offsetHeight;
                // statsSection.style.height = `${height}px`;
            } else {
                statsSection.style.height = 'auto';
            }
        }
    }

    renderPlayerBio() {
        const { player } = this.playerData;

        const bioItems = [
            { label: 'Height', value: player.height || 'N/A' },
            { label: 'Weight', value: player.weight || 'N/A' },
            { label: 'Age', value: player.age || 'N/A' },
            { label: 'Born', value: player.birthPlace || 'N/A' },
            { label: 'College', value: player.college || 'N/A' },
            { label: 'Experience', value: player.experience ? `${player.experience} years` : 'Rookie' }
        ];

        return `
            <div class="player-bio-grid">
                ${bioItems.map(item => `
                    <div class="bio-item">
                        <span class="bio-label">${item.label}</span>
                        <span class="bio-value">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
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
