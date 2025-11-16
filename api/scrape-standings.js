let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export default async function handler(req, res) {
    try {
        const cacheKey = 'espn_standings';
        const cachedData = temporaryCache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        // ESPN's internal API for NBA standings
        const url = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';

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

        // Parse ESPN data into our format
        const standings = [];

        if (data.children) {
            data.children.forEach(conference => {
                const confName = conference.name; // "Eastern Conference" or "Western Conference"
                const confShort = confName.includes('Eastern') ? 'East' : 'West';

                if (conference.standings && conference.standings.entries) {
                    conference.standings.entries.forEach(entry => {
                        const team = entry.team;
                        const stats = entry.stats;

                        // Extract stats by name
                        const getStatValue = (name) => {
                            const stat = stats.find(s => s.name === name);
                            return stat ? parseFloat(stat.value) : 0;
                        };

                        standings.push({
                            full_name: team.displayName,
                            abbreviation: team.abbreviation,
                            conference: confShort,
                            wins: getStatValue('wins'),
                            losses: getStatValue('losses'),
                            win_pct: getStatValue('winPercent'),
                            games_back: getStatValue('gamesBehind'),
                            home_record: getStatValue('Home') || '0-0',
                            road_record: getStatValue('Road') || '0-0',
                            conference_record: getStatValue('vs. Conf.') || '0-0',
                            streak: getStatValue('streak') || 0
                        });
                    });
                }
            });
        }

        const responseData = {
            data: standings,
            meta: {
                last_updated: new Date().toISOString(),
                source: 'ESPN'
            }
        };

        temporaryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        for (const [key, value] of temporaryCache.entries()) {
            if (Date.now() - value.timestamp > TEMP_CACHE_DURATION) {
                temporaryCache.delete(key);
            }
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error scraping standings:', error);
        res.status(500).json({
            error: 'Failed to fetch standings',
            message: error.message
        });
    }
}
