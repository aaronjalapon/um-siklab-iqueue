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
};

export default nextConfig;
