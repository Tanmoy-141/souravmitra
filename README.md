# Sourav Mitra — Artist Portfolio & Custom CMS

![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwindcss)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.4-C5F74F?style=flat&logo=drizzle)
![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)
![CodeQL](https://img.shields.io/badge/CodeQL-Passing-brightgreen?style=flat&logo=github)

A high-performance artist portfolio, digital gallery, and in-house content management system (CMS) tailored specifically for illustrator and fine artist **Sourav Mitra**. Built with Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, and Neon Serverless PostgreSQL managed via Drizzle ORM.

---

## 🌟 Key Highlights & Features

### 🎨 1. Bespoke Visual Portfolio
- **Curated Galleries**: Specialized showcases for **Book Covers**, **Illustration**, and **Fine Art**.
- **Dynamic Hero View**: Immersive full-viewport artwork framing with subtle parallax depth, responsive portrait/landscape alignment, and customizable call-to-actions.
- **Featured Projects Carousel**: Fluid 3-card and multi-card interactive carousels with smooth dragging and responsive mobile-to-desktop touch physics.
- **Project Detail Pages**: Dynamic routing for artwork collections featuring high-res imagery, medium details, publication history, and interactive blocks.
- **Visitor Interactions**: Atomic like/unlike toggling, view counters with anti-spam cooldown protection, artwork sharing, and interactive comment sections backed by signed cryptographic visitor cookies.

### 🛠️ 2. In-House Headless CMS & Visual Page Builder
- **GrapesJS Visual Canvas**: Integrated drag-and-drop page builder allowing the artist to construct rich layouts, typography, and styling visually.
- **Dynamic Block Portals**: Custom React component injectors (`CmsDynamicBlockPortal`) allowing dynamic features (carousels, testimonials, client tickers, contact forms, counters) to be embedded directly into custom static blocks.
- **Draft & Live Page Lifecycle**: Visual live preview banner (`/admin/preview/[id]`) with side-by-side verification before publishing.
- **Navigation & Brand Customizer**: Dynamic header management with atomic batch updates (`db.batch`), custom links, link ordering, visibility toggles, Google Fonts live injection, brand name typography customization, and responsive mobile nav controls.
- **Media Library**: Integrated asset manager connected to Vercel Blob with image previews, asset tagging, and instant upload/delete capabilities.
- **Inquiries Inbox**: Form inquiry tracking dashboard with read/unread statuses, project categorization, and direct mailto response triggers.
- **Trash & Soft Deletion**: Safe deletion workflow with one-click page restoration.

### 🛡️ 3. Security & Engineering Rigor
- **Zero CodeQL Vulnerabilities**: Hardened against DOM-based XSS (`js/xss-through-dom`) and ReDoS attacks (`js/polynomial-redos`) via deterministic parsers and allow-list sanitization (`isomorphic-dompurify`).
- **Encrypted & Signed Sessions**: Admin authentication powered by HMAC-SHA256 session tokens (`jose`), PBKDF2 password hashing with cryptographically secure random salts, and optional Google OAuth 2.0 integration.
- **Atomic Concurrency Controls**: Database interactions use SQL atomic increments, cooldown windows, and transactional batches (`db.batch`) to guarantee consistency under high concurrent load.
- **Spam & Abuse Protection**: Contact submissions protected by IP rate-limiting and silent honeypot filtering.

---

## 🏗️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | Server Components, API route handlers, and static optimizations |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end static type safety |
| **UI Library** | [React 19](https://react.dev/) | Client & Server components, Portals, and concurrent rendering |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS engine with Obsidian & Gold design system tokens |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) | Cloud PostgreSQL with pooled and direct connection capabilities |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | Type-safe SQL schema definitions, relations, and migrations |
| **Visual Builder** | [GrapesJS](https://grapesjs.com/) | Client-side visual canvas editor for CMS pages |
| **Media Storage** | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) | Scalable object storage for high-resolution artwork and custom fonts |
| **Sanitization** | [DOMPurify (isomorphic)](https://github.com/kkomelin/isomorphic-dompurify) | Allow-list HTML & CSS sanitization to eliminate XSS |
| **Email Delivery** | [Resend](https://resend.com/) | Transactional emails for contact inquiries and admin notifications |
| **Validation** | [Zod 4](https://zod.dev/) | Runtime request body and schema validation |

---

## 📂 Project Structure

```text
souravmitra/
├── app/                            # Next.js App Router (Routes & API endpoints)
│   ├── (public portfolio)/         # Public visitor pages (Home, About, Book Covers, Fine Art, etc.)
│   ├── admin/                      # CMS Admin dashboard & live preview routes
│   │   └── preview/[id]/           # Isolated draft preview viewer with banner controls
│   ├── api/                        # Backend REST API routes
│   │   ├── auth/                   # Admin login, logout, password recovery, and Google OAuth
│   │   ├── cms/                    # Pages CRUD, visual builder persistence, and settings
│   │   ├── contact/                # Rate-limited contact inquiry submissions
│   │   ├── interactions/           # Atomic likes, views, comments, and share endpoints
│   │   └── media/                  # Vercel Blob asset upload, listing, and deletion
│   ├── globals.css                 # Tailwind v4 theme configurations, base styles, and fonts
│   └── layout.tsx                  # Root layout, dynamic head links, favicons, and analytics
├── components/                     # Reusable React components
│   ├── cms/                        # CMS-specific interfaces (GrapesEditor, MediaLibrary, NavAdmin)
│   ├── Header.tsx                  # Global responsive header with dynamic nav and custom fonts
│   ├── Footer.tsx                  # Global site footer with sanitized social channels
│   └── ...                         # Carousels, Client tickers, Testimonials, Interactive blocks
├── db/                             # Database layer
│   ├── index.ts                    # Neon client initialization (HTTP serverless & pool drivers)
│   ├── schema.ts                   # Drizzle ORM schema definitions (Pages, Projects, Users, etc.)
│   └── migrations/                 # Drizzle SQL migration files
├── lib/                            # Shared utilities and server helpers
│   ├── auth.ts                     # Password hashing (PBKDF2) & session management
│   ├── dynamic-blocks.ts           # Block extraction and parsing engine
│   ├── navigation.ts               # Navigation schemas, safety checks, and normalizers
│   ├── rate-limit.ts               # In-memory and IP-based rate limiting
│   └── sanitize.ts                 # DOMPurify HTML sanitizers and ReDoS-safe color validators
├── scripts/                        # Automation, seeding, and verification suites
│   ├── seed-all-pages.ts           # Seeds default artist pages and layouts
│   ├── seed-projects.ts            # Seeds initial portfolio artwork and metadata
│   └── test-interactions-e2e.ts    # Comprehensive E2E HTTP concurrency test suite
└── public/                         # Static assets (fonts, icons, fallback images)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v22.23.2` or later
- **Package Manager**: `npm` (or `pnpm` / `yarn`)
- **Neon Database**: A Neon PostgreSQL database instance

### 1. Clone & Install

```bash
git clone https://github.com/Tanmoy-141/souravmitra.git
cd souravmitra
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Fill in the required configuration values:

```env
# Database connection (from Neon Console)
DATABASE_URL=postgresql://user:password@ep-sample.region.neon.tech/neondb?sslmode=require

# Authentication secret (Generate with: openssl rand -base64 48)
AUTH_SECRET=your-32-plus-char-cryptographic-secret

# Initial Admin Bootstrap Account (Created automatically on first login if DB is empty)
ADMIN_USERNAME=souravadmin
ADMIN_PASSWORD=your-secure-password
ADMIN_EMAIL=souravmitra045@gmail.com

# Media Storage (from Vercel Dashboard)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Optional: Email Service (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Sourav Mitra Portfolio <notifications@yourdomain.com>"
OWNER_EMAIL=souravmitra045@gmail.com

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 3. Initialize the Database

Push schema definitions or run migrations against your database:

```bash
# Push schema directly (development)
npm run db:push

# Or run migrations:
npm run db:migrate

# Seed standard artist pages and initial portfolio projects:
npm run db:seed-pages
npm run db:seed-projects
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The administrative dashboard is accessible at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 🧪 Testing & Quality Assurance

The repository includes a suite of verification scripts to ensure zero runtime regressions, type safety, and atomic database integrity:

```bash
# 1. Typecheck the entire codebase
npx tsc --noEmit

# 2. Run ESLint checks
npm run lint

# 3. Run comprehensive HTTP route, concurrency, and security E2E test suite
npx tsx scripts/test-interactions-e2e.ts
```

The E2E test suite runs live assertions against:
- **Visitor Identity & Cookie Security**: Signed HMAC cookie issuance and tamper rejection.
- **Concurrency & Atomicity**: Multi-threaded simulated concurrent like/view requests to prevent race conditions.
- **CMS Navigation Atomicity**: `db.batch` transactional execution compatibility with the Neon HTTP driver.
- **Route Authorization**: Strict 401 verification across all administrative endpoints.

---

## 🚢 Continuous Integration & Deployment

The repository uses GitHub Actions for continuous quality and deployment gates:
- **`ci.yml`**: Triggers on pull requests and pushes to `main`. Executes ESLint, TypeScript verification, unit checks, and production builds.
- **`integration.yml`**: Runs the live database interaction and concurrency test suite against a dedicated test database.
- **`codeql.yml`**: Scans the codebase using CodeQL's `security-extended` query suite to continuously prevent regressions in DOM XSS, ReDoS, and URL redirections.
- **`migrate-prod.yml`**: Gated production database migration workflow that verifies target commits have passed all CI and E2E suites before executing DDL migrations.

---

## 📄 License & Credits

- **Artwork & Content**: &copy; Sourav Mitra. All rights reserved.
- **Platform Architecture & Development**: Built and maintained by [Tanmoy Howlader](https://github.com/Tanmoy-141).
