import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

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
