import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import httpProxy from 'http-proxy';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const proxy = httpProxy.createProxyServer({
  target: process.env.WS_URL,
  ws: true,
});

app.prepare().then(() => {
  const port = process.env.PORT;

  const server = createServer((req, res) => {
    // 1. Handle standard Socket.io HTTP polling/handshake
    if (req.url.startsWith('/socket.io/')) {
      console.log('Socket.io request');
      console.log(req, res);
      proxy.web(req, res);
    } else {
      handle(req, res);
    }
  });

  // 2. Handle the WebSocket Upgrade
  server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io/')) {
      proxy.ws(req, socket, head);
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});