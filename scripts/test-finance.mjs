import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tests = [
 'test-invoice-totals.ts', 'test-invoice-attachment.ts', 'test-finance-recurrence.ts',
 'test-pending-finance.ts', 'test-stripe-forecast.ts', 'test-installment-commission.ts',
 'test-commercial-cashout.ts', 'test-fixed-commission.ts', 'test-stripe-payment-date.mjs',
];
for (const test of tests) {
 const file = `scripts/${test}`;
 const args = test.endsWith('.ts') ? [require.resolve('tsx/cli'), file] : [file];
 const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
 if (result.error) throw result.error;
 if (result.status !== 0) process.exit(result.status || 1);
}
