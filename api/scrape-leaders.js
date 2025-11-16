let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
    try {
        const cacheKey = 'espn_leaders';
        const cachedData = temporaryCache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        const leadersData = {};

        // ESPN scoreboard includes current season leaders
        const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Leaders data is in the scoreboard response
                if (data.leaders) {
                    data.leaders.forEach(category => {
                        const leaders = category.leaders.map(leader => ({
                            athlete: {
                                displayName: leader.athlete.displayName,
                                team: {
                                    abbreviation: leader.athlete.team?.abbreviation || ''
                                }
                            },
                            displayValue: leader.displayValue,
                            value: parseFloat(leader.displayValue)
                        }));

                        const name = category.name.toLowerCase();
                        if (name.includes('point') || name.includes('scoring')) {
                            leadersData.points = leaders;
                        } else if (name.includes('rebound')) {
                            leadersData.rebounds = leaders;
                        } else if (name.includes('assist')) {
                            leadersData.assists = leaders;
                        } else if (name.includes('steal')) {
                            leadersData.steals = leaders;
                        } else if (name.includes('block')) {
                            leadersData.blocks = leaders;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching leaders:', error);
        }

        const responseData = {
            data: leadersData,
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
        console.error('Error scraping leaders:', error);
        res.status(500).json({
            error: 'Failed to fetch leaders',
            message: error.message
        });
    }
}
