// Constants and configuration
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

const SEASON_START = new Date('2024-10-22T12:00:00');
const SEASON_END = new Date('2025-06-13T12:00:00');

// Increase initial range to 60 days so "today" is guaranteed to be visible on mobile
const MOBILE_INITIAL_RANGE = 60; 
const MOBILE_LOAD_INCREMENT = 30; 

class NBASchedule {
    constructor() {
        this.isLoading = false;
        this.scoreboard = document.getElementById('scoreboard');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.weekContainer = document.getElementById('weekContainer');
        this.dateDisplay = document.getElementById('date-display');

        this.width = window.innerWidth;
        // On desktop/tablet use old logic, on mobile lazy load
        if (this.width >= 1200) {
            this.daysToShow = 14;
        } else if (this.width >= 768) {
            this.daysToShow = 7;
        } else {
            this.daysToShow = null; // Mobile: lazy loading mode
        }

        if (this.daysToShow !== null && this.daysToShow > 5) {
            document.getElementById('prevDate').addEventListener('click', (e) => {
                e.preventDefault();
                this.changeWeek(-1);
            });
            document.getElementById('nextDate').addEventListener('click', (e) => {
                e.preventDefault();
                this.changeWeek(1);
            });
        }

        // Event delegation for date clicks
        this.weekContainer.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (dayEl && dayEl.dataset.date) {
                const dayDate = new Date(dayEl.dataset.date);
                if (dayDate >= SEASON_START && dayDate <= SEASON_END) {
                    this.selectedDate = dayDate;
                    this.renderCalendar();
                    this.loadGamesForDate(this.formatDate(this.selectedDate));
                }
            }
        });

        if (this.daysToShow === null) {
            this.weekContainer.addEventListener('scroll', () => this.handleScroll());
        }

        this.initializeCalendar();
    }

    initializeCalendar() {
        const today = new Date();
        let initialDate;
        if (today < SEASON_START) {
            initialDate = new Date(SEASON_START);
        } else if (today > SEASON_END) {
            initialDate = new Date(SEASON_END);
        } else {
            initialDate = new Date(today);
        }
        initialDate.setHours(12, 0, 0, 0);
        this.selectedDate = initialDate; // Ensure selectedDate = today if in range

        if (this.daysToShow === null) {
            // Mobile lazy load
            this.currentStartDate = new Date(this.selectedDate);
            this.currentStartDate.setDate(this.currentStartDate.getDate() - MOBILE_INITIAL_RANGE);
            if (this.currentStartDate < SEASON_START) {
                this.currentStartDate = new Date(SEASON_START);
            }

            this.currentEndDate = new Date(this.selectedDate);
            this.currentEndDate.setDate(this.currentEndDate.getDate() + MOBILE_INITIAL_RANGE);
            if (this.currentEndDate > SEASON_END) {
                this.currentEndDate = new Date(SEASON_END);
            }
        } else {
            // Desktop/Tablet
            const halfRange = Math.floor(this.daysToShow / 2);
            this.displayStartDate = new Date(this.selectedDate);
            this.displayStartDate.setDate(this.displayStartDate.getDate() - halfRange);
            this.clampDisplayStartDate();
        }

        this.renderCalendar();
        this.loadGamesForDate(this.formatDate(this.selectedDate));
    }

    clampDisplayStartDate() {
        if (this.daysToShow === null) return;
        if (this.displayStartDate < SEASON_START) {
            this.displayStartDate = new Date(SEASON_START);
        }

        const lastVisibleDay = new Date(this.displayStartDate);
        lastVisibleDay.setDate(lastVisibleDay.getDate() + this.daysToShow - 1);

        if (lastVisibleDay > SEASON_END) {
            const diff = (lastVisibleDay - SEASON_END) / (24*60*60*1000);
            this.displayStartDate.setDate(this.displayStartDate.getDate() - Math.ceil(diff));
            if (this.displayStartDate < SEASON_START) {
                this.displayStartDate = new Date(SEASON_START);
            }
        }
    }

    changeWeek(delta) {
        if (this.daysToShow === null) return;
        const newStart = new Date(this.displayStartDate);
        newStart.setDate(newStart.getDate() + delta * this.daysToShow);

        const lastVisibleDay = new Date(newStart);
        lastVisibleDay.setDate(lastVisibleDay.getDate() + this.daysToShow - 1);

        if (newStart < SEASON_START && lastVisibleDay < SEASON_START) {
            return;
        }
        if (lastVisibleDay > SEASON_END && newStart > SEASON_END) {
            return;
        }

        this.displayStartDate = newStart;
        this.clampDisplayStartDate();
        this.renderCalendar();
    }

    renderCalendar() {
        this.weekContainer.innerHTML = '';

        const today = new Date();
        today.setHours(12,0,0,0);

        let selectedDayEl = null;

        if (this.daysToShow === null) {
            // Mobile lazy loading
            let currentDate = new Date(this.currentStartDate);
            while (currentDate <= this.currentEndDate) {
                const dayEl = this.createDayElement(currentDate, today);
                this.weekContainer.appendChild(dayEl);
                if (this.selectedDate && currentDate.toDateString() === this.selectedDate.toDateString()) {
                    selectedDayEl = dayEl;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            // Desktop/Tablet
            for (let i = 0; i < this.daysToShow; i++) {
                const dayDate = new Date(this.displayStartDate);
                dayDate.setDate(this.displayStartDate.getDate() + i);

                if (dayDate < SEASON_START || dayDate > SEASON_END) {
                    continue;
                }

                const dayEl = this.createDayElement(dayDate, today);
                this.weekContainer.appendChild(dayEl);
                if (this.selectedDate && dayDate.toDateString() === this.selectedDate.toDateString()) {
                    selectedDayEl = dayEl;
                }
            }
        }

        // Ensure we scroll to today's date on mobile as well
        if (selectedDayEl) {
            // Give the browser a moment to render before scrolling
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        selectedDayEl.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
                    }, 50);
                });
            });
        }
    }

    createDayElement(dayDate, today) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = dayDate.toISOString();

        const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const month = dayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const dayNum = dayDate.getDate();

        const dayTextEl = document.createElement('div');
        dayTextEl.className = 'day-text';
        dayTextEl.innerHTML = `<div>${weekday}</div><div>${month} ${dayNum}</div>`;

        if (dayDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        if (this.selectedDate && dayDate.toDateString() === this.selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }

        dayEl.appendChild(dayTextEl);

        return dayEl;
    }

    handleScroll() {
        if (this.daysToShow !== null) return; // Not mobile lazy mode

        const container = this.weekContainer;
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;

        // Near left edge, load more days to the left
        if (scrollLeft < 50 && this.currentStartDate > SEASON_START) {
            const oldStart = new Date(this.currentStartDate);
            this.currentStartDate.setDate(this.currentStartDate.getDate() - MOBILE_LOAD_INCREMENT);
            if (this.currentStartDate < SEASON_START) {
                this.currentStartDate = new Date(SEASON_START);
            }

            const fragment = document.createDocumentFragment();
            let insertDate = new Date(this.currentStartDate);
            while (insertDate < oldStart) {
                const dayEl = this.createDayElement(insertDate, new Date());
                fragment.appendChild(dayEl);
                insertDate.setDate(insertDate.getDate() + 1);
            }

            const prevScrollLeft = container.scrollLeft;
            this.weekContainer.insertBefore(fragment, this.weekContainer.firstChild);
            container.scrollLeft = prevScrollLeft + (fragment.childNodes.length * 60);
        }

        // Near right edge, load more days to the right
        if (scrollLeft + clientWidth > scrollWidth - 50 && this.currentEndDate < SEASON_END) {
            const oldEnd = new Date(this.currentEndDate);
            this.currentEndDate.setDate(this.currentEndDate.getDate() + MOBILE_LOAD_INCREMENT);
            if (this.currentEndDate > SEASON_END) {
                this.currentEndDate = new Date(SEASON_END);
            }

            const fragment = document.createDocumentFragment();
            let insertDate = new Date(oldEnd);
            insertDate.setDate(insertDate.getDate() + 1);
            while (insertDate <= this.currentEndDate) {
                const dayEl = this.createDayElement(insertDate, new Date());
                fragment.appendChild(dayEl);
                insertDate.setDate(insertDate.getDate() + 1);
            }

            this.weekContainer.appendChild(fragment);
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('visible', show);
    }

    async loadGamesForDate(date) {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.isLoading = true;

        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            const selectedDateObj = new Date(date);
            selectedDateObj.setHours(12,0,0,0);

            const isPastDate = selectedDateObj < today;
            let data;

            if (isPastDate) {
                const cachedData = localStorage.getItem('games_' + date);
                if (cachedData) {
                    data = JSON.parse(cachedData);
                } else {
                    const response = await fetch(`/api/games?start_date=${date}&end_date=${date}&per_page=100`);
                    if (!response.ok) throw new Error('Failed to fetch games');
                    data = await response.json();
                    localStorage.setItem('games_' + date, JSON.stringify(data));
                }
            } else {
                const response = await fetch(`/api/games?start_date=${date}&end_date=${date}&per_page=100`);
                if (!response.ok) throw new Error('Failed to fetch games');
                data = await response.json();
            }

            this.displayGames(data.data);
            this.updateDateDisplay();

        } catch (error) {
            console.error('Error loading games:', error);
            this.showError('Failed to load games. Please try again later.');
            this.updateDateDisplay();
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    displayGames(games) {
        this.scoreboard.innerHTML = '';
        
        if (games.length === 0) {
            const noGames = document.createElement('div');
            noGames.className = 'no-games';
            noGames.textContent = 'No games scheduled for this date';
            this.scoreboard.appendChild(noGames);
            return;
        }

        const gamesGrid = document.createElement('div');
        gamesGrid.className = 'games-grid';

        games.sort((a, b) => new Date(a.status) - new Date(b.status))
             .forEach(game => {
                 gamesGrid.appendChild(this.createGameCard(game));
             });

        this.scoreboard.appendChild(gamesGrid);
    }

    createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        const status = this.formatGameStatus(game);
        
        card.innerHTML = `
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.home_team.full_name]}"></div>
                    <span class="team-name">${game.home_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.home_team_score > game.visitor_team_score ? 'winner' : ''}">
                    ${status.isComplete ? game.home_team_score : ''}
                </div>
            </div>
            <div class="team-row">
                <div class="team-info">
                    <div class="${TEAM_LOGOS[game.visitor_team.full_name]}"></div>
                    <span class="team-name">${game.visitor_team.full_name}</span>
                </div>
                <div class="team-score ${status.isComplete && game.visitor_team_score > game.home_team_score ? 'winner' : ''}">
                    ${status.isComplete ? game.visitor_team_score : ''}
                </div>
            </div>
            <div class="game-status">
                ${status.isLive ? '<div class="live-indicator"></div>' : ''}
                <span>${status.text}</span>
            </div>
        `;
        
        return card;
    }

    formatGameStatus(game) {
        if (game.status === 'Final') {
            return { 
                text: 'Final', 
                isComplete: true,
                isLive: false
            };
        } else if (game.status.includes('T')) {
            const gameTime = new Date(game.status);
            return { 
                text: gameTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    timeZone: 'America/Chicago'
                }), 
                isComplete: false,
                isLive: false
            };
        } else if (game.status.includes('Qtr')) {
            return { 
                text: game.status, 
                isComplete: false,
                isLive: true
            };
        }
        return { 
            text: game.status, 
            isComplete: false,
            isLive: false
        };
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.scoreboard.appendChild(errorDiv);
    }

    updateDateDisplay() {
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const fullDateStr = this.selectedDate.toLocaleDateString('en-US', dateOptions);
        const today = new Date();
        today.setHours(12,0,0,0);
        
        let displayStr = fullDateStr;
        if (this.selectedDate.toDateString() === today.toDateString()) {
            displayStr += ' (Today)';
        }

        this.dateDisplay.textContent = displayStr;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NBASchedule();
});
