/*
  Warnings:

  - You are about to drop the column `plan_course_id` on the `plan_textbooks` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `plan_textbooks` table. All the data in the column will be lost.
  - Added the required column `semester_id` to the `plan_textbooks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "plan_course_semesters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_course_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "weekly_hours" REAL NOT NULL,
    "weeks_count" INTEGER NOT NULL DEFAULT 18,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_course_semesters_plan_course_id_fkey" FOREIGN KEY ("plan_course_id") REFERENCES "plan_courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_plan_textbooks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "semester_id" INTEGER NOT NULL,
    "textbook_id" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_textbooks_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "plan_course_semesters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_textbooks_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_plan_textbooks" ("created_at", "id", "is_required", "textbook_id") SELECT "created_at", "id", "is_required", "textbook_id" FROM "plan_textbooks";
DROP TABLE "plan_textbooks";
ALTER TABLE "new_plan_textbooks" RENAME TO "plan_textbooks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "plan_course_semesters_plan_course_id_semester_key" ON "plan_course_semesters"("plan_course_id", "semester");
