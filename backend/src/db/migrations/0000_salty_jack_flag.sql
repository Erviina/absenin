ALTER TABLE "companies" ADD COLUMN "join_code" varchar;
ALTER TABLE "companies" ADD CONSTRAINT "companies_join_code_unique" UNIQUE("join_code");
