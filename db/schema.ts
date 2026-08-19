import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  pgEnum,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", ["owner", "admin"]);

export const pageStatusEnum = pgEnum("page_status", ["draft", "published"]);

export const projectCategoryEnum = pgEnum("project_category", [
  "book-covers",
  "illustration",
  "fine-art",
]);

export const verificationTypeEnum = pgEnum("verification_type", [
  "email_verify",
  "password_reset",
  "username_recovery",
]);

export const siteSettingsKeyEnum = pgEnum("site_settings_key", [
  "header",
  "footer",
  "theme",
]);

/* -------------------------------------------------------------------------- */
/*  Auth: users, oauth accounts, verification tokens                         */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    // Null when the account was created via OAuth only (no password set).
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("admin"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(table.email),
    uniqueIndex("users_username_unique_idx").on(table.username),
  ],
);

// Linked OAuth identities (e.g. Google). One user can have multiple linked
// providers; a given provider account can only ever map to one user.
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(), // e.g. "google"
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at"), // unix timestamp, per OAuth spec convention
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_unique_idx").on(
      table.provider,
      table.providerAccountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

// Single-use, expiring tokens for email verification, password reset,
// and username recovery. `token` is stored hashed, never plaintext.
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(), // usually the email
    tokenHash: text("token_hash").notNull(),
    type: verificationTypeEnum("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verification_tokens_identifier_idx").on(table.identifier),
    uniqueIndex("verification_tokens_token_hash_unique_idx").on(
      table.tokenHash,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Content: pages, global site settings (header/footer/theme)               */
/* -------------------------------------------------------------------------- */

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: pageStatusEnum("status").notNull().default("draft"),

    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),

    // GrapesJS project data (components + styles) — the editable source of truth.
    gjsData: jsonb("gjs_data"),

    // Rendered output, regenerated on publish, served to visitors.
    htmlCache: text("html_cache"),
    cssCache: text("css_cache"),

    // Soft delete: kept out of listings/public routes but restorable.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("pages_slug_unique_idx").on(table.slug),
    index("pages_status_idx").on(table.status),
    index("pages_deleted_at_idx").on(table.deletedAt),
  ],
);

// Singleton-style rows for global chrome (header/footer) and theme tokens.
// Edited through the same GrapesJS canvas as pages, just a different
// available-block set.
export const siteSettings = pgTable("site_settings", {
  key: siteSettingsKeyEnum("key").primaryKey(),
  gjsData: jsonb("gjs_data"),
  htmlCache: text("html_cache"),
  cssCache: text("css_cache"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    category: projectCategoryEnum("category").notNull(),
    description: text("description"),
    client: varchar("client", { length: 255 }),
    year: varchar("year", { length: 32 }),
    coverImage: text("cover_image").notNull(),
    images: jsonb("images").$type<string[]>().default([]),
    details: text("details"),
    isFeatured: integer("is_featured").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_slug_unique_idx").on(table.slug),
    index("projects_category_idx").on(table.category),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Media                                                                     */
/* -------------------------------------------------------------------------- */

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blobUrl: text("blob_url").notNull(),
    pathname: text("pathname").notNull(), // Vercel Blob pathname, used for deletion
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(), // mime type
    size: integer("size").notNull(), // bytes
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("media_assets_uploaded_by_idx").on(table.uploadedBy)],
);

/* -------------------------------------------------------------------------- */
/*  Relations (for Drizzle's relational query API)                           */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  pages: many(pages),
  mediaAssets: many(mediaAssets),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  author: one(users, { fields: [pages.createdBy], references: [users.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  uploader: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types — import these anywhere you need a typed row shape        */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
