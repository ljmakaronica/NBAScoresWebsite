class NBALeaders {
    constructor() {
        this.container = document.getElementById('leaders-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.isLoading = false;
        this.loadLeaders();
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('visible', show);
    }

    async loadLeaders() {
        if (this.isLoading) return;

        this.showLoading(true);
        this.isLoading = true;

        try {
            const response = await fetch('/api/scrape-leaders');
            if (!response.ok) throw new Error('Failed to fetch leaders');

            const data = await response.json();
            this.displayLeaders(data.data);

        } catch (error) {
            console.error('Error loading leaders:', error);
            this.showError('Failed to load leaders. Please try again later.');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    displayLeaders(leadersData) {
        this.container.innerHTML = '';

        if (!leadersData || Object.keys(leadersData).length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data';
            noData.textContent = 'No leaders data available';
            this.container.appendChild(noData);
            return;
        }

        const categories = [
            { key: 'points', title: 'Points Per Game', stat: 'PPG' },
            { key: 'rebounds', title: 'Rebounds Per Game', stat: 'RPG' },
            { key: 'assists', title: 'Assists Per Game', stat: 'APG' },
            { key: 'steals', title: 'Steals Per Game', stat: 'SPG' },
            { key: 'blocks', title: 'Blocks Per Game', stat: 'BPG' }
        ];

        categories.forEach(category => {
            if (leadersData[category.key] && leadersData[category.key].length > 0) {
                const section = this.createLeaderSection(category.title, category.stat, leadersData[category.key]);
                this.container.appendChild(section);
            }
        });
    }

    createLeaderSection(title, statLabel, leaders) {
        const section = document.createElement('div');
        section.className = 'leader-section';

        const header = document.createElement('h3');
        header.className = 'leader-section-title';
        header.textContent = title;
        section.appendChild(header);

        const list = document.createElement('div');
        list.className = 'leaders-list';

        leaders.slice(0, 10).forEach((leader, index) => {
            const item = document.createElement('div');
            item.className = 'leader-item';
            if (index === 0) item.classList.add('leader-top');

            item.innerHTML = `
                <div class="leader-rank">${index + 1}</div>
                <div class="leader-info">
                    <div class="leader-name">${leader.athlete?.displayName || leader.displayName || 'Unknown'}</div>
                    <div class="leader-team">${leader.team?.abbreviation || leader.athlete?.team?.abbreviation || ''}</div>
                </div>
                <div class="leader-stat">${leader.value || leader.displayValue || '0.0'}</div>
            `;

            list.appendChild(item);
        });

        section.appendChild(list);
        return section;
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
    const app = new NBALeaders();
});
