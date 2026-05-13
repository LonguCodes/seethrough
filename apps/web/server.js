import { createServer } from 'node:http';
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
    if (req.url.startsWith('/socket.io/')) {
      proxy.web(req, res, { target: process.env.WS_URL });
    } else if (req.url.startsWith('/api/proxy/')) {
      req.url = req.url.replace('/api/proxy/', '/api/');
      proxy.web(req, res, { target: process.env.API_URL });
    } else {
      handle(req, res);
    }
  });
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