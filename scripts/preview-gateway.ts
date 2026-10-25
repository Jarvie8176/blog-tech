import { resolve, sep } from 'node:path';
import { routeRequest } from '../gateway/worker';

const root = resolve('dist');
const originPort = Number(process.env.ORIGIN_PORT ?? 4322);
const port = Number(process.env.PORT ?? 4321);
const origin = Bun.serve({
  hostname: '127.0.0.1',
  port: originPort,
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const filePath = resolve(root, `.${path}`, path.endsWith('/') ? 'index.html' : '');
    if (filePath !== root && !filePath.startsWith(root + sep))
      return new Response('Not found', { status: 404 });
    let file = Bun.file(filePath);
    if (!(await file.exists())) {
      const directoryIndex = Bun.file(resolve(filePath, 'index.html'));
      if (await directoryIndex.exists()) {
        url.pathname += '/';
        return Response.redirect(url, 308);
      }
      file = Bun.file(resolve(root, '404.html'));
      return new Response(file, { status: 404 });
    }
    return new Response(file);
  },
});
const gateway = Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch: (request) => routeRequest(request, { TECH_ORIGIN: `http://127.0.0.1:${originPort}` }),
});
console.log(`Local: http://127.0.0.1:${port}/tech/`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    gateway.stop(true);
    origin.stop(true);
    process.exit(0);
  });
}
