# Security Policy

## Supported Versions

Security fixes are applied only to the latest production code on the `main` branch.

| Version / Branch | Runtime Target | Supported |
| --- | --- | --- |
| `main` (latest) | Node.js `>=22.23.2` · Next.js `16.4.x` | ✅ Yes |
| Historical commits / stale branches | — | ❌ No |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

If you discover a potential security issue in this repository or its deployed application, please report it privately using GitHub Private Vulnerability Reporting:

👉 **[Report a vulnerability via GitHub Security Advisories](https://github.com/Tanmoy-141/souravmitra/security/advisories/new)**

### What to Include

To help triage and resolve the issue quickly, please include:

- A clear description of the vulnerability and its potential impact (e.g., XSS, auth bypass, privilege escalation, SSRF, or data exposure).
- The affected route, API endpoint, file path, or CMS feature.
- Step-by-step reproduction instructions or a minimal proof-of-concept.
- Any relevant HTTP request/response snippets (with sensitive tokens redacted) or browser/environment details.

## Response & Disclosure Process

We follow Coordinated Vulnerability Disclosure (CVD):

- **Acknowledgment**: We aim to acknowledge receipt of your report within **72 hours**.
- **Triage & Assessment**: Initial validation and severity assessment within **7 days**.
- **Remediation**: Confirmed vulnerabilities are patched on a priority basis. We ask that you refrain from publicly disclosing details until a fix has been merged to `main` and deployed.

## Scope

### In Scope

- Authentication and admin session security (HMAC-SHA256 session tokens, PBKDF2 password verification, Google OAuth callback handling)
- CMS HTML/CSS/URL sanitization and SSR/client rendering pipelines
- API input validation, authorization guards, and database-backed rate limiting (`/api/*`)
- Media asset upload/deletion authorization and URL safety checks
- HTTP security headers and configuration issues in `next.config.ts`

### Out of Scope

- Volumetric Denial-of-Service (DoS/DDoS), automated credential stuffing, or contact-form spam floods against live deployments
- Vulnerabilities within third-party infrastructure providers themselves (such as Vercel, Neon Postgres, Resend, or Google Identity Services) — please report those directly to the respective vendor
- Issues requiring already-compromised admin credentials, physical access, or unsupported/end-of-life browsers
- Automated scanner findings without a reproducible security impact

### Testing Guidelines

Please avoid accessing, altering, or deleting production database records, inquiries, or media assets. Whenever possible, reproduce vulnerabilities locally using a test database configured from `.env.example`.

## Automated Security Measures in This Repository

- **Static Analysis**: [CodeQL Analysis](.github/workflows/codeql.yml) runs on pushes/PRs to `main` and on a weekly schedule with `+security-extended` queries.
- **Dependency Updates**: [Dependabot](.github/dependabot.yml) monitors `npm` dependencies weekly and GitHub Actions workflows monthly.
- **CI Guardrails**: [CI](.github/workflows/ci.yml) enforces TypeScript strict checks, ESLint, Next.js build verification, and automated HTML/CSS DOMPurify sanitization tests (`scripts/test-sanitization.ts`).
