import type { IncomingMessage, ServerResponse } from 'node:http';
// Read at the hosting edge so a downstream API proxy cannot change the country.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const value = req.headers['x-vercel-ip-country'];
  const raw = typeof value === 'string' ? value : '';
  const country = /^[A-Z]{2}$/i.test(raw) && raw.toUpperCase() !== 'XX' ? raw.toUpperCase() : null;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ country }));
}
