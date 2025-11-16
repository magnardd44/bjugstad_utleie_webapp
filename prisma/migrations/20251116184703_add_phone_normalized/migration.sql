-- AlterTable
ALTER TABLE "public"."customer_contact_persons" ADD COLUMN     "phone_normalized" TEXT;

-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "phone_normalized" TEXT;
