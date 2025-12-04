export default async function handler(req, res) {
    try {
        const { teamId } = req.query;

        if (!teamId) {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        // Fetch all team data in parallel
        const [teamInfoResponse, scheduleResponse, statsResponse, rosterResponse] = await Promise.all([
            fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }),
            fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }),
            fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/statistics`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }),
            fetch(`http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            })
        ]);

        if (!teamInfoResponse.ok || !scheduleResponse.ok || !statsResponse.ok || !rosterResponse.ok) {
            throw new Error('ESPN API responded with an error');
        }

        const [teamInfo, schedule, stats, roster] = await Promise.all([
            teamInfoResponse.json(),
            scheduleResponse.json(),
            statsResponse.json(),
            rosterResponse.json()
        ]);

        // Process and combine the data
        const processedData = {
            team: {
                id: teamInfo.team.id,
                name: teamInfo.team.displayName,
                abbreviation: teamInfo.team.abbreviation,
                logo: teamInfo.team.logos?.[0]?.href,
                color: teamInfo.team.color,
                alternateColor: teamInfo.team.alternateColor,
                location: teamInfo.team.location,
                nickname: teamInfo.team.name
            },
            record: {
                overall: teamInfo.team.record?.items?.find(r => r.type === 'total')?.summary || 'N/A',
                home: teamInfo.team.record?.items?.find(r => r.type === 'home')?.summary || 'N/A',
                away: teamInfo.team.record?.items?.find(r => r.type === 'road')?.summary || 'N/A',
                standing: teamInfo.team.standingSummary || 'N/A'
            },
            nextGame: teamInfo.team.nextEvent?.[0] ? {
                id: teamInfo.team.nextEvent[0].id,
                name: teamInfo.team.nextEvent[0].name,
                shortName: teamInfo.team.nextEvent[0].shortName,
                date: teamInfo.team.nextEvent[0].date
            } : null,
            statistics: stats.results?.stats?.categories || [],
            schedule: {
                events: schedule.events || [],
                season: schedule.season
            },
            roster: roster.athletes || []
        };

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(processedData);

    } catch (error) {
        console.error('Error fetching team details:', error);
        res.status(500).json({
            error: 'Failed to fetch team details',
            message: error.message
        });
    }
}
