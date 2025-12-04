export default async function handler(req, res) {
    try {
        const { playerId } = req.query;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        // Use the simpler site API which has all the data we need
        const playerResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${playerId}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!playerResponse.ok) {
            throw new Error('ESPN API responded with an error');
        }

        const data = await playerResponse.json();
        const athlete = data.athlete;

        // Extract stats helper function
        const extractStats = (statsList, statNames) => {
            if (!statsList || statsList.length === 0) return null;

            const stats = {};
            statsList.forEach(stat => {
                if (statNames.includes(stat.name)) {
                    stats[stat.name] = stat.displayValue;
                }
            });
            return stats;
        };

        // Get season stats (current season averages)
        const seasonStats = athlete.statistics?.find(s => s.type === 'total' && s.displayName === 'regularSeason');
        const careerStats = athlete.statistics?.find(s => s.type === 'career' && s.displayName === 'careerRegularSeason');

        // Get last 5 games from event log
        const recentGames = athlete.eventLog?.events?.slice(0, 5) || [];

        // Stats we want to display
        const statNames = ['gamesPlayed', 'avgMinutes', 'fieldGoalPct', 'threePointFieldGoalPct',
                          'freeThrowPct', 'avgRebounds', 'avgAssists', 'avgBlocks',
                          'avgSteals', 'avgPersonalFouls', 'avgTurnovers', 'avgPoints'];

        // Process and combine the data
        const processedData = {
            player: {
                id: athlete.id,
                firstName: athlete.firstName,
                lastName: athlete.lastName,
                fullName: athlete.fullName,
                displayName: athlete.displayName,
                shortName: athlete.shortName,
                jersey: athlete.jersey,
                position: athlete.position?.displayName || 'N/A',
                positionAbbr: athlete.position?.abbreviation || 'N/A',
                height: athlete.displayHeight,
                weight: athlete.displayWeight,
                age: athlete.age,
                dateOfBirth: athlete.dateOfBirth,
                birthPlace: athlete.birthPlace?.city && athlete.birthPlace?.country
                    ? `${athlete.birthPlace.city}, ${athlete.birthPlace.country}`
                    : null,
                college: athlete.college?.name || athlete.college || null,
                experience: athlete.experience?.years,
                headshot: athlete.headshot?.href,
                status: athlete.status?.name
            },
            team: athlete.team ? {
                id: athlete.team.id,
                name: athlete.team.displayName,
                abbreviation: athlete.team.abbreviation,
                logo: athlete.team.logos?.[0]?.href,
                color: athlete.team.color
            } : null,
            stats: {
                season: seasonStats ? extractStats(seasonStats.stats, statNames) : null,
                career: careerStats ? extractStats(careerStats.stats, statNames) : null
            },
            recentGames: recentGames.map(event => ({
                id: event.id,
                date: event.gameDate,
                opponent: event.opponentName,
                result: event.gameResult,
                stats: event.stats || null
            }))
        };

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(processedData);

    } catch (error) {
        console.error('Error fetching player details:', error);
        res.status(500).json({
            error: 'Failed to fetch player details',
            message: error.message
        });
    }
}
