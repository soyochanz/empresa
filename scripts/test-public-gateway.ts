import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Stripe from 'stripe';
import { createPublicGateway } from '../gateway/app';
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'althera-gateway-'));
fs.mkdirSync(path.join(dist, 'assets'));
fs.writeFileSync(path.join(dist, 'index.html'), '<html>__APP_ORIGIN__ public</html>');
fs.writeFileSync(path.join(dist, 'assets/app.js'), 'public asset');
let received: { url?: string; body: Buffer; headers: http.IncomingHttpHeaders };
const backend = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  received = {url: req.url, body: Buffer.concat(chunks), headers: req.headers};
  res.setHeader('Set-Cookie', ['a=1; HttpOnly', 'b=2; Secure']);
  if (req.url?.startsWith('/p/')) {res.writeHead(302, {Location: 'https://checkout.stripe.com/test'}); res.end();}
  else {res.writeHead(200, {'Content-Type': 'application/json'}); res.end('{"backend":true}');}
});
await new Promise<void>(resolve => backend.listen(0, '127.0.0.1', resolve));
const backendPort = (backend.address() as any).port;
const gateway = createPublicGateway({dist, backend: `http://127.0.0.1:${backendPort}`, publicOrigin:'https://altherasolutions.com'}).listen(0, '127.0.0.1');
await new Promise<void>(resolve => gateway.once('listening', resolve));
const base = `http://127.0.0.1:${(gateway.address() as any).port}`;
try {
  for (const route of ['/', '/es', '/en/privacy']) assert.match(await (await fetch(base + route)).text(), /https:\/\/altherasolutions.com public/);
  for (const route of ['/', '/es', '/en']) {
    const response = await fetch(base + route);
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'self'");
  }
  for (const route of ['/business/account', '/business/' + 'a'.repeat(48), '/webs', '/en/privacy', '/?example=1']) {
    const response = await fetch(base + route);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'none'");
  }
  assert.equal(await (await fetch(base + '/assets/app.js')).text(), 'public asset');
  for (const route of ['/server.cjs', '/server.cjs.map', '/gateway.cjs', '/%73erver.cjs']) assert.equal((await fetch(base + route)).status, 404);
  for (const route of ['/admin', '/api/health', '/pago-confirmado?stripe_session_id=test', '/?stripe_connect=success']) {
    const result = await fetch(base + route, {headers:{Authorization:'Bearer local-test'}});
    assert.equal(received!.url, route);
    assert.equal(received!.headers.authorization, 'Bearer local-test');
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.equal(result.headers.getSetCookie().length, 2);
  }
  const redirect = await fetch(base + '/p/existing?test=1', {redirect:'manual'});
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), 'https://checkout.stripe.com/test');
  const payload = '{ "id": "evt_local_test", "text": "España", "data": {} }\n';
  const stripe = new Stripe('sk_test_local');
  const secret = 'whsec_local_test_only';
  const signature = stripe.webhooks.generateTestHeaderString({payload, secret});
  await fetch(base + '/api/stripe/webhook', {method:'POST', body:payload, headers:{'Content-Type':'application/json','Stripe-Signature':signature}});
  assert.equal(received!.body.toString(), payload);
  assert.equal(stripe.webhooks.constructEvent(received!.body, received!.headers['stripe-signature'] as string, secret).id, 'evt_local_test');
  assert.equal(received!.headers['x-forwarded-host'], 'altherasolutions.com');
  await new Promise<void>(resolve => backend.close(() => resolve()));
  assert.match(await (await fetch(base + '/en')).text(), /public/);
  assert.equal((await fetch(base + '/api/health')).status, 502);
  console.log('Gateway verified: offline landing, private routes, callbacks, redirects, cookies, auth and exact signed webhook bytes.');
} finally {
  gateway.closeAllConnections(); gateway.close(); backend.closeAllConnections(); backend.close();
  fs.rmSync(dist, {recursive:true, force:true});
}
