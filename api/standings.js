let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Team conference and division mapping
const TEAM_INFO = {
    'Atlanta Hawks': { conference: 'East', division: 'Southeast' },
    'Boston Celtics': { conference: 'East', division: 'Atlantic' },
    'Brooklyn Nets': { conference: 'East', division: 'Atlantic' },
    'Charlotte Hornets': { conference: 'East', division: 'Southeast' },
    'Chicago Bulls': { conference: 'East', division: 'Central' },
    'Cleveland Cavaliers': { conference: 'East', division: 'Central' },
    'Dallas Mavericks': { conference: 'West', division: 'Southwest' },
    'Denver Nuggets': { conference: 'West', division: 'Northwest' },
    'Detroit Pistons': { conference: 'East', division: 'Central' },
    'Golden State Warriors': { conference: 'West', division: 'Pacific' },
    'Houston Rockets': { conference: 'West', division: 'Southwest' },
    'Indiana Pacers': { conference: 'East', division: 'Central' },
    'LA Clippers': { conference: 'West', division: 'Pacific' },
    'Los Angeles Lakers': { conference: 'West', division: 'Pacific' },
    'Memphis Grizzlies': { conference: 'West', division: 'Southwest' },
    'Miami Heat': { conference: 'East', division: 'Southeast' },
    'Milwaukee Bucks': { conference: 'East', division: 'Central' },
    'Minnesota Timberwolves': { conference: 'West', division: 'Northwest' },
    'New Orleans Pelicans': { conference: 'West', division: 'Southwest' },
    'New York Knicks': { conference: 'East', division: 'Atlantic' },
    'Oklahoma City Thunder': { conference: 'West', division: 'Northwest' },
    'Orlando Magic': { conference: 'East', division: 'Southeast' },
    'Philadelphia 76ers': { conference: 'East', division: 'Atlantic' },
    'Phoenix Suns': { conference: 'West', division: 'Pacific' },
    'Portland Trail Blazers': { conference: 'West', division: 'Northwest' },
    'Sacramento Kings': { conference: 'West', division: 'Pacific' },
    'San Antonio Spurs': { conference: 'West', division: 'Southwest' },
    'Toronto Raptors': { conference: 'East', division: 'Atlantic' },
    'Utah Jazz': { conference: 'West', division: 'Northwest' },
    'Washington Wizards': { conference: 'East', division: 'Southeast' }
};

async function fetchAllGames(apiKey, startDate, endDate) {
    const allGames = [];

    // Fetch in weekly chunks to reduce API calls
    let currentStart = new Date(startDate);
    const end = new Date(endDate);

    while (currentStart <= end) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 6); // 7 days at a time

        if (currentEnd > end) {
            currentEnd = end;
        }

        const startStr = currentStart.toISOString().split('T')[0];
        const endStr = currentEnd.toISOString().split('T')[0];

        const url = new URL('https://api.balldontlie.io/v1/games');
        url.searchParams.set('start_date', startStr);
        url.searchParams.set('end_date', endStr);
        url.searchParams.set('per_page', '100');

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Accept': 'application/json'
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    allGames.push(...data.data);
                }
            } else {
                console.error(`API error for ${startStr} to ${endStr}: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error fetching games for ${startStr} to ${endStr}:`, error);
        }

        currentStart.setDate(currentStart.getDate() + 7);
    }

    console.log(`Fetched ${allGames.length} total games`);
    return allGames;
}

function calculateStandings(games) {
    const standings = {};

    // Initialize all teams
    Object.keys(TEAM_INFO).forEach(teamName => {
        standings[teamName] = {
            full_name: teamName,
            conference: TEAM_INFO[teamName].conference,
            division: TEAM_INFO[teamName].division,
            wins: 0,
            losses: 0,
            home_wins: 0,
            home_losses: 0,
            road_wins: 0,
            road_losses: 0,
            conf_wins: 0,
            conf_losses: 0
        };
    });

    // Process all completed games
    const completedGames = games.filter(game => game.status === 'Final');
    console.log(`Processing ${completedGames.length} completed games out of ${games.length} total games`);

    completedGames.forEach(game => {
        const homeTeam = game.home_team.full_name;
        const awayTeam = game.visitor_team.full_name;
        const homeScore = game.home_team_score;
        const awayScore = game.visitor_team_score;

        if (!standings[homeTeam] || !standings[awayTeam]) return;

        const homeWon = homeScore > awayScore;
        const sameConference = TEAM_INFO[homeTeam].conference === TEAM_INFO[awayTeam].conference;

        if (homeWon) {
            // Home team won
            standings[homeTeam].wins++;
            standings[homeTeam].home_wins++;
            standings[awayTeam].losses++;
            standings[awayTeam].road_losses++;

            if (sameConference) {
                standings[homeTeam].conf_wins++;
                standings[awayTeam].conf_losses++;
            }
        } else {
            // Away team won
            standings[awayTeam].wins++;
            standings[awayTeam].road_wins++;
            standings[homeTeam].losses++;
            standings[homeTeam].home_losses++;

            if (sameConference) {
                standings[awayTeam].conf_wins++;
                standings[homeTeam].conf_losses++;
            }
        }
    });

    // Format standings data
    return Object.values(standings).map(team => ({
        full_name: team.full_name,
        conference: team.conference,
        division: team.division,
        wins: team.wins,
        losses: team.losses,
        home_record: `${team.home_wins}-${team.home_losses}`,
        road_record: `${team.road_wins}-${team.road_losses}`,
        conference_record: `${team.conf_wins}-${team.conf_losses}`
    }));
}

export default async function handler(req, res) {
    try {
        const { season } = req.query;
        const seasonYear = season || '2025';

        // Check temporary cache
        const cacheKey = `standings_${seasonYear}`;
        const cachedData = temporaryCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        const API_KEY = process.env.BALLDONTLIE_API_KEY;
        if (!API_KEY) {
            throw new Error('API key is not configured');
        }

        // Fetch all games from season start to today
        const startDate = '2025-10-15'; // Season start
        const today = new Date().toISOString().split('T')[0];

        const games = await fetchAllGames(API_KEY, startDate, today);
        const standings = calculateStandings(games);

        const responseData = {
            data: standings,
            meta: { next_cursor: null }
        };

        temporaryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });

        // Cleanup old temporary cache entries
        for (const [key, value] of temporaryCache.entries()) {
            if (Date.now() - value.timestamp > TEMP_CACHE_DURATION) {
                temporaryCache.delete(key);
            }
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({
            error: 'Failed to fetch standings',
            message: error.message
        });
    }
}
