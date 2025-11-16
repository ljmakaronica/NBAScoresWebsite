let temporaryCache = new Map();
const TEMP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default async function handler(req, res) {
    try {
        const { season } = req.query;
        const seasonYear = season || '2025'; // Default to current season

        // Check temporary cache
        const cacheKey = `standings_${seasonYear}`;
        const cachedData = temporaryCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
            return res.status(200).json(cachedData.data);
        }

        const API_KEY = process.env.BALLDONTLIE_API_KEY;
        if (!API_KEY) {
            throw new Error('API key is not configured');
        }

        // Get standings for the specific season
        const url = new URL('https://api.balldontlie.io/v1/standings');
        url.searchParams.set('season', seasonYear);

        // Make the request to BallDontLie API
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': API_KEY,
                'Accept': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`BallDontLie API responded with status: ${response.status}`);
        }

        const data = await response.json();

        const responseData = {
            data: data.data,
            meta: { next_cursor: null }
        };

        temporaryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });

        // Cleanup old temporary cache entries
        for (const [key, value] of temporaryCache.entries()) {
            if (Date.now() - value.timestamp > TEMP_CACHE_DURATION) {
                temporaryCache.delete(key);
            }
        }

        // Return the standings
        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({
            error: 'Failed to fetch standings',
            message: error.message
        });
    }
}
