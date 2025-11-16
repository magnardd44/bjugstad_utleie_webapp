-- CreateTable
CREATE TABLE "public"."customers" (
    "customer_id" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "contact" TEXT,
    "telephone_number" TEXT,
    "organization_number" TEXT,
    "customer_number" INTEGER,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "public"."customer_contact_persons" (
    "customer_id" INTEGER NOT NULL,
    "contact_person_id" INTEGER NOT NULL,
    "name" TEXT,
    "telephone_number" TEXT,
    "email" TEXT,

    CONSTRAINT "customer_contact_persons_pkey" PRIMARY KEY ("customer_id","contact_person_id")
);

-- AddForeignKey
ALTER TABLE "public"."customer_contact_persons" ADD CONSTRAINT "customer_contact_persons_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;
