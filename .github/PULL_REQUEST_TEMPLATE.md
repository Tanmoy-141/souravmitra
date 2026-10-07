## Summary of Changes
<!-- Provide a brief description of what this PR introduces, updates, or fixes. -->

## Pre-Merge Verification Checklist
- [ ] **Typecheck**: `npx tsc --noEmit` passed with 0 errors.
- [ ] **Lint**: `npm run lint` passed with 0 errors/warnings.
- [ ] **Sanitization**: `npx tsx scripts/test-sanitization.ts` passed (HTML/CSS DOMPurify).
- [ ] **Database & Migrations**:
  - [ ] If `db/schema.ts` changed, ran `npm run db:generate`.
  - [ ] Verified `db/migrations/meta/` snapshots and `_journal.json` are committed.
  - [ ] No destructive `DROP` or raw data deletion without explicit audit.
- [ ] **Security & Session Integrity**:
  - [ ] All public input / CMS outputs sanitized.
  - [ ] Admin routes protected with HMAC session checks.
  - [ ] No unhashed secrets or credentials committed.

