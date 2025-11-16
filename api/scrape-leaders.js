let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
    try {
        const cacheKey = 'espn_leaders';
        const cachedData = temporaryCache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        // ESPN's leaders API
        const categories = ['points', 'rebounds', 'assists', 'steals', 'blocks'];
        const leadersData = {};

        for (const category of categories) {
            const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/leaders?limit=10`;

            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // ESPN returns leaders organized by categories
                    if (data.categories) {
                        data.categories.forEach(cat => {
                            const catName = cat.displayName.toLowerCase();
                            if (catName.includes('point') || catName.includes('scoring')) {
                                leadersData.points = cat.leaders || [];
                            } else if (catName.includes('rebound')) {
                                leadersData.rebounds = cat.leaders || [];
                            } else if (catName.includes('assist')) {
                                leadersData.assists = cat.leaders || [];
                            } else if (catName.includes('steal')) {
                                leadersData.steals = cat.leaders || [];
                            } else if (catName.includes('block')) {
                                leadersData.blocks = cat.leaders || [];
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${category} leaders:`, error);
            }
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
