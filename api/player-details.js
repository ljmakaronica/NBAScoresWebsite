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

        // Fetch college info if it's a ref
        if (playerData.college?.$ref) {
            additionalRequests.push(
                fetch(playerData.college.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch statistics log to get season-by-season stats
        if (playerData.statisticslog?.$ref) {
            additionalRequests.push(
                fetch(playerData.statisticslog.$ref, {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                }).then(r => r.json()).catch(() => null)
            );
        } else {
            additionalRequests.push(Promise.resolve(null));
        }

        // Fetch career statistics
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

        const [teamInfo, positionInfo, collegeInfo, statisticsLog, careerStatistics, gameLogData] = await Promise.all(additionalRequests);

        // Helper to extract all stats from splits.categories into a flat array
        const extractStatsFromSplits = (statistics) => {
            if (!statistics?.splits?.categories || !Array.isArray(statistics.splits.categories)) {
                return [];
            }
            const allStats = [];
            statistics.splits.categories.forEach(category => {
                if (category.stats && Array.isArray(category.stats)) {
                    allStats.push(...category.stats);
                }
            });
            return allStats;
        };

        // Fetch current season stats from statisticslog
        let seasonStats = null;
        if (statisticsLog?.entries && Array.isArray(statisticsLog.entries) && statisticsLog.entries.length > 0) {
            // Get the most recent season (first entry)
            const currentSeasonEntry = statisticsLog.entries[0];
            if (currentSeasonEntry?.statistics && Array.isArray(currentSeasonEntry.statistics)) {
                // Find the total type statistics
                const totalStats = currentSeasonEntry.statistics.find(s => s.type === 'total');
                if (totalStats?.statistics?.$ref) {
                    try {
                        const seasonStatsResponse = await fetch(totalStats.statistics.$ref, {
                            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                        });
                        const seasonStatsData = await seasonStatsResponse.json();
                        seasonStats = extractStatsFromSplits(seasonStatsData);
                    } catch (e) {
                        console.error('Error fetching season stats:', e);
                    }
                }
            }
        }

        // Extract career stats
        const careerStats = extractStatsFromSplits(careerStatistics);

        // Helper to get stat value by name or abbreviation
        const getStat = (statsArray, ...searchTerms) => {
            if (!statsArray || !Array.isArray(statsArray)) return null;
            for (const term of searchTerms) {
                const stat = statsArray.find(s => 
                    s.abbreviation === term || 
                    s.name === term || 
                    s.shortDisplayName === term
                );
                if (stat?.displayValue) return stat.displayValue;
            }
            return null;
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
                college: collegeInfo?.name || (typeof playerData.college === 'string' ? playerData.college : null),
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
                season: seasonStats && seasonStats.length > 0 ? {
                    gamesPlayed: getStat(seasonStats, 'gamesPlayed', 'GP'),
                    avgMinutes: getStat(seasonStats, 'avgMinutes', 'MIN', 'MPG'),
                    fieldGoalPct: getStat(seasonStats, 'fieldGoalPct', 'FG%'),
                    threePointFieldGoalPct: getStat(seasonStats, 'threePointFieldGoalPct', '3P%'),
                    freeThrowPct: getStat(seasonStats, 'freeThrowPct', 'FT%'),
                    avgRebounds: getStat(seasonStats, 'avgRebounds', 'REB', 'RPG'),
                    avgAssists: getStat(seasonStats, 'avgAssists', 'AST', 'APG'),
                    avgBlocks: getStat(seasonStats, 'avgBlocks', 'BLK', 'BPG'),
                    avgSteals: getStat(seasonStats, 'avgSteals', 'STL', 'SPG'),
                    avgPersonalFouls: getStat(seasonStats, 'avgFouls', 'avgPersonalFouls', 'PF'),
                    avgTurnovers: getStat(seasonStats, 'avgTurnovers', 'TO', 'TOPG'),
                    avgPoints: getStat(seasonStats, 'avgPoints', 'PTS', 'PPG')
                } : null,
                career: careerStats && careerStats.length > 0 ? {
                    gamesPlayed: getStat(careerStats, 'gamesPlayed', 'GP'),
                    avgMinutes: getStat(careerStats, 'avgMinutes', 'MIN', 'MPG'),
                    fieldGoalPct: getStat(careerStats, 'fieldGoalPct', 'FG%'),
                    threePointFieldGoalPct: getStat(careerStats, 'threePointFieldGoalPct', '3P%'),
                    freeThrowPct: getStat(careerStats, 'freeThrowPct', 'FT%'),
                    avgRebounds: getStat(careerStats, 'avgRebounds', 'REB', 'RPG'),
                    avgAssists: getStat(careerStats, 'avgAssists', 'AST', 'APG'),
                    avgBlocks: getStat(careerStats, 'avgBlocks', 'BLK', 'BPG'),
                    avgSteals: getStat(careerStats, 'avgSteals', 'STL', 'SPG'),
                    avgPersonalFouls: getStat(careerStats, 'avgFouls', 'avgPersonalFouls', 'PF'),
                    avgTurnovers: getStat(careerStats, 'avgTurnovers', 'TO', 'TOPG'),
                    avgPoints: getStat(careerStats, 'avgPoints', 'PTS', 'PPG')
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
