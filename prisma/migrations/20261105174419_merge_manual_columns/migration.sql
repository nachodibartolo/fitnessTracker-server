-- AlterTable
ALTER TABLE "DailyHealthSummary" ADD COLUMN     "manualFields" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Pasa lo cargado a mano a las columnas normales y deja anotado qué campos fueron manuales
UPDATE "DailyHealthSummary" SET
  "weightKg" = COALESCE("weightKgManual", "weightKg"),
  "bodyFatPct" = COALESCE("bodyFatPctManual", "bodyFatPct"),
  "sleepAsleepMin" = COALESCE("sleepAsleepMinManual", "sleepAsleepMin"),
  "manualFields" = ARRAY_REMOVE(ARRAY[
    CASE WHEN "weightKgManual" IS NOT NULL THEN 'weightKg' END,
    CASE WHEN "bodyFatPctManual" IS NOT NULL THEN 'bodyFatPct' END,
    CASE WHEN "sleepAsleepMinManual" IS NOT NULL THEN 'sleepAsleepMin' END
  ], NULL)
WHERE "weightKgManual" IS NOT NULL OR "bodyFatPctManual" IS NOT NULL OR "sleepAsleepMinManual" IS NOT NULL;

-- AlterTable
ALTER TABLE "DailyHealthSummary" DROP COLUMN "bodyFatPctManual",
DROP COLUMN "sleepAsleepMinManual",
DROP COLUMN "weightKgManual";
