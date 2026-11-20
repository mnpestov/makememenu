-- Bring installations made from the original migrations up to the existing schema.
-- IF NOT EXISTS also supports installations previously updated with prisma db push.
DO $$ BEGIN
  CREATE TYPE "Cook" AS ENUM ('YULIA', 'MISHA', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "Unit" ADD VALUE IF NOT EXISTS 'TEASPOON';
ALTER TYPE "Unit" ADD VALUE IF NOT EXISTS 'TABLESPOON';
ALTER TYPE "Unit" ADD VALUE IF NOT EXISTS 'CUP';
ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "cook" "Cook" NOT NULL DEFAULT 'BOTH';
ALTER TABLE "Dish" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "Dish" DROP CONSTRAINT IF EXISTS "Dish_categoryId_fkey";
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "packAmount" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "packPrice" DOUBLE PRECISION;
CREATE TABLE IF NOT EXISTS "User" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
