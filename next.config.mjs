import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false,
  },
  // Provide an explicit (empty) turbopack config to avoid the runtime error
  turbopack: {},
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
      assets: path.resolve(__dirname, "src/assets"),
    };
    return config;
  },
};

export default nextConfig;
