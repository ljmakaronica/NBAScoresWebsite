// Server-side cache objects - separate for past and current/future games
let permanentCache = new Map();  // For completed games
let temporaryCache = new Map();  // For today/future games
const TEMP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default async function handler(req, res) {
    try {
        const { start_date } = req.query;
        const requestDate = new Date(start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);  // Set to beginning of day for accurate comparison

        // If it's a past date and we have it in permanent cache, return it
        if (requestDate < today && permanentCache.has(start_date)) {
            return res.status(200).json(permanentCache.get(start_date));
        }

        // Check temporary cache for current/future dates
        if (requestDate >= today) {
            const cachedData = temporaryCache.get(start_date);
            if (cachedData && (Date.now() - cachedData.timestamp) < TEMP_CACHE_DURATION) {
                return res.status(200).json(cachedData.data);
            }
        }

        const API_KEY = process.env.BALLDONTLIE_API_KEY;
        if (!API_KEY) {
            throw new Error('API key is not configured');
        }

        // Get games for the specific date
        const url = new URL('https://api.balldontlie.io/v1/games');
        url.searchParams.set('start_date', start_date);
        url.searchParams.set('end_date', start_date);  // Same as start_date since we're only getting one day
        url.searchParams.set('per_page', '100');

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
        
        // Prepare response data
        const responseData = {
            data: data.data,
            meta: { next_cursor: null }
        };

        // Store in appropriate cache based on date and game status
        if (requestDate < today && data.data.every(game => game.status === 'Final')) {
            // If it's a past date and all games are final, store in permanent cache
            permanentCache.set(start_date, responseData);
        } else {
            // Store in temporary cache
            temporaryCache.set(start_date, {
                data: responseData,
                timestamp: Date.now()
            });
        }

        // Cleanup old temporary cache entries
        for (const [key, value] of temporaryCache.entries()) {
            if (Date.now() - value.timestamp > TEMP_CACHE_DURATION) {
                temporaryCache.delete(key);
            }
        }

        // Return the games
        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({
            error: 'Failed to fetch games',
            message: error.message
        });
    }
}