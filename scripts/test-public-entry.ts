import assert from 'node:assert/strict';
import { isPublicEntry } from '../src/utils/publicEntry';
for (const path of ['/', '/es', '/en/', '/es/privacy', '/en/cookies/', '/terms', '/legal']) {
  assert.equal(isPublicEntry(path, '?utm_source=test', '#contacto'), true, path);
}
for (const path of ['/portal', '/area-privada', '/admin', '/admin/finanzas', '/login', '/acceso', '/comerciales/panel', '/pago-confirmado', '/unknown']) {
  assert.equal(isPublicEntry(path), false, path);
}
for (const query of ['?stripe_status=success', '?stripe_session_id=cs_123', '?code=oauth', '?token_hash=token', '?error_description=denied']) {
  assert.equal(isPublicEntry('/', query), false, query);
}
for (const hash of ['#access_token=test', '#refresh_token=test&type=recovery', '#type=recovery', '#error=access_denied']) {
  assert.equal(isPublicEntry('/', '', hash), false, hash);
}
console.log('Public entry routes and private/payment/auth callbacks verified.');
