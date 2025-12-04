export default async function handler(req, res) {
    try {
        const { gameId } = req.query;

        if (!gameId) {
            return res.status(400).json({ error: 'Game ID is required' });
        }

        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;

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

        // Process data to make it easier for frontend
        const boxscore = data.boxscore;
        const header = data.header;

        // Helper to find stats
        const getTeamStats = (teamId) => {
            const team = boxscore.teams.find(t => t.team.id === teamId);
            return team ? team.statistics : [];
        };

        const getPlayerStats = (teamId) => {
            const team = boxscore.players.find(t => t.team.id === teamId);
            return team ? team.statistics : [];
        };

        const homeTeamId = header.competitions[0].competitors.find(c => c.homeAway === 'home').id;
        const awayTeamId = header.competitions[0].competitors.find(c => c.homeAway === 'away').id;

        const homeScore = header.competitions[0].competitors.find(c => c.homeAway === 'home').score;
        const awayScore = header.competitions[0].competitors.find(c => c.homeAway === 'away').score;

        const processedData = {
            gameInfo: {
                status: header.competitions[0].status.type.detail,
                clock: header.competitions[0].status.displayClock,
                period: header.competitions[0].status.period,
                broadcasts: (() => {
                    const competition = header.competitions[0];
                    let broadcasts = [];
                    if (competition.broadcasts) {
                        broadcasts = competition.broadcasts.flatMap(b => b.names);
                    } else if (competition.geoBroadcasts) {
                        broadcasts = competition.geoBroadcasts.map(b => b.media.shortName);
                    }
                    return [...new Set(broadcasts)];
                })()
            },
            homeTeam: {
                info: boxscore.teams.find(t => t.team.id === homeTeamId).team,
                score: homeScore,
                stats: getTeamStats(homeTeamId),
                players: getPlayerStats(homeTeamId)
            },
            awayTeam: {
                info: boxscore.teams.find(t => t.team.id === awayTeamId).team,
                score: awayScore,
                stats: getTeamStats(awayTeamId),
                players: getPlayerStats(awayTeamId)
            }
        };

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(processedData);

    } catch (error) {
        console.error('Error fetching game details:', error);
        res.status(500).json({
            error: 'Failed to fetch game details',
            message: error.message
        });
    }
}
