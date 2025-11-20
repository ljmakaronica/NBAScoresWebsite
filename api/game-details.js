let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 1 * 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
    try {
        const { gameId } = req.query;

        if (!gameId) {
            return res.status(400).json({ error: 'Game ID is required' });
        }

        const cacheKey = `espn_game_detail_${gameId}`;
        const cachedData = temporaryCache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            throw new Error(`ESPN API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Process data to make it easier for frontend
        const boxscore = data.boxscore;
        const header = data.header;

        // Helper to find stats
        const getTeamStats = (teamId) => {
            const team = boxscore.teams.find(t => t.team.id === teamId);
            return team ? team.statistics : [];
        };

        const getPlayerStats = (teamId) => {
            const team = boxscore.players.find(t => t.team.id === teamId);
            return team ? team.statistics : [];
        };

        const homeTeamId = header.competitions[0].competitors.find(c => c.homeAway === 'home').id;
        const awayTeamId = header.competitions[0].competitors.find(c => c.homeAway === 'away').id;

        const processedData = {
            gameInfo: {
                status: header.competitions[0].status.type.detail,
                clock: header.competitions[0].status.displayClock,
                period: header.competitions[0].status.period
            },
            homeTeam: {
                info: boxscore.teams.find(t => t.team.id === homeTeamId).team,
                stats: getTeamStats(homeTeamId),
                players: getPlayerStats(homeTeamId)
            },
            awayTeam: {
                info: boxscore.teams.find(t => t.team.id === awayTeamId).team,
                stats: getTeamStats(awayTeamId),
                players: getPlayerStats(awayTeamId)
            }
        };

        temporaryCache.set(cacheKey, {
            data: processedData,
            timestamp: Date.now()
        });

        // Cleanup old cache
        for (const [key, value] of temporaryCache.entries()) {
            if (Date.now() - value.timestamp > TEMP_CACHE_DURATION) {
                temporaryCache.delete(key);
            }
        }

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(processedData);

    } catch (error) {
        console.error('Error fetching game details:', error);
        res.status(500).json({
            error: 'Failed to fetch game details',
            message: error.message
        });
    }
}
