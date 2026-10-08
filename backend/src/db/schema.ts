import { pgTable, uuid, varchar, text, timestamp, date as pgDate, boolean } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey(),
  name: varchar("name"),
  join_code: varchar("join_code").unique(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  company_id: uuid("company_id"),
  full_name: varchar("full_name"),
  email: varchar("email"),
  avatar_url: text("avatar_url"),
});

export const profileRoles = pgTable("profile_roles", {
  profile_id: uuid("profile_id"),
  role: text("role"),
});

export const newsCategories = pgTable("news_categories", {
  id: uuid("id").primaryKey(),
  name: text("name").unique(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
});

export const news = pgTable("news", {
  id: uuid("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id),
  author_id: uuid("author_id").references(() => profiles.id),
  title: varchar("title"),
  content: text("content"),
  cover_image_url: text("cover_image_url"),
  news_category_id: uuid("news_category_id").references(() => newsCategories.id),
  created_at: timestamp("created_at", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
  profile_id: uuid("profile_id").references(() => profiles.id),
});

export const leaveCategories = pgTable("leave_categories", {
  id: uuid("id").primaryKey(),
  name: text("name").unique(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey(),
  profile_id: uuid("profile_id").references(() => profiles.id),
  company_id: uuid("company_id").references(() => companies.id),
  leave_category_id: uuid("leave_category_id").references(() => leaveCategories.id),
  start_date: pgDate("start_date"), // Usually dates are without timezone or mapped to date
  end_date: pgDate("end_date"),
  description: text("description"),
  attachment_url: text("attachment_url"),
  status: text("status"), // USER-DEFINED in pg, mapped as text in drizzle
  approved_at: timestamp("approved_at", { withTimezone: true }),
  approved_by: uuid("approved_by"),
  created_at: timestamp("created_at", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  profile_id: uuid("profile_id").references(() => profiles.id),
  company_id: uuid("company_id").references(() => companies.id),
  title: varchar("title"),
  notes: text("notes"),
  deadline: timestamp("deadline", { withTimezone: true }),
  is_completed: boolean("is_completed").default(false),
  task_category_id: uuid("task_category_id"),
  created_at: timestamp("created_at", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
});
