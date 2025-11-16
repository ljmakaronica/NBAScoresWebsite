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

        // Scrape ESPN stats page HTML
        const url = 'https://www.espn.com/nba/stats';

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`ESPN responded with status: ${response.status}`);
        }

        const html = await response.text();

        // Extract JSON data embedded in the page
        const scriptMatch = html.match(/window\['__espnfitt__'\]\s*=\s*({.*?});/s);

        if (scriptMatch) {
            const pageData = JSON.parse(scriptMatch[1]);

            // Navigate through the data structure to find leaders
            const leaders = pageData?.page?.content?.leaders?.leaders;

            if (leaders && Array.isArray(leaders)) {
                leaders.forEach(category => {
                    const categoryName = category.displayName?.toLowerCase() || '';
                    const leadersList = category.leaders || [];

                    const formattedLeaders = leadersList.map(leader => ({
                        athlete: {
                            displayName: leader.athlete?.displayName || 'Unknown',
                            team: {
                                abbreviation: leader.athlete?.team?.abbreviation || ''
                            }
                        },
                        displayValue: leader.displayValue || '0.0',
                        value: parseFloat(leader.displayValue || '0')
                    }));

                    if (categoryName.includes('point') || categoryName.includes('scoring')) {
                        leadersData.points = formattedLeaders;
                    } else if (categoryName.includes('rebound')) {
                        leadersData.rebounds = formattedLeaders;
                    } else if (categoryName.includes('assist')) {
                        leadersData.assists = formattedLeaders;
                    } else if (categoryName.includes('steal')) {
                        leadersData.steals = formattedLeaders;
                    } else if (categoryName.includes('block')) {
                        leadersData.blocks = formattedLeaders;
                    }
                });
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
