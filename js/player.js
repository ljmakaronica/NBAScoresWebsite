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
                                <a href="team.html?id=${team.id}" class="player-team-link">${team.name}</a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPlayerContent() {
        this.playerContent.innerHTML = `
            <div class="player-layout">
                <div class="player-bio-section">
                    <h3 class="section-title">Player Info</h3>
                    ${this.renderPlayerBio()}
                </div>
                <div class="player-stats-section">
                    <h3 class="section-title">Stats</h3>
                    ${this.renderPlayerStats()}
                    ${this.renderRecentGames()}
                </div>
            </div>
        `;
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

        return `
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
                        ${stats.season ? `
                            <tr>
                                <td class="stat-label-col">Regular Season</td>
                                <td>${getStat(stats.season, 'gamesPlayed')}</td>
                                <td>${getStat(stats.season, 'avgMinutes')}</td>
                                <td>${getStat(stats.season, 'fieldGoalPct')}</td>
                                <td>${getStat(stats.season, 'threePointFieldGoalPct')}</td>
                                <td>${getStat(stats.season, 'freeThrowPct')}</td>
                                <td>${getStat(stats.season, 'avgRebounds')}</td>
                                <td>${getStat(stats.season, 'avgAssists')}</td>
                                <td>${getStat(stats.season, 'avgBlocks')}</td>
                                <td>${getStat(stats.season, 'avgSteals')}</td>
                                <td>${getStat(stats.season, 'avgPersonalFouls')}</td>
                                <td>${getStat(stats.season, 'avgTurnovers')}</td>
                                <td>${getStat(stats.season, 'avgPoints')}</td>
                            </tr>
                        ` : ''}
                        ${stats.career ? `
                            <tr>
                                <td class="stat-label-col">Career</td>
                                <td>${getStat(stats.career, 'gamesPlayed')}</td>
                                <td>${getStat(stats.career, 'avgMinutes')}</td>
                                <td>${getStat(stats.career, 'fieldGoalPct')}</td>
                                <td>${getStat(stats.career, 'threePointFieldGoalPct')}</td>
                                <td>${getStat(stats.career, 'freeThrowPct')}</td>
                                <td>${getStat(stats.career, 'avgRebounds')}</td>
                                <td>${getStat(stats.career, 'avgAssists')}</td>
                                <td>${getStat(stats.career, 'avgBlocks')}</td>
                                <td>${getStat(stats.career, 'avgSteals')}</td>
                                <td>${getStat(stats.career, 'avgPersonalFouls')}</td>
                                <td>${getStat(stats.career, 'avgTurnovers')}</td>
                                <td>${getStat(stats.career, 'avgPoints')}</td>
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
                        ${game.stats ? `
                            <div class="recent-game-stats">
                                ${this.formatGameStats(game.stats)}
                            </div>
                        ` : '<div class="no-stats-game">No stats available</div>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatGameDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatGameStats(stats) {
        if (!stats) return '--';
        // Format game stats as a simple string
        return `<span>${stats}</span>`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlayerPage();
});
