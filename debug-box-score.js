// Native fetch is available in Node 18+

async function checkGameDetails() {
    // We need a valid game ID. I'll try to find one from the schedule first.
    // Or I can just use a hardcoded one if I knew it.
    // Let's fetch the schedule first to get a game ID.

    try {
        const date = '20241203'; // Today
        const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;
        console.log(`Fetching schedule from ${scheduleUrl}...`);

        const scheduleRes = await fetch(scheduleUrl);
        const scheduleData = await scheduleRes.json();

        if (!scheduleData.events || scheduleData.events.length === 0) {
            console.log('No games found for today.');
            return;
        }

        const gameId = scheduleData.events[0].id;
        console.log(`Found game ID: ${gameId}`);

        // Now fetch our local API logic (simulated)
        // Since I can't call the local API endpoint directly from this script easily without running the server,
        // I will replicate the logic from api/game-details.js here to test the extraction.

        const detailsUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
        console.log(`Fetching details from ${detailsUrl}...`);

        const detailsRes = await fetch(detailsUrl);
        const data = await detailsRes.json();
        const header = data.header;

        // Test extraction logic
        const competition = header.competitions[0];
        let broadcasts = [];
        if (competition.broadcasts) {
            console.log('Found competition.broadcasts:', JSON.stringify(competition.broadcasts, null, 2));
            broadcasts = competition.broadcasts.map(b => b.media?.shortName).filter(Boolean);
        } else if (competition.geoBroadcasts) {
            console.log('Found competition.geoBroadcasts');
            broadcasts = competition.geoBroadcasts.map(b => b.media?.shortName).filter(Boolean);
        } else {
            console.log('No broadcasts found in header.');
        }

        const uniqueBroadcasts = [...new Set(broadcasts)];
        console.log('Extracted Broadcasts:', uniqueBroadcasts);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkGameDetails();
