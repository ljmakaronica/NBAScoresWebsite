export default async function handler(req, res) {
    try {
        const { playerId } = req.query;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        // Fetch player data from ESPN core API
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

        // Fetch additional data in parallel
        const additionalRequests = [];

        // Fetch team info
        if (playerData.team?.$ref) {
            additionalRequests.push(
                fetch(playerData.team.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch position
        if (playerData.position?.$ref) {
            additionalRequests.push(
                fetch(playerData.position.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch statistics (season stats)
        if (playerData.statistics?.$ref) {
            additionalRequests.push(
                fetch(playerData.statistics.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch Game Log (using site API for easier consumption)
        additionalRequests.push(
            fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/players/${playerId}/gamelog`, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
            }).then(r => r.json()).catch(e => {
                console.error('Error fetching game log:', e);
                return null;
            })
        );

        const [teamInfo, positionInfo, statistics, gameLogData] = await Promise.all(additionalRequests);

        // Parse stats from the splits
        let seasonStats = null;
        let careerStats = null;

        if (statistics?.splits?.categories && Array.isArray(statistics.splits.categories)) {
            statistics.splits.categories.forEach(category => {
                if (category.name === 'general' && category.splits && Array.isArray(category.splits)) {
                    category.splits.forEach(split => {
                        if (split.name === 'regularSeason' && split.type === 'total') {
                            seasonStats = split.stats;
                        } else if (split.name === 'career' && split.type === 'career') {
                            careerStats = split.stats;
                        }
                    });
                }
            });
        }

        // Helper to get stat value
        const getStat = (statsArray, abbr) => {
            if (!statsArray) return null;
            const stat = statsArray.find(s => s.abbreviation === abbr || s.name === abbr);
            return stat?.displayValue || null;
        };

        // Process Game Log
        let recentGames = [];
        if (gameLogData?.events && Array.isArray(gameLogData.events)) {
            // Get last 5 games
            const last5 = gameLogData.events.slice(0, 5);

            recentGames = last5.map(event => {
                const gameId = event.id;
                const gameDate = event.gameDate;
                const opponent = event.opponent?.displayName || 'Unknown';
                const result = event.gameResult || '-'; // W or L
                const score = event.score || '';

                // Stats are usually in event.stats
                // The structure might vary, but let's try to extract key stats
                // In this endpoint, stats might be in 'stats' array or similar
                // For now, let's just return basic info and maybe raw stats if available
                const stats = event.stats || [];

                return {
                    id: gameId,
                    date: gameDate,
                    opponent: opponent,
                    result: result,
                    score: score,
                    stats: stats // Array of values
                };
            });
        }

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
                position: positionInfo?.displayName || positionInfo?.name || 'N/A',
                positionAbbr: positionInfo?.abbreviation || 'N/A',
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
            stats: {
                season: seasonStats ? {
                    gamesPlayed: getStat(seasonStats, 'GP'),
                    avgMinutes: getStat(seasonStats, 'MPG'),
                    fieldGoalPct: getStat(seasonStats, 'FG%'),
                    threePointFieldGoalPct: getStat(seasonStats, '3P%'),
                    freeThrowPct: getStat(seasonStats, 'FT%'),
                    avgRebounds: getStat(seasonStats, 'RPG'),
                    avgAssists: getStat(seasonStats, 'APG'),
                    avgBlocks: getStat(seasonStats, 'BPG'),
                    avgSteals: getStat(seasonStats, 'SPG'),
                    avgPersonalFouls: getStat(seasonStats, 'PF'),
                    avgTurnovers: getStat(seasonStats, 'TO'),
                    avgPoints: getStat(seasonStats, 'PPG')
                } : null,
                career: careerStats ? {
                    gamesPlayed: getStat(careerStats, 'GP'),
                    avgMinutes: getStat(careerStats, 'MPG'),
                    fieldGoalPct: getStat(careerStats, 'FG%'),
                    threePointFieldGoalPct: getStat(careerStats, '3P%'),
                    freeThrowPct: getStat(careerStats, 'FT%'),
                    avgRebounds: getStat(careerStats, 'RPG'),
                    avgAssists: getStat(careerStats, 'APG'),
                    avgBlocks: getStat(careerStats, 'BPG'),
                    avgSteals: getStat(careerStats, 'SPG'),
                    avgPersonalFouls: getStat(careerStats, 'PF'),
                    avgTurnovers: getStat(careerStats, 'TO'),
                    avgPoints: getStat(careerStats, 'PPG')
                } : null
            },
            recentGames: recentGames
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
