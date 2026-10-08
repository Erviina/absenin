import { pgTable, uuid, varchar, text, timestamp, numeric, index, pgEnum, date as pgDate, boolean } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey(),
  name: varchar("name"),
  join_code: varchar("join_code").unique(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  avatar_company_url: text("avatar_company_url"),
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

export const agendaCategories = pgTable("agendas_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
});

export const agendaTypeEnum = pgEnum("agenda_type_enum", ["COMPANY", "PERSONAL"]);

export const agenda = pgTable("agendas", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id").references(() => companies.id),
  title: varchar("title"),
  notes: text("notes"),
  start_time: timestamp("start_time", { withTimezone: true }),
  end_time: timestamp("end_time", { withTimezone: true }),
  type: agendaTypeEnum("type").default("COMPANY").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
  profile_id: uuid("profile_id").references(() => profiles.id),
  agenda_category_id: uuid("agenda_category_id").references(() => agendaCategories.id),
});

export const workModeEnum = pgEnum("work_mode_enum", ["WFH", "WFO"]);

export const attendances = pgTable("attendances", {
  id: uuid("id").primaryKey().defaultRandom(),
  profile_id: uuid("profile_id").references(() => profiles.id).notNull(),
  company_id: uuid("company_id").references(() => companies.id).notNull(),
  work_mode: workModeEnum("work_mode").notNull(),
  check_in_time: timestamp("check_in_time", { withTimezone: true }).notNull(),
  check_in_latitude: numeric("check_in_latitude"),
  check_in_longitude: numeric("check_in_longitude"),
  check_in_address: text("check_in_address"),
  check_in_photo_url: text("check_in_photo_url"),
  check_out_time: timestamp("check_out_time", { withTimezone: true }),
  check_out_latitude: numeric("check_out_latitude"),
  check_out_longitude: numeric("check_out_longitude"),
  check_out_address: text("check_out_address"),
  check_out_photo_url: text("check_out_photo_url"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  deleted_by: uuid("deleted_by"),
}, (table) => {
  return [
    index("attendances_profile_idx").on(table.profile_id),
    index("attendances_company_idx").on(table.company_id),
    index("attendances_check_in_idx").on(table.check_in_time),
  ];
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

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  recipient_id: uuid("recipient_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  reference_id: uuid("reference_id"),
  is_read: boolean("is_read").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return [
    index("notifications_recipient_idx").on(table.recipient_id),
    index("notifications_unread_idx").on(table.recipient_id, table.is_read),
    index("notifications_created_idx").on(table.created_at),
  ];
});
