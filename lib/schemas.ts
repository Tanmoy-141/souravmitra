import { z } from "zod";

export const ContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(255),
  company: z.string().trim().max(100).optional(),
  projectType: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1).max(5000),
  hp_company: z.string().max(0).optional().default(""),
});

export const LoginSchema = z.object({
  action: z.literal("login"),
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
  password: z.string().min(1),
});

export const RequestPasswordResetSchema = z.object({
  action: z.literal("request-password-reset"),
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
});

export const ConfirmPasswordResetSchema = z.object({
  action: z.literal("confirm-password-reset"),
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
  code: z.string().trim().min(1),
  newPassword: z.string().min(8),
});

export const ProjectCreateSchema = z.object({
  title: z.string().trim().min(1),
  category: z.enum(["book-covers", "illustration", "fine-art"]),
  description: z.string().trim().optional().nullable(),
  medium: z.string().trim().optional().nullable(),
  dimensions: z.string().trim().optional().nullable(),
  publisher: z.string().trim().optional().nullable(),
  year: z.union([z.string(), z.number()]).optional().nullable(),
  coverImage: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  details: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const CmsPageSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  seoTitle: z.string().trim().optional().nullable(),
  seoDescription: z.string().trim().optional().nullable(),
  gjsData: z.any().optional().nullable(),
  htmlCache: z.string().optional().nullable(),
  cssCache: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
});

export const CmsBulkPageSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string().optional(),
      slug: z.string().trim().min(1),
      title: z.string().trim().min(1),
      status: z.enum(["draft", "published"]).optional(),
      blocks: z.array(z.any()).optional(),
      gjsData: z.any().optional().nullable(),
      htmlCache: z.string().optional().nullable(),
      cssCache: z.string().optional().nullable(),
    }),
  ),
});
