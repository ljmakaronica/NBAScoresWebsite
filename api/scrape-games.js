export default async function handler(req, res) {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required (format: YYYY-MM-DD)' });
        }

        // Convert YYYY-MM-DD to YYYYMMDD for ESPN API
        const espnDate = date.replace(/-/g, '');

        // ESPN's scoreboard API
        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate}`;

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

        // Parse ESPN data into our format
        const games = [];

        if (data.events) {
            data.events.forEach(event => {
                const competition = event.competitions[0];
                const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

                // Determine game status
                let status = competition.status.type.detail;
                let gameDate = event.date;

                if (competition.status.type.completed) {
                    status = 'Final';
                } else if (competition.status.type.state === 'in') {
                    status = competition.status.type.shortDetail; // "3rd Qtr", etc.
                }
                // For upcoming games, status will be time like "7:30 PM ET"
                // We'll pass the actual game date separately for parsing

                // Extract broadcasts
                let broadcasts = [];
                if (competition.broadcasts) {
                    broadcasts = competition.broadcasts.flatMap(b => b.names);
                } else if (competition.geoBroadcasts) {
                    broadcasts = competition.geoBroadcasts.map(b => b.media.shortName);
                }
                // Remove duplicates
                broadcasts = [...new Set(broadcasts)];

                games.push({
                    id: event.id,
                    date: gameDate,
                    status: status,
                    period_state: competition.status.type.state, // 'pre', 'in', 'post'
                    home_team: {
                        id: homeTeam.id,
                        full_name: homeTeam.team.displayName,
                        abbreviation: homeTeam.team.abbreviation
                    },
                    visitor_team: {
                        id: awayTeam.id,
                        full_name: awayTeam.team.displayName,
                        abbreviation: awayTeam.team.abbreviation
                    },
                    home_team_score: parseInt(homeTeam.score) || 0,
                    visitor_team_score: parseInt(awayTeam.score) || 0,
                    broadcasts: broadcasts
                });
            });
        }

        const responseData = {
            data: games,
            meta: {
                date: date,
                last_updated: new Date().toISOString(),
                source: 'ESPN'
            }
        };

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error scraping games:', error);
        res.status(500).json({
            error: 'Failed to fetch games',
            message: error.message
        });
    }
}
