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

        // Fetch leaders from ESPN stats API
        const categories = [
            { key: 'points', endpoint: 'avgPoints' },
            { key: 'rebounds', endpoint: 'avgRebounds' },
            { key: 'assists', endpoint: 'avgAssists' },
            { key: 'steals', endpoint: 'avgSteals' },
            { key: 'blocks', endpoint: 'avgBlocks' }
        ];

        const fetchPromises = categories.map(async ({ key, endpoint }) => {
            try {
                const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&limit=10&sort=${endpoint}:desc`;

                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.athletes && data.athletes.length > 0) {
                        leadersData[key] = data.athletes.slice(0, 10).map(athlete => {
                            const statValue = athlete.categories?.[0]?.totals?.find(t => t.name === endpoint);
                            return {
                                athlete: {
                                    displayName: athlete.athlete?.displayName || 'Unknown',
                                    team: {
                                        abbreviation: athlete.athlete?.team?.abbreviation || ''
                                    }
                                },
                                displayValue: statValue?.displayValue || '0.0',
                                value: parseFloat(statValue?.displayValue || '0')
                            };
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${key} leaders:`, error);
            }
        });

        await Promise.all(fetchPromises);

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
