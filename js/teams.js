class NBATeams {
    constructor() {
        this.container = document.getElementById('teams-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.isLoading = false;
        this.loadTeams();
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('visible', show);
    }

    async loadTeams() {
        if (this.isLoading) return;

        this.showLoading(true);
        this.isLoading = true;

        try {
            const response = await fetch('/api/scrape-teams');
            if (!response.ok) throw new Error('Failed to fetch teams');

            const data = await response.json();
            this.displayTeams(data.data);

        } catch (error) {
            console.error('Error loading teams:', error);
            this.showError('Failed to load teams. Please try again later.');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    displayTeams(teams) {
        this.container.innerHTML = '';

        if (!teams || teams.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data';
            noData.textContent = 'No teams data available';
            this.container.appendChild(noData);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'teams-grid';

        teams.forEach(team => {
            const card = this.createTeamCard(team);
            grid.appendChild(card);
        });

        this.container.appendChild(grid);
    }

    createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'team-card';

        const logoHtml = team.logo
            ? `<img src="${team.logo}" alt="${team.name}" class="team-card-logo">`
            : `<div class="team-card-placeholder">${team.abbreviation}</div>`;

        card.innerHTML = `
            ${logoHtml}
            <div class="team-card-content">
                <h3 class="team-card-name">${team.name}</h3>
                <div class="team-card-abbr">${team.abbreviation}</div>
                ${team.record ? `<div class="team-card-record">${team.record}</div>` : ''}
                ${team.standingSummary ? `<div class="team-card-standing">${team.standingSummary}</div>` : ''}
            </div>
        `;

        return card;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NBATeams();
});
