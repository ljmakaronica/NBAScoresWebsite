// Team logos mapping (same as schedule)
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

class NBAStandings {
    constructor() {
        this.container = document.getElementById('standings-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.isLoading = false;
        this.loadStandings();
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('visible', show);
    }

    async loadStandings() {
        if (this.isLoading) return;

        this.showLoading(true);
        this.isLoading = true;

        try {
            const response = await fetch('/api/scrape-standings');
            if (!response.ok) throw new Error('Failed to fetch standings');

            const data = await response.json();
            this.displayStandings(data.data);

        } catch (error) {
            console.error('Error loading standings:', error);
            this.showError('Failed to load standings. Please try again later.');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    displayStandings(teams) {
        this.container.innerHTML = '';

        if (!teams || teams.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data';
            noData.textContent = 'No standings data available';
            this.container.appendChild(noData);
            return;
        }

        // Separate teams by conference and sort by win percentage
        // ESPN data already has proper tiebreakers applied
        const sortTeams = (a, b) => {
            // ESPN already provides win_pct, use that
            return (b.win_pct || 0) - (a.win_pct || 0);
        };

        const eastern = teams.filter(team => team.conference === 'East').sort(sortTeams);
        const western = teams.filter(team => team.conference === 'West').sort(sortTeams);

        // Create conference tables (West on left, East on right)
        const easternSection = this.createConferenceTable('Eastern Conference', eastern);
        const westernSection = this.createConferenceTable('Western Conference', western);

        this.container.appendChild(westernSection);
        this.container.appendChild(easternSection);
    }

    createConferenceTable(conferenceName, teams) {
        const section = document.createElement('div');
        section.className = 'conference-section';

        const header = document.createElement('h2');
        header.className = 'conference-header';
        header.textContent = conferenceName;
        section.appendChild(header);

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'standings-table-wrapper';

        const table = document.createElement('table');
        table.className = 'standings-table';

        // Table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="rank-col">#</th>
                    <th class="team-col">Team</th>
                    <th class="stat-col">W</th>
                    <th class="stat-col">L</th>
                    <th class="stat-col">PCT</th>
                    <th class="stat-col">GB</th>
                    <th class="stat-col mobile-hide">HOME</th>
                    <th class="stat-col mobile-hide">ROAD</th>
                    <th class="stat-col mobile-hide">CONF</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Calculate games behind
        const leaderWins = teams[0]?.wins || 0;
        const leaderLosses = teams[0]?.losses || 0;

        teams.forEach((team, index) => {
            const rank = index + 1;
            const winPct = team.wins + team.losses > 0
                ? (team.wins / (team.wins + team.losses)).toFixed(3)
                : '.000';

            // Games behind calculation
            const gb = rank === 1 ? '-' :
                ((leaderWins - team.wins + team.losses - leaderLosses) / 2).toFixed(1);

            const row = document.createElement('tr');

            // Add playoff indicator class
            if (rank <= 6) {
                row.classList.add('playoff-spot');
            } else if (rank <= 10) {
                row.classList.add('playin-spot');
            }

            row.innerHTML = `
                <td class="rank-col">${rank}</td>
                <td class="team-col">
                    <div class="team-info">
                        <div class="${TEAM_LOGOS[team.full_name]}"></div>
                        <span class="team-name">${team.full_name}</span>
                    </div>
                </td>
                <td class="stat-col">${team.wins}</td>
                <td class="stat-col">${team.losses}</td>
                <td class="stat-col">${winPct}</td>
                <td class="stat-col">${gb}</td>
                <td class="stat-col mobile-hide">${team.home_record}</td>
                <td class="stat-col mobile-hide">${team.road_record}</td>
                <td class="stat-col mobile-hide">${team.conference_record}</td>
            `;

            tbody.appendChild(row);
        });

        tableWrapper.appendChild(table);
        section.appendChild(tableWrapper);

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'standings-legend';
        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-indicator playoff-indicator"></span>
                <span>Playoff Spots (1-6)</span>
            </div>
            <div class="legend-item">
                <span class="legend-indicator playin-indicator"></span>
                <span>Play-In Spots (7-10)</span>
            </div>
        `;
        section.appendChild(legend);

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
    const app = new NBAStandings();
});
