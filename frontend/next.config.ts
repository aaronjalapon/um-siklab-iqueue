import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// In Docker, write the dev cache to /tmp — the /app/.next path can be read-only
// or mapped in a way that Turbopack cannot create nested directories.
const isDocker =
	process.env.DOCKER === "1" || fs.existsSync("/.dockerenv");

const distDir = isDocker ? "/tmp/iqueue-next" : ".next";

const nextConfig: NextConfig = {
	distDir,
	turbopack: {
		root: path.join(__dirname),
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
