## Table `companies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `address` | `text` |  |
| `join_code` | `varchar` | Unique |
| `latitude` | `numeric` |  |
| `longitude` | `numeric` |  |
| `work_days` | `_text` |  |
| `work_start_time` | `time` |  |
| `work_end_time` | `time` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `avatar_company_url` | `text` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `full_name` | `varchar` |  |
| `email` | `varchar` |  Unique |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `attendances`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `profile_id` | `uuid` |  |
| `company_id` | `uuid` |  |
| `work_mode` | `work_mode_enum` |  |
| `check_in_time` | `timestamptz` |  |
| `check_in_latitude` | `numeric` |  |
| `check_in_longitude` | `numeric` |  |
| `check_in_address` | `text` |  |
| `check_in_photo_url` | `text` |  |
| `check_out_time` | `timestamptz` |  Nullable |
| `check_out_latitude` | `numeric` |  Nullable |
| `check_out_longitude` | `numeric` |  Nullable |
| `check_out_address` | `text` |  Nullable |
| `check_out_photo_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `title` | `varchar` |  |
| `notes` | `text` |  Nullable |
| `deadline` | `timestamptz` |  |
| `is_completed` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `profile_id` | `uuid` |  |
| `deleted_by` | `uuid` |  Nullable |
| `task_category_id` | `uuid` |  |

## Table `agenda`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `title` | `varchar` |  |
| `notes` | `text` |  Nullable |
| `start_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `profile_id` | `uuid` |  |
| `deleted_by` | `uuid` |  Nullable |
| `agenda_category_id` | `uuid` |  Nullable |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `profile_id` | `uuid` |  |
| `company_id` | `uuid` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `description` | `text` |  |
| `attachment_url` | `text` |  Nullable |
| `status` | `leave_status_enum` |  |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |
| `leave_category_id` | `uuid` |  |

## Table `news`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `author_id` | `uuid` |  |
| `title` | `varchar` |  |
| `content` | `text` |  |
| `cover_image_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |
| `profile_id` | `uuid` |  Nullable |
| `news_category_id` | `uuid` |  |

## Table `leave_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `news_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `task_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `agenda_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_by` | `uuid` |  Nullable |

## Table `profile_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `profile_id` | `uuid` | Primary |
| `role` | `user_role_enum` | Primary |
| `created_at` | `timestamptz` |  |

## Custom Types / Enums

### `user_role_enum`

`Admin` | `Manager` | `Employee`

### `work_mode_enum`

`WFH` | `WFO`

### `task_type_enum`

`Personal` | `Grup`

### `leave_category_enum`

`Sakit` | `Izin` | `Cuti`

### `leave_status_enum`

`Menunggu` | `Disetujui` | `Ditolak`

### `news_category_enum`

`Pengumuman` | `Tips & Info`

## RLS Policies

### `companies`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `companies_select_same_tenant` | SELECT | authenticated | PERMISSIVE | `((id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL))` | — |
| `companies_update_admin` | UPDATE | authenticated | PERMISSIVE | `((id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_admin(companies.id) AS is_company_admin) AND (deleted_at IS NULL))` | `((id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_admin(companies.id) AS is_company_admin))` |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_select_same_tenant` | SELECT | authenticated | PERMISSIVE | `((deleted_at IS NULL) AND ((id = ( SELECT auth.uid() AS uid)) OR (company_id = ( SELECT get_user_company_id() AS get_user_company_id))))` | — |
| `profiles_update_self` | UPDATE | authenticated | PERMISSIVE | `((id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL))` | `(id = ( SELECT auth.uid() AS uid))` |
| `profiles_update_admin_same_tenant` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_admin(profiles.company_id) AS is_company_admin) AND (deleted_at IS NULL))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_admin(profiles.company_id) AS is_company_admin))` |

