import path from "path";
import type { NextConfig } from "next";

// In Docker, avoid the default .next path because older containers may have
// stale anonymous-volume state there.
const distDir =
	process.env.DOCKER === "1" ? ".next-docker" : ".next";

const nextConfig: NextConfig = {
	distDir,
	turbopack: {
		root: path.join(__dirname),
	},
};

export default nextConfig;
