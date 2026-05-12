const express = require('express');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const API_URL = process.env.API_URL;
const WS_URL = process.env.WS_URL;

app.prepare().then(() => {
  const server = express();

  // 1. API Proxy: /api/proxy/* -> {API_URL}/api/*
  const apiProxy = createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/proxy': '/api' },
  });

  // 2. Socket.io Proxy: /socket.io -> {WS_URL}/api/socket.io
  // This allows the frontend to just use io()
  const socketProxy = createProxyMiddleware({
    target: WS_URL,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
  });

  // Apply proxies
  server.use('/api/proxy', apiProxy);
  server.use('/socket.io', socketProxy);

  // Default Next.js handler
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  const httpServer = server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });

  // 3. Handle WebSocket Upgrade for the root /socket.io path
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io')) {
      socketProxy.upgrade(req, socket, head);
    }
  });
});