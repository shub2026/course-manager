-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_training_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "major_id" INTEGER,
    "college_id" INTEGER,
    "training_level_id" INTEGER,
    "version" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_plans_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_plans_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_plans_training_level_id_fkey" FOREIGN KEY ("training_level_id") REFERENCES "training_levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_training_plans" ("college_id", "created_at", "description", "id", "major_id", "name", "training_level_id", "updated_at", "version") SELECT "college_id", "created_at", "description", "id", "major_id", "name", "training_level_id", "updated_at", "version" FROM "training_plans";
DROP TABLE "training_plans";
ALTER TABLE "new_training_plans" RENAME TO "training_plans";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
