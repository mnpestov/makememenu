CREATE TYPE "DishStatus" AS ENUM ('TRY', 'FAVORITE', 'REJECTED');
CREATE TYPE "NutritionBasis" AS ENUM ('PER_100G', 'PER_SERVING');
CREATE TYPE "IngredientScaling" AS ENUM ('LINEAR', 'DAMPED', 'FIXED');
ALTER TYPE "Unit" ADD VALUE 'CLOVE';
ALTER TYPE "Unit" ADD VALUE 'PINCH';
ALTER TYPE "Unit" ADD VALUE 'SPRIG';
ALTER TYPE "Unit" ADD VALUE 'SLICE';
ALTER TYPE "Unit" ADD VALUE 'TO_TASTE';
ALTER TABLE "Dish"
  ADD COLUMN "status" "DishStatus" NOT NULL DEFAULT 'FAVORITE',
  ADD COLUMN "rating" INTEGER,
  ADD COLUMN "reviewComment" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceLicense" TEXT,
  ADD COLUMN "sourceVersion" TEXT,
  ADD COLUMN "prepMinutes" INTEGER,
  ADD COLUMN "cookMinutes" INTEGER,
  ADD COLUMN "nutritionBasis" "NutritionBasis" NOT NULL DEFAULT 'PER_100G';
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
CREATE UNIQUE INDEX "Dish_source_sourceId_key" ON "Dish"("source", "sourceId");
ALTER TABLE "DishIngredient"
  ALTER COLUMN "amount" DROP NOT NULL,
  ADD COLUMN "scaling" "IngredientScaling" NOT NULL DEFAULT 'LINEAR',
  ADD COLUMN "note" TEXT;
ALTER TABLE "ShoppingItem" ALTER COLUMN "totalAmount" DROP NOT NULL;

DROP INDEX "DishIngredient_dishId_ingredientId_key";

CREATE TABLE "RecipeImportExclusion" (
  "source" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeImportExclusion_pkey" PRIMARY KEY ("source", "sourceId")
);
