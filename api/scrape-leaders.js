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

        // Use NBA.com stats API
        const season = '2025-26';

        const categories = [
            { key: 'points', stat: 'PTS' },
            { key: 'rebounds', stat: 'REB' },
            { key: 'assists', stat: 'AST' },
            { key: 'steals', stat: 'STL' },
            { key: 'blocks', stat: 'BLK' }
        ];

        const fetchLeaders = async ({ key, stat }) => {
            try {
                // NBA.com stats API endpoint
                const url = `https://stats.nba.com/stats/leagueLeaders?LeagueID=00&PerMode=PerGame&Scope=S&Season=${season}&SeasonType=Regular+Season&StatCategory=${stat}`;

                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.nba.com/',
                        'x-nba-stats-origin': 'stats',
                        'x-nba-stats-token': 'true'
                    }
                });

                if (!response.ok) {
                    console.error(`NBA.com API error for ${key}:`, response.status);
                    return [];
                }

                const data = await response.json();

                if (!data.resultSet || !data.resultSet.rowSet) {
                    return [];
                }

                const headers = data.resultSet.headers;
                const rows = data.resultSet.rowSet;

                const nameIdx = headers.indexOf('PLAYER');
                const teamIdx = headers.indexOf('TEAM_ABBREVIATION');
                const statIdx = headers.indexOf(stat);

                if (nameIdx === -1 || teamIdx === -1 || statIdx === -1) {
                    console.error(`Column not found for ${key}`);
                    return [];
                }

                return rows.slice(0, 10).map(row => ({
                    athlete: {
                        displayName: row[nameIdx] || 'Unknown',
                        team: {
                            abbreviation: row[teamIdx] || ''
                        }
                    },
                    displayValue: String(row[statIdx] || '0.0'),
                    value: parseFloat(row[statIdx]) || 0
                }));

            } catch (error) {
                console.error(`Error fetching ${key}:`, error);
                return [];
            }
        };

        const results = await Promise.all(categories.map(fetchLeaders));

        categories.forEach((category, index) => {
            leadersData[category.key] = results[index];
        });

        const responseData = {
            data: leadersData,
            meta: {
                last_updated: new Date().toISOString(),
                source: 'NBA.com'
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
