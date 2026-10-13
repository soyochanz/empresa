import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { isPublicEntry } from '../src/utils/publicEntry';

export function createPublicGateway(options: { dist: string; backend: string; publicOrigin: string }) {
  const app = express();
  app.disable('x-powered-by');
  const backend = new URL(options.backend);
  const publicOrigin = new URL(options.publicOrigin);
  const html = fs.readFileSync(path.join(options.dist, 'index.html'), 'utf8').replaceAll('__APP_ORIGIN__', publicOrigin.origin);
  const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
  const staticFiles = express.static(options.dist, { index: false, redirect: false, dotfiles: 'deny' });
  app.use((req, res, next) => {
    res.setHeader('X-Althera-Gateway', 'public-v1');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const normalizedPath = decodeURIComponent(new URL(req.originalUrl, publicOrigin).pathname);
    if (/\.(?:cjs|map)$/.test(normalizedPath)) return res.sendStatus(404);
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const url = new URL(req.originalUrl, publicOrigin);
    if (isPublicEntry(url.pathname, url.search)) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      return res.type('html').send(html);
    }
    if (url.pathname === '/api/locale') {
      const raw = req.get('cf-ipcountry') || '';
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({ country: /^[A-Z]{2}$/i.test(raw) && raw !== 'XX' ? raw.toUpperCase() : null });
    }
    // Only public frontend files. Never expose bundled backend code or source maps.
    if (!url.pathname.endsWith('.map') && (/^\/(assets|landing|fonts)\//.test(url.pathname) || /^\/[^/]+\.(png|webp|jpg|jpeg|svg|ico|txt|xml|webmanifest)$/.test(url.pathname))) {
      return staticFiles(req, res, next);
    }
    next();
  });
  app.use((req, res) => {
    // No body parser here: Stripe's exact bytes and signature must reach Render unchanged.
    const headers = { ...req.headers };
    const connectionTokens = String(headers.connection || '').split(',').map(value => value.trim().toLowerCase());
    for (const name of [...hopHeaders, ...connectionTokens]) delete headers[name];
    headers.host = backend.host;
    headers['x-forwarded-host'] = publicOrigin.host;
    headers['x-forwarded-proto'] = publicOrigin.protocol.slice(0, -1);
    const transport = backend.protocol === 'https:' ? https : http;
    const upstream = transport.request({ protocol: backend.protocol, hostname: backend.hostname, port: backend.port || undefined, method: req.method, path: req.originalUrl, headers }, response => {
      res.statusCode = response.statusCode || 502;
      const responseConnection = String(response.headers.connection || '').split(',').map(value => value.trim().toLowerCase());
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined && ![...hopHeaders, ...responseConnection].includes(name)) res.setHeader(name, value);
      }
      res.setHeader('Cache-Control', 'private, no-store');
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.setTimeout(120_000, () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', () => {
      if (res.headersSent) return res.destroy();
      res.status(502).setHeader('Cache-Control', 'no-store');
      res.end('El servicio privado no está disponible temporalmente. Inténtalo de nuevo.');
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
  return app;
}
