import { createProxyMiddleware } from 'http-proxy-middleware';

export async function GET() {
    return new Response(typeof createProxyMiddleware);
}
