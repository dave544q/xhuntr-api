const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const reportedServers = new Map();

const ALLOWED_XHUNTR_REGIONS = new Set([
	"Any",
	"California, USA",
	"Texas, USA",
	"Virginia, USA",
	"Illinois, USA",
	"Florida, USA",
	"New York, USA",
	"Paris, FR",
	"England, UK",
	"North Holland, NL",
	"Hesse, DE",
	"Singapore, SG",
	"Tokyo, JP",
	"NSW, AU",
	"São Paulo, BR",
	"Maharashtra, IN",
	"Washington, USA",
	"Unknown Region"
]);

function normalizeRegion(region) {
	if (!region || typeof region !== "string") {
		return "Unknown Region";
	}

	return ALLOWED_XHUNTR_REGIONS.has(region)
		? region
		: "Unknown Region";
}

app.get("/", (req, res) => {
	res.json({
		message: "xHuntr API is running",
		regions: Array.from(ALLOWED_XHUNTR_REGIONS)
	});
});

app.post("/report-server", (req, res) => {
	const data = req.body;

	if (!data.jobId || !data.placeId) {
		return res.status(400).json({
			success: false,
			error: "Missing jobId or placeId"
		});
	}

	reportedServers.set(data.jobId, {
		jobId: data.jobId,
		placeId: Number(data.placeId),
		region: normalizeRegion(data.region),
		regionSource: data.regionSource || "reported",
		updatedAt: Date.now()
	});

	res.json({
		success: true,
		message: "xHuntr server region reported"
	});
});

app.get("/servers/:placeId", async (req, res) => {
	const placeId = Number(req.params.placeId);

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

		const now = Date.now();

		const servers = data.data.map(server => {
			const report = reportedServers.get(server.id);

			let region = "Unknown Region";
			let regionSource = "none";

			if (report && now - report.updatedAt <= 120000) {
				region = normalizeRegion(report.region);
				regionSource = report.regionSource;
			}

			return {
				jobId: server.id,
				playing: server.playing ?? 0,
				maxPlayers: server.maxPlayers ?? 0,
				fps: server.fps ?? 0,
				ping: server.ping ?? 0,
				region,
				regionSource
			};
		});

		res.json({
			success: true,
			serverCount: servers.length,
			regions: Array.from(ALLOWED_XHUNTR_REGIONS),
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
	console.log(`xHuntr API running on port ${PORT}`);
});
