import { sanitizeHtml, sanitizeCss } from '../lib/sanitize';

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

  if (failed > 0) {
    console.error(`\nSanitization tests failed: ${failed} failure(s) detected.`);
    process.exit(1);
  } else {
    console.log('\nAll sanitization tests passed successfully.');
  }
}

runTests();
