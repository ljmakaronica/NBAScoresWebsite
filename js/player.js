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
        const { player, statistics } = this.playerData;

        this.playerContent.innerHTML = `
            <div class="player-layout">
                <div class="player-bio-section">
                    <h3 class="section-title">Player Info</h3>
                    ${this.renderPlayerBio()}
                </div>
                <div class="player-stats-section">
                    <h3 class="section-title">Season Statistics</h3>
                    ${this.renderPlayerStats()}
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
        const { statistics } = this.playerData;

        if (!statistics || statistics.length === 0) {
            return '<p class="no-data">No statistics available</p>';
        }

        let statsHTML = '<div class="player-stats-grid">';

        statistics.forEach(category => {
            if (category.stats && category.stats.length > 0) {
                statsHTML += `<h4 class="stats-category-title">${category.displayName}</h4><div class="stats-grid-compact">`;

                category.stats.forEach(stat => {
                    statsHTML += `
                        <div class="stat-item-compact">
                            <span class="stat-label-compact">${stat.displayName}</span>
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlayerPage();
});
