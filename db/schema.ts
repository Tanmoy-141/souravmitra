import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  pgEnum,
  integer,
  boolean,
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

export const commentStatusEnum = pgEnum("comment_status", [
  "published",
  "pending",
  "hidden",
  "spam",
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
    passwordSalt: text("password_salt"),
    // Bumped on password reset (and available for a manual "log out
    // everywhere" later). Each issued session token embeds the version
    // that was current when it was signed; verification compares that
    // against this live value, so incrementing it instantly invalidates
    // every token issued before the bump — the actual revocation
    // mechanism for an otherwise-stateless signed token.
    sessionVersion: integer("session_version").notNull().default(0),
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
    identifier: varchar("identifier", { length: 255 }).notNull(), // usually the email or username
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

// Persistent rate limit storage across serverless / multi-instance invocations
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    count: integer("count").notNull().default(1),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rate_limits_reset_at_idx").on(table.resetAt)],
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

/* -------------------------------------------------------------------------- */
/*  Projects: Artist Portfolios (Book Covers, Illustration, Fine Art)        */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    category: projectCategoryEnum("category").notNull(),
    status: pageStatusEnum("status").notNull().default("published"),
    description: text("description"),
    medium: text("medium"), // e.g. "Oil on Linen", "Charcoal on Paper", "Digital Painting"
    dimensions: text("dimensions"), // e.g. "24 x 36 inches"
    publisher: varchar("publisher", { length: 255 }), // For book covers / editorial publications
    year: varchar("year", { length: 32 }),
    coverImage: text("cover_image").notNull(),
    images: jsonb("images").$type<string[]>().default([]),
    details: text("details"),
    tags: jsonb("tags").$type<string[]>().default([]),
    isFeatured: boolean("is_featured").default(false).notNull(),
    likes: integer("likes").default(0).notNull(),
    views: integer("views").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
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
    index("projects_status_idx").on(table.status),
    index("projects_is_featured_idx").on(table.isFeatured),
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
/*  Inquiries                                                                 */
/* -------------------------------------------------------------------------- */

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    company: varchar("company", { length: 100 }),
    projectType: varchar("project_type", { length: 100 }),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiries_created_at_idx").on(table.createdAt),
    index("inquiries_is_read_idx").on(table.isRead),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Visitor Interactions: Likes, Comments, Views                             */
/* -------------------------------------------------------------------------- */

export const projectLikes = pgTable(
  "project_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_likes_project_visitor_unique_idx").on(
      table.projectId,
      table.visitorId,
    ),
    index("project_likes_project_id_idx").on(table.projectId),
    index("project_likes_visitor_id_idx").on(table.visitorId),
  ],
);

export const projectComments = pgTable(
  "project_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 128 }).notNull(),
    author: varchar("author", { length: 80 }).notNull(),
    content: text("content").notNull(),
    status: commentStatusEnum("status").notNull().default("published"),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_comments_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("project_comments_status_idx").on(table.status),
    index("project_comments_visitor_idx").on(table.visitorId),
  ],
);

export const projectViews = pgTable(
  "project_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 128 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_views_project_visitor_unique_idx").on(
      table.projectId,
      table.visitorId,
    ),
    index("project_views_project_visitor_viewed_idx").on(
      table.projectId,
      table.visitorId,
      table.viewedAt,
    ),
    index("project_views_project_id_idx").on(table.projectId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Relations (for Drizzle's relational query API)                           */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  pages: many(pages),
  projects: many(projects),
  mediaAssets: many(mediaAssets),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  author: one(users, { fields: [pages.createdBy], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  author: one(users, { fields: [projects.createdBy], references: [users.id] }),
  likesList: many(projectLikes),
  comments: many(projectComments),
  viewsList: many(projectViews),
}));

export const projectLikesRelations = relations(projectLikes, ({ one }) => ({
  project: one(projects, {
    fields: [projectLikes.projectId],
    references: [projects.id],
  }),
}));

export const projectCommentsRelations = relations(
  projectComments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectComments.projectId],
      references: [projects.id],
    }),
  }),
);

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  project: one(projects, {
    fields: [projectViews.projectId],
    references: [projects.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  uploader: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;

export type ProjectLike = typeof projectLikes.$inferSelect;
export type NewProjectLike = typeof projectLikes.$inferInsert;


export type ProjectComment = typeof projectComments.$inferSelect;
export type NewProjectComment = typeof projectComments.$inferInsert;

export type ProjectView = typeof projectViews.$inferSelect;
export type NewProjectView = typeof projectViews.$inferInsert;

