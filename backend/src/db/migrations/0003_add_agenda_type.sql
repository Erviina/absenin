CREATE TYPE "public"."agenda_type_enum" AS ENUM('COMPANY', 'PERSONAL');
ALTER TABLE "agendas" ADD COLUMN "type" "agenda_type_enum" DEFAULT 'COMPANY' NOT NULL;