import { sanitizeHtml, sanitizeCss, sanitizeSlug, sanitizePathSlug, trimHyphens } from '../lib/sanitize';
import { sanitizeLogValue } from '../lib/email';

const htmlPayloads = [
  { name: 'script tag', input: '<script>alert("xss")</script>', expected: '' },
  { name: 'onerror', input: '<img src=x onerror=alert("xss")>', expected: '<img src="x">' },
  { name: 'javascript link', input: '<a href="javascript:alert(1)">click</a>', expected: '<a>click</a>' },
  { name: 'svg onload (SVG stripped)', input: '<svg onload="alert(1)"></svg>', expected: '' },
];

const cssPayloads = [
  { name: 'valid css', input: 'body { color: red; }', shouldFail: false },
  { name: 'expression', input: 'body { width: expression(alert(1)); }', shouldFail: true },
  { name: 'javascript url', input: 'body { background: url("javascript:alert(1)"); }', shouldFail: true },
  { name: 'import', input: '@import "evil.css";', shouldFail: true },
];

const logPayloads = [
  { name: 'crlf forging', input: 'hello\r\n[INFO] forged', expected: 'hello  [INFO] forged' },
  { name: 'unicode line sep', input: 'line1\u2028line2\u2029line3', expected: 'line1 line2 line3' },
  { name: 'ansi escape & ctrl', input: 'bad\x1b[31mred\x00null\x7fdel', expected: 'bad [31mred null del' },
  { name: 'non-string nullish', input: undefined as unknown, expected: '' },
];

const slugPayloads = [
  { name: 'trimHyphens all dashes', fn: () => trimHyphens('---'), expected: '' },
  { name: 'trimHyphens keeps inner', fn: () => trimHyphens('--a-b--'), expected: 'a-b' },
  { name: 'sanitizeSlug standard', fn: () => sanitizeSlug('  Hello World!!  '), expected: 'hello-world' },
  { name: 'sanitizePathSlug nested', fn: () => sanitizePathSlug('/Fine-Art/--Piece_1--/'), expected: 'fine-art/piece_1' },
  { name: 'sanitizePathSlug redos resistance', fn: () => sanitizePathSlug(`${'-'.repeat(100_000)}a`), expected: 'a' },
];

function runTests() {
  console.log('--- Running Sanitization Tests ---');
  let failed = 0;

  // Test HTML
  htmlPayloads.forEach(p => {
    const sanitized = sanitizeHtml(p.input);
    const passed = p.expected === '' ? sanitized === '' : sanitized.includes(p.expected);
    if (!passed) failed++;
    console.log(`HTML [${p.name}]: ${passed ? 'PASS' : `FAIL (got: ${sanitized})`}`);
  });

  // Test CSS
  cssPayloads.forEach(p => {
    const result = sanitizeCss(p.input);
    const isBlocked = result.includes("Blocked");
    const passed = p.shouldFail ? isBlocked : !isBlocked;
    if (!passed) failed++;
    console.log(`CSS  [${p.name}]: ${passed ? 'PASS' : `FAIL (got: ${result})`}`);
  });

  // Test Log Value
  logPayloads.forEach(p => {
    const result = sanitizeLogValue(p.input);
    const passed = result === p.expected;
    if (!passed) failed++;
    console.log(`LOG  [${p.name}]: ${passed ? 'PASS' : `FAIL (got: ${JSON.stringify(result)})`}`);
  });

  // Test Slug & ReDoS Resistance
  slugPayloads.forEach(p => {
    const start = Date.now();
    const result = p.fn();
    const elapsed = Date.now() - start;
    const passed = result === p.expected && elapsed < 1000;
    if (!passed) failed++;
    console.log(`SLUG [${p.name}]: ${passed ? `PASS (${elapsed}ms)` : `FAIL (got: ${JSON.stringify(result)} in ${elapsed}ms)`}`);
  });

  if (failed > 0) {
    console.error(`\nSanitization tests failed: ${failed} failure(s) detected.`);
    process.exit(1);
  } else {
    console.log('\nAll sanitization tests passed successfully.');
  }
}

runTests();
