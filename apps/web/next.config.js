import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['http-proxy-middleware'],
    experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../'),
    },
};

export default nextConfig;
