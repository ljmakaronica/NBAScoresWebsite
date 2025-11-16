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

        // Scrape StatMuse for NBA leaders
        const categories = [
            { key: 'points', url: 'https://www.statmuse.com/nba/ask/nba-leaders-in-points-per-game-this-season' },
            { key: 'rebounds', url: 'https://www.statmuse.com/nba/ask/nba-leaders-in-rebounds-per-game-this-season' },
            { key: 'assists', url: 'https://www.statmuse.com/nba/ask/nba-leaders-in-assists-per-game-this-season' },
            { key: 'steals', url: 'https://www.statmuse.com/nba/ask/nba-leaders-in-steals-per-game-this-season' },
            { key: 'blocks', url: 'https://www.statmuse.com/nba/ask/nba-leaders-in-blocks-per-game-this-season' }
        ];

        const scrapeCategory = async ({ key, url }) => {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (!response.ok) return [];

                const html = await response.text();

                // StatMuse embeds data in a script tag
                const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

                if (nextDataMatch) {
                    const data = JSON.parse(nextDataMatch[1]);
                    const grid = data?.props?.pageProps?.entity?.grid;

                    if (grid && grid.rows && grid.columns) {
                        const nameColIndex = grid.columns.findIndex(col => col.title === 'NAME');
                        const teamColIndex = grid.columns.findIndex(col => col.title === 'TM');

                        // Find the per-game stat column based on category
                        let statColIndex = -1;
                        if (key === 'points') {
                            statColIndex = grid.columns.findIndex(col => col.title === 'PPG');
                        } else if (key === 'rebounds') {
                            statColIndex = grid.columns.findIndex(col => col.title === 'RPG');
                        } else if (key === 'assists') {
                            statColIndex = grid.columns.findIndex(col => col.title === 'APG');
                        } else if (key === 'steals') {
                            statColIndex = grid.columns.findIndex(col => col.title === 'SPG');
                        } else if (key === 'blocks') {
                            statColIndex = grid.columns.findIndex(col => col.title === 'BPG');
                        }

                        if (nameColIndex === -1 || teamColIndex === -1 || statColIndex === -1) {
                            console.error(`Column not found for ${key}:`, {
                                nameColIndex,
                                teamColIndex,
                                statColIndex,
                                columns: grid.columns.map(c => c.title)
                            });
                            return [];
                        }

                        return grid.rows.slice(0, 10).map(row => ({
                            athlete: {
                                displayName: row[nameColIndex] || 'Unknown',
                                team: {
                                    abbreviation: row[teamColIndex] || ''
                                }
                            },
                            displayValue: String(row[statColIndex] || '0.0'),
                            value: parseFloat(row[statColIndex]) || 0
                        }));
                    }
                }
            } catch (error) {
                console.error(`Error scraping ${key}:`, error);
            }
            return [];
        };

        // Scrape all categories in parallel
        const results = await Promise.all(categories.map(scrapeCategory));

        categories.forEach((category, index) => {
            leadersData[category.key] = results[index];
        });

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
