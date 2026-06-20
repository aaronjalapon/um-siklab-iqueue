import type { NextConfig } from "next";

// In Docker, avoid the default .next path because older containers may have
// stale anonymous-volume state there.
const distDir =
	process.env.DOCKER === "1" ? ".next-docker" : ".next";

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
						value: "default-src 'self'; script-src 'self'",
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
