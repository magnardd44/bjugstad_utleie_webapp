/*
  Warnings:

  - You are about to drop the column `company` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CompanyRole" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "company";

-- CreateTable
CREATE TABLE "public"."user_customer_accesses" (
    "user_id" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "role" "public"."CompanyRole" NOT NULL,

    CONSTRAINT "user_customer_accesses_pkey" PRIMARY KEY ("user_id","customer_id")
);

-- AddForeignKey
ALTER TABLE "public"."user_customer_accesses" ADD CONSTRAINT "user_customer_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_customer_accesses" ADD CONSTRAINT "user_customer_accesses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;
