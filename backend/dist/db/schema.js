"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = exports.tasks = exports.leaveRequests = exports.leaveCategories = exports.attendances = exports.workModeEnum = exports.agenda = exports.agendaTypeEnum = exports.agendaCategories = exports.news = exports.newsCategories = exports.profileRoles = exports.profiles = exports.companies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.companies = (0, pg_core_1.pgTable)("companies", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name"),
    join_code: (0, pg_core_1.varchar)("join_code").unique(),
    latitude: (0, pg_core_1.numeric)("latitude"),
    longitude: (0, pg_core_1.numeric)("longitude"),
    avatar_company_url: (0, pg_core_1.text)("avatar_company_url"),
    phone: (0, pg_core_1.varchar)("phone"),
});
exports.profiles = (0, pg_core_1.pgTable)("profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    company_id: (0, pg_core_1.uuid)("company_id"),
    full_name: (0, pg_core_1.varchar)("full_name"),
    email: (0, pg_core_1.varchar)("email"),
    avatar_url: (0, pg_core_1.text)("avatar_url"),
});
exports.profileRoles = (0, pg_core_1.pgTable)("profile_roles", {
    profile_id: (0, pg_core_1.uuid)("profile_id"),
    role: (0, pg_core_1.text)("role"),
});
exports.newsCategories = (0, pg_core_1.pgTable)("news_categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").unique(),
    description: (0, pg_core_1.text)("description"),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
});
exports.news = (0, pg_core_1.pgTable)("news", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id),
    author_id: (0, pg_core_1.uuid)("author_id").references(() => exports.profiles.id),
    title: (0, pg_core_1.varchar)("title"),
    content: (0, pg_core_1.text)("content"),
    cover_image_url: (0, pg_core_1.text)("cover_image_url"),
    news_category_id: (0, pg_core_1.uuid)("news_category_id").references(() => exports.newsCategories.id),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
    profile_id: (0, pg_core_1.uuid)("profile_id").references(() => exports.profiles.id),
});
exports.agendaCategories = (0, pg_core_1.pgTable)("agendas_categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").unique(),
    description: (0, pg_core_1.text)("description"),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
});
exports.agendaTypeEnum = (0, pg_core_1.pgEnum)("agenda_type_enum", ["COMPANY", "PERSONAL"]);
exports.agenda = (0, pg_core_1.pgTable)("agendas", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id),
    title: (0, pg_core_1.varchar)("title"),
    notes: (0, pg_core_1.text)("notes"),
    start_time: (0, pg_core_1.timestamp)("start_time", { withTimezone: true }),
    end_time: (0, pg_core_1.timestamp)("end_time", { withTimezone: true }),
    type: (0, exports.agendaTypeEnum)("type").default("COMPANY").notNull(),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
    profile_id: (0, pg_core_1.uuid)("profile_id").references(() => exports.profiles.id),
    agenda_category_id: (0, pg_core_1.uuid)("agenda_category_id").references(() => exports.agendaCategories.id),
    link_or_location: (0, pg_core_1.text)("link_or_location"),
    is_all_day: (0, pg_core_1.boolean)("is_all_day").default(false),
});
exports.workModeEnum = (0, pg_core_1.pgEnum)("work_mode_enum", ["WFH", "WFO"]);
exports.attendances = (0, pg_core_1.pgTable)("attendances", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    profile_id: (0, pg_core_1.uuid)("profile_id").references(() => exports.profiles.id).notNull(),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id).notNull(),
    work_mode: (0, exports.workModeEnum)("work_mode").notNull(),
    check_in_time: (0, pg_core_1.timestamp)("check_in_time", { withTimezone: true }).notNull(),
    check_in_latitude: (0, pg_core_1.numeric)("check_in_latitude"),
    check_in_longitude: (0, pg_core_1.numeric)("check_in_longitude"),
    check_in_address: (0, pg_core_1.text)("check_in_address"),
    check_in_photo_url: (0, pg_core_1.text)("check_in_photo_url"),
    check_out_time: (0, pg_core_1.timestamp)("check_out_time", { withTimezone: true }),
    check_out_latitude: (0, pg_core_1.numeric)("check_out_latitude"),
    check_out_longitude: (0, pg_core_1.numeric)("check_out_longitude"),
    check_out_address: (0, pg_core_1.text)("check_out_address"),
    check_out_photo_url: (0, pg_core_1.text)("check_out_photo_url"),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
}, (table) => {
    return [
        (0, pg_core_1.index)("attendances_profile_idx").on(table.profile_id),
        (0, pg_core_1.index)("attendances_company_idx").on(table.company_id),
        (0, pg_core_1.index)("attendances_check_in_idx").on(table.check_in_time),
    ];
});
exports.leaveCategories = (0, pg_core_1.pgTable)("leave_categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").unique(),
    description: (0, pg_core_1.text)("description"),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
});
exports.leaveRequests = (0, pg_core_1.pgTable)("leave_requests", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    profile_id: (0, pg_core_1.uuid)("profile_id").references(() => exports.profiles.id),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id),
    leave_category_id: (0, pg_core_1.uuid)("leave_category_id").references(() => exports.leaveCategories.id),
    start_date: (0, pg_core_1.date)("start_date"), // Usually dates are without timezone or mapped to date
    end_date: (0, pg_core_1.date)("end_date"),
    description: (0, pg_core_1.text)("description"),
    attachment_url: (0, pg_core_1.text)("attachment_url"),
    status: (0, pg_core_1.text)("status"), // USER-DEFINED in pg, mapped as text in drizzle
    approved_at: (0, pg_core_1.timestamp)("approved_at", { withTimezone: true }),
    approved_by: (0, pg_core_1.uuid)("approved_by"),
    rejection_reason: (0, pg_core_1.text)("rejection_reason"),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
});
exports.tasks = (0, pg_core_1.pgTable)("tasks", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    profile_id: (0, pg_core_1.uuid)("profile_id").references(() => exports.profiles.id),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id),
    title: (0, pg_core_1.varchar)("title"),
    notes: (0, pg_core_1.text)("notes"),
    deadline: (0, pg_core_1.timestamp)("deadline", { withTimezone: true }),
    is_completed: (0, pg_core_1.boolean)("is_completed").default(false),
    task_category_id: (0, pg_core_1.uuid)("task_category_id"),
    type: (0, pg_core_1.varchar)("type").default("personal"),
    assignees: (0, pg_core_1.jsonb)("assignees").default([]),
    assigned_to: (0, pg_core_1.uuid)("assigned_to").references(() => exports.profiles.id),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }),
    deleted_at: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true }),
    created_by: (0, pg_core_1.uuid)("created_by"),
    updated_by: (0, pg_core_1.uuid)("updated_by"),
    deleted_by: (0, pg_core_1.uuid)("deleted_by"),
});
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => exports.companies.id, { onDelete: "cascade" }).notNull(),
    recipient_id: (0, pg_core_1.uuid)("recipient_id").references(() => exports.profiles.id, { onDelete: "cascade" }).notNull(),
    type: (0, pg_core_1.varchar)("type").notNull(),
    title: (0, pg_core_1.varchar)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    reference_id: (0, pg_core_1.uuid)("reference_id"),
    is_read: (0, pg_core_1.boolean)("is_read").default(false).notNull(),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return [
        (0, pg_core_1.index)("notifications_recipient_idx").on(table.recipient_id),
        (0, pg_core_1.index)("notifications_unread_idx").on(table.recipient_id, table.is_read),
        (0, pg_core_1.index)("notifications_created_idx").on(table.created_at),
    ];
});
