const express = require("express");

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
	res.json({
		message: "xHuntr API is running"
	});
});

app.get("/servers/:placeId", async (req, res) => {
	const placeId = req.params.placeId;

	try {
		const url =
			`https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=100&excludeFullGames=true`;

		const response = await fetch(url);

		if (!response.ok) {
			return res.status(response.status).json({
				success: false,
				error: `Roblox API returned ${response.status}`
			});
		}

		const data = await response.json();

		if (!data || !Array.isArray(data.data)) {
			return res.json({
				success: false,
				error: "Invalid Roblox response",
				robloxResponse: data
			});
		}

		const servers = data.data.map(server => ({
			jobId: server.id,
			playing: server.playing ?? 0,
			maxPlayers: server.maxPlayers ?? 0,
			fps: server.fps ?? 0,
			ping: server.ping ?? 0,
			region: "Unknown"
		}));

		res.json({
			success: true,
			serverCount: servers.length,
			servers
		});

	} catch (error) {
		console.error(error);

		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

app.listen(PORT, () => {
	console.log(`API running on http://localhost:${PORT}`);
});