### `attendances`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `attendances_select` | SELECT | authenticated | PERMISSIVE | `((deleted_at IS NULL) AND ((profile_id = ( SELECT auth.uid() AS uid)) OR ((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(attendances.company_id) AS is_company_manager))))` | — |
| `attendances_insert_self` | INSERT | authenticated | PERMISSIVE | — | `((profile_id = ( SELECT auth.uid() AS uid)) AND (company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL) AND (check_out_time IS NULL))` |
| `attendances_update_self_checkout` | UPDATE | authenticated | PERMISSIVE | `((profile_id = ( SELECT auth.uid() AS uid)) AND (company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL))` | `((profile_id = ( SELECT auth.uid() AS uid)) AND (company_id = ( SELECT get_user_company_id() AS get_user_company_id)))` |
| `attendances_update_manager` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(attendances.company_id) AS is_company_manager) AND (deleted_at IS NULL))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(attendances.company_id) AS is_company_manager))` |

### `tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tasks_select_same_tenant` | SELECT | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL))` | — |
| `tasks_insert_same_tenant` | INSERT | authenticated | PERMISSIVE | — | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL) AND ((created_by = ( SELECT auth.uid() AS uid)) OR ( SELECT is_company_manager(tasks.company_id) AS is_company_manager)))` |
| `tasks_update_creator_or_manager` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL) AND ((created_by = ( SELECT auth.uid() AS uid)) OR ( SELECT is_company_manager(tasks.company_id) AS is_company_manager)))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ((created_by = ( SELECT auth.uid() AS uid)) OR ( SELECT is_company_manager(tasks.company_id) AS is_company_manager)))` |

### `agenda`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agendas_select_same_tenant` | SELECT | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL))` | — |
| `agendas_insert_manager` | INSERT | authenticated | PERMISSIVE | — | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL) AND ( SELECT is_company_manager(agenda.company_id) AS is_company_manager))` |
| `agendas_update_manager` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(agenda.company_id) AS is_company_manager) AND (deleted_at IS NULL))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(agenda.company_id) AS is_company_manager))` |

### `leave_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `leave_requests_select` | SELECT | authenticated | PERMISSIVE | `((deleted_at IS NULL) AND ((profile_id = ( SELECT auth.uid() AS uid)) OR ((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(leave_requests.company_id) AS is_company_manager))))` | — |
| `leave_requests_insert_self` | INSERT | authenticated | PERMISSIVE | — | `((profile_id = ( SELECT auth.uid() AS uid)) AND (company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (status = 'Menunggu'::leave_status_enum) AND (approved_by IS NULL) AND (approved_at IS NULL) AND (deleted_at IS NULL))` |
| `leave_requests_update_manager` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(leave_requests.company_id) AS is_company_manager) AND (deleted_at IS NULL))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(leave_requests.company_id) AS is_company_manager))` |

### `news`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `news_select_same_tenant` | SELECT | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (deleted_at IS NULL))` | — |
| `news_insert_manager` | INSERT | authenticated | PERMISSIVE | — | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (author_id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL) AND ( SELECT is_company_manager(news.company_id) AS is_company_manager))` |
| `news_update_manager` | UPDATE | authenticated | PERMISSIVE | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(news.company_id) AS is_company_manager) AND (deleted_at IS NULL))` | `((company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND ( SELECT is_company_manager(news.company_id) AS is_company_manager))` |

### `leave_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `leave_categories_read_authenticated` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `news_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `news_categories_read_authenticated` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `task_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `task_categories_read_authenticated` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `agenda_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agenda_categories_read_authenticated` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `profile_roles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profile_roles_select_self_or_same_company` | SELECT | authenticated | PERMISSIVE | `((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = profile_roles.profile_id) AND (p.company_id = ( SELECT get_user_company_id() AS get_user_company_id)) AND (p.deleted_at IS NULL)))))` | — |
| `profile_roles_insert_company_admin` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = profile_roles.profile_id) AND (p.company_id IS NOT NULL) AND (p.deleted_at IS NULL) AND is_company_admin(p.company_id))))` |
| `profile_roles_update_company_admin` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = profile_roles.profile_id) AND (p.company_id IS NOT NULL) AND (p.deleted_at IS NULL) AND is_company_admin(p.company_id))))` | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = profile_roles.profile_id) AND (p.company_id IS NOT NULL) AND (p.deleted_at IS NULL) AND is_company_admin(p.company_id))))` |
| `profile_roles_delete_company_admin` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = profile_roles.profile_id) AND (p.company_id IS NOT NULL) AND (p.deleted_at IS NULL) AND is_company_admin(p.company_id))))` | — |

