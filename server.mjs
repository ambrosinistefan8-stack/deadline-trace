import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGraph, readGraph } from './graph.mjs';

const host = '127.0.0.1';
const port = Number(process.env.DEADLINE_TRACE_PORT || 8879);
const webRoot = await realpath(fileURLToPath(new URL('./web/', import.meta.url)));
const { connection } = openGraph();
const mime = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};

function send(response, status, body, type, headers = {}) {
  response.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  const text = 'text/plain; charset=utf-8';
  if (request.method !== 'GET') {
    send(response, 405, 'Method not allowed', text, { allow: 'GET' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    send(response, 400, 'Invalid URL', text);
    return;
  }

  if (pathname === '/api/graph') {
    try {
      send(response, 200, JSON.stringify(readGraph(connection)), mime['.json']);
    } catch (error) {
      console.error(error.message);
      send(response, 500, JSON.stringify({ error: 'Relate query failed.' }), mime['.json']);
    }
    return;
  }

  try {
    const suffix = pathname === '/' ? '/index.html' : pathname;
    const file = await realpath(resolve(webRoot, `.${suffix}`));
    const subpath = relative(webRoot, file);
    const type = mime[extname(file)];
    if (isAbsolute(subpath) || subpath === '..' || subpath.startsWith(`..${sep}`) || !type) {
      send(response, 404, 'Not found', text);
      return;
    }
    send(response, 200, await readFile(file), type);
  } catch {
    send(response, 404, 'Not found', text);
  }
});

server.listen(port, host, () => {
  console.log(`Deadline Trace with embedded Relate: http://${host}:${port}/`);
});
