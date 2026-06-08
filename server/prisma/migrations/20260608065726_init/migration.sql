-- CreateTable
CREATE TABLE "training_levels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "colleges" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "enrollment_year" INTEGER NOT NULL,
    "duration_years" INTEGER NOT NULL,
    "major_id" INTEGER NOT NULL,
    "college_id" INTEGER,
    "training_level_id" INTEGER,
    "student_count" INTEGER NOT NULL,
    "custom_plan_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "classes_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "classes_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "classes_training_level_id_fkey" FOREIGN KEY ("training_level_id") REFERENCES "training_levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "classes_custom_plan_id_fkey" FOREIGN KEY ("custom_plan_id") REFERENCES "training_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_classes" ("created_at", "custom_plan_id", "duration_years", "enrollment_year", "id", "major_id", "name", "status", "student_count", "updated_at") SELECT "created_at", "custom_plan_id", "duration_years", "enrollment_year", "id", "major_id", "name", "status", "student_count", "updated_at" FROM "classes";
DROP TABLE "classes";
ALTER TABLE "new_classes" RENAME TO "classes";
CREATE TABLE "new_textbooks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "author" TEXT,
    "edition" TEXT,
    "publish_date" TEXT,
    "price" REAL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_textbooks" ("author", "created_at", "description", "edition", "id", "isbn", "price", "publish_date", "publisher", "title", "updated_at") SELECT "author", "created_at", "description", "edition", "id", "isbn", "price", "publish_date", "publisher", "title", "updated_at" FROM "textbooks";
DROP TABLE "textbooks";
ALTER TABLE "new_textbooks" RENAME TO "textbooks";
CREATE TABLE "new_training_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "major_id" INTEGER,
    "college_id" INTEGER,
    "training_level_id" INTEGER,
    "version" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_plans_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_plans_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_plans_training_level_id_fkey" FOREIGN KEY ("training_level_id") REFERENCES "training_levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_training_plans" ("created_at", "description", "id", "major_id", "name", "updated_at", "version") SELECT "created_at", "description", "id", "major_id", "name", "updated_at", "version" FROM "training_plans";
DROP TABLE "training_plans";
ALTER TABLE "new_training_plans" RENAME TO "training_plans";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "training_levels_name_key" ON "training_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_name_key" ON "colleges"("name");
