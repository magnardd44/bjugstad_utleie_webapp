/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."GlobalRole" AS ENUM ('super_admin', 'customer');

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "role",
ADD COLUMN     "role" "public"."GlobalRole" NOT NULL DEFAULT 'customer';
