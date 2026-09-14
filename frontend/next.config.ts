import type { NextConfig } from "next";

// In Docker, avoid the default .next path because older containers may have
// stale anonymous-volume state there.
const distDir =
	process.env.DOCKER === "1" ? ".next-docker" : ".next";
const apiProxyTarget =
	process.env.API_PROXY_TARGET ?? "http://localhost:8000";

function getLanDevOrigins(): string[] {
	const specificHosts = [
		"localhost",
		"localhost:3000",
		"127.0.0.1",
		"127.0.0.1:3000",
		"192.168.110.153",
		"192.168.110.153:3000",
		"192.168.254.180",
		"192.168.254.180:3000",
	];

	// Allow environment variable override (e.g. LAN_IP=192.168.x.x or ALLOWED_DEV_ORIGINS=...)
	const envHosts = (process.env.ALLOWED_DEV_ORIGINS || process.env.LAN_IP || "")
		.split(",")
		.map((h) => h.trim())
		.filter(Boolean);

	for (const host of envHosts) {
		specificHosts.push(host);
		if (!host.includes(":")) {
			specificHosts.push(`${host}:3000`);
		}
	}

	// Pre-generate standard /24 subnets so connecting via common Wi-Fi networks works automatically
	const commonSubnets = [
		"192.168.110", // Current Wi-Fi network
		"192.168.254", // Previous Wi-Fi network
		"192.168.1",   // Standard home router (PLDT / Globe / Asus / TP-Link)
		"192.168.0",   // Standard router (D-Link / Tenda / Netgear)
		"192.168.100", // Converge ICT default router
		"172.20.10",   // iOS Personal Hotspot default subnet
	];

	for (const subnet of commonSubnets) {
		for (let i = 1; i <= 254; i++) {
			specificHosts.push(`${subnet}.${i}`);
			specificHosts.push(`${subnet}.${i}:3000`);
		}
	}

	return Array.from(new Set(specificHosts));
}

function buildServiceWorkerCsp() {
	const apiBase =
		process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

	let connectSources = ["'self'"];

	try {
		const url = new URL(apiBase);
		connectSources.push(url.origin);
	} catch {
		// Ignore malformed API URLs and keep the worker CSP self-only fallback.
	}

	if (process.env.NODE_ENV !== "production") {
		connectSources = [
			...connectSources,
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://192.168.110.153:3000",
			"http://192.168.254.180:3000",
			"http://localhost:8000",
			"http://127.0.0.1:8000",
			"http://192.168.110.153:8000",
			"http://192.168.254.180:8000",
			"ws://localhost:3000",
			"ws://127.0.0.1:3000",
			"ws://192.168.110.153:3000",
			"ws://192.168.254.180:3000",
			"http:",
			"ws:",
		];
	}

	const uniqueSources = Array.from(new Set(connectSources));

	return [
		"default-src 'self'",
		"script-src 'self'",
		`connect-src ${uniqueSources.join(" ")}`,
	].join("; ");
}

const nextConfig: NextConfig = {
	distDir,
	allowedDevOrigins: getLanDevOrigins(),
	turbopack: {
		root: process.cwd(),
	},
	webpack: (config, { dev }) => {
		if (dev) {
			config.watchOptions = {
				poll: 800,
				aggregateTimeout: 200,
			};
		}
		return config;
	},
	async rewrites() {
		return [
			{
				source: "/api/v1/:path*",
				destination: `${apiProxyTarget}/api/v1/:path*`,
			},
		];
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
				],
			},
			{
				source: "/sw.js",
				headers: [
					{
						key: "Content-Type",
						value: "application/javascript; charset=utf-8",
					},
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{
						key: "Content-Security-Policy",
						value: buildServiceWorkerCsp(),
					},
				],
			},
			{
				source: "/manifest.webmanifest",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=3600, must-revalidate",
					},
				],
			},
		];
	},
};

export default nextConfig;
