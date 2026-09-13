import { sanitizeHtml, sanitizeCss } from '../lib/sanitize';

const htmlPayloads = [
  { name: 'script tag', input: '<script>alert("xss")</script>', expected: '' },
  { name: 'onerror', input: '<img src=x onerror=alert("xss")>', expected: '<img src="x">' },
  { name: 'javascript link', input: '<a href="javascript:alert(1)">click</a>', expected: '<a>click</a>' },
  { name: 'svg onload', input: '<svg onload="alert(1)"></svg>', expected: '<svg></svg>' },
];

const cssPayloads = [
  { name: 'valid css', input: 'body { color: red; }', shouldFail: false },
  { name: 'expression', input: 'body { width: expression(alert(1)); }', shouldFail: true },
  { name: 'javascript url', input: 'body { background: url("javascript:alert(1)"); }', shouldFail: true },
  { name: 'import', input: '@import "evil.css";', shouldFail: true },
];

function runTests() {
  console.log('--- Running Sanitization Tests ---');

  // Test HTML
  htmlPayloads.forEach(p => {
    const sanitized = sanitizeHtml(p.input);
    const passed = sanitized.includes(p.expected) || (p.expected === '' && sanitized === '');
    console.log(`HTML [${p.name}]: ${passed ? 'PASS' : `FAIL (got: ${sanitized})`}`);
  });

  // Test CSS
  cssPayloads.forEach(p => {
    const result = sanitizeCss(p.input);
    const isBlocked = result.includes("Blocked");
    const passed = p.shouldFail ? isBlocked : !isBlocked;
    console.log(`CSS  [${p.name}]: ${passed ? 'PASS' : `FAIL (got: ${result})`}`);
  });
}

runTests();
