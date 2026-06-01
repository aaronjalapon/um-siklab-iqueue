import path from "path";
import type { NextConfig } from "next";

// In Docker, write the dev cache to /tmp — the /app/.next anonymous volume can end up read-only.
const distDir =
	process.env.DOCKER === "1" ? "/tmp/iqueue-next" : ".next";

const nextConfig: NextConfig = {
	distDir,
	turbopack: {
		root: path.join(__dirname),
	},
};

export default nextConfig;
