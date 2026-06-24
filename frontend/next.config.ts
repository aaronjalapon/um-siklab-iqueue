import type { NextConfig } from "next";

// In Docker, avoid the default .next path because older containers may have
// stale anonymous-volume state there.
const distDir =
	process.env.DOCKER === "1" ? ".next-docker" : ".next";

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
			"http://localhost:8000",
			"http://127.0.0.1:8000",
			"ws://localhost:3000",
			"ws://127.0.0.1:3000",
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
	turbopack: {
		root: process.cwd(),
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
