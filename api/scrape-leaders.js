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
        const debug = {};

        // Scrape ESPN stats page for leaders
        const url = 'https://www.espn.com/nba/stats';

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            debug.fetchStatus = response.status;

            if (!response.ok) {
                throw new Error(`ESPN responded with status: ${response.status}`);
            }

            const html = await response.text();
            debug.htmlLength = html.length;

            // ESPN embeds data in window['__espnfitt__']
            const dataMatch = html.match(/window\['__espnfitt__'\]\s*=\s*({[\s\S]*?});?\s*<\/script>/);
            debug.foundData = !!dataMatch;

            if (dataMatch) {
                const pageData = JSON.parse(dataMatch[1]);
                debug.pageDataKeys = Object.keys(pageData);

                // Try to find stats data in the page structure
                const statsData = pageData?.page?.content?.stats?.athletes;
                debug.hasStatsData = !!statsData;
                debug.isArray = Array.isArray(statsData);

                if (statsData && Array.isArray(statsData)) {
                    debug.statsCount = statsData.length;
                    // Sort by each stat category
                    const sortByStat = (statKey) => {
                        return statsData
                            .filter(a => a.categories && a.categories[0] && a.categories[0].totals)
                            .map(athlete => {
                                const total = athlete.categories[0].totals.find(t => t.abbreviation === statKey);
                                return {
                                    name: athlete.athlete?.displayName || 'Unknown',
                                    team: athlete.athlete?.team?.abbreviation || '',
                                    value: total ? parseFloat(total.displayValue) : 0,
                                    displayValue: total ? total.displayValue : '0.0'
                                };
                            })
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 10)
                            .map(p => ({
                                athlete: {
                                    displayName: p.name,
                                    team: { abbreviation: p.team }
                                },
                                displayValue: p.displayValue,
                                value: p.value
                            }));
                    };

                    leadersData.points = sortByStat('PPG');
                    leadersData.rebounds = sortByStat('RPG');
                    leadersData.assists = sortByStat('APG');
                    leadersData.steals = sortByStat('SPG');
                    leadersData.blocks = sortByStat('BPG');
                }
            }
        } catch (error) {
            console.error('Error scraping ESPN:', error);
        }

        const responseData = {
            data: leadersData,
            meta: {
                last_updated: new Date().toISOString(),
                source: 'ESPN'
            },
            debug
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
