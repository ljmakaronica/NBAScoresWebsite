export default async function handler(req, res) {
    try {
        const { playerId } = req.query;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        // Fetch player data from ESPN API
        const playerResponse = await fetch(`http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${playerId}?lang=en&region=us`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!playerResponse.ok) {
            throw new Error('ESPN API responded with an error');
        }

        const playerData = await playerResponse.json();

        // Fetch additional data (stats, team info)
        const additionalRequests = [];

        // Fetch team info if available
        if (playerData.team?.$ref) {
            additionalRequests.push(
                fetch(playerData.team.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch statistics if available
        if (playerData.statistics?.$ref) {
            additionalRequests.push(
                fetch(playerData.statistics.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch position if available
        if (playerData.position?.$ref) {
            additionalRequests.push(
                fetch(playerData.position.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        const [teamInfo, statistics, positionInfo] = await Promise.all(additionalRequests);

        // Process and combine the data
        const processedData = {
            player: {
                id: playerData.id,
                firstName: playerData.firstName,
                lastName: playerData.lastName,
                fullName: playerData.fullName,
                displayName: playerData.displayName,
                shortName: playerData.shortName,
                jersey: playerData.jersey,
                position: positionInfo?.displayName || positionInfo?.name || playerData.position?.abbreviation || 'N/A',
                positionAbbr: positionInfo?.abbreviation || playerData.position?.abbreviation || 'N/A',
                height: playerData.displayHeight,
                weight: playerData.displayWeight,
                age: playerData.age,
                dateOfBirth: playerData.dateOfBirth,
                birthPlace: playerData.birthPlace?.city && playerData.birthPlace?.country
                    ? `${playerData.birthPlace.city}, ${playerData.birthPlace.country}`
                    : null,
                college: playerData.college?.name || playerData.college || null,
                experience: playerData.experience?.years,
                headshot: playerData.headshot?.href,
                status: playerData.status?.name
            },
            team: teamInfo ? {
                id: teamInfo.id,
                name: teamInfo.displayName,
                abbreviation: teamInfo.abbreviation,
                logo: teamInfo.logos?.[0]?.href,
                color: teamInfo.color
            } : null,
            statistics: statistics?.splits?.categories || null
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
