let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

export default async function handler(req, res) {
    try {
        const cacheKey = 'espn_teams';
        const cachedData = temporaryCache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        // ESPN's teams API
        const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';

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

        // Parse teams data
        const teams = [];

        if (data.sports && data.sports[0] && data.sports[0].leagues) {
            const league = data.sports[0].leagues[0];

            if (league.teams) {
                league.teams.forEach(teamData => {
                    const team = teamData.team;

                    teams.push({
                        id: team.id,
                        name: team.displayName,
                        abbreviation: team.abbreviation,
                        logo: team.logos ? team.logos[0].href : null,
                        color: team.color || null,
                        record: team.record ? team.record.items[0].summary : null,
                        standingSummary: team.standingSummary || null
                    });
                });
            }
        }

        const responseData = {
            data: teams,
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
        console.error('Error scraping teams:', error);
        res.status(500).json({
            error: 'Failed to fetch teams',
            message: error.message
        });
    }
}
