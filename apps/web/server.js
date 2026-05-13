import express from 'express';
import next from 'next';
import { createProxyMiddleware } from 'http-proxy-middleware';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const API_URL = process.env.API_URL;
const WS_URL = process.env.WS_URL;

app.prepare().then(() => {
  const server = express();

  const apiProxy = createProxyMiddleware({
    target: API_URL+'/api',
    pathRewrite: function (path, req) { return path.replace('/api/proxy', '/api') },
  });

  const socketProxy = createProxyMiddleware({
    target: WS_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/socket.io': '/api/socket.io' },
  });

  server.use('/api/proxy', apiProxy);
  server.use('/socket.io', socketProxy);

  server.all('*path', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  const httpServer = server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io')) {
      socketProxy.upgrade(req, socket, head);
    }
  });
});