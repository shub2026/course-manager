-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_courses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'public',
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_courses" ("code", "created_at", "description", "id", "name", "type", "updated_at") SELECT "code", "created_at", "description", "id", "name", "type", "updated_at" FROM "courses";
DROP TABLE "courses";
ALTER TABLE "new_courses" RENAME TO "courses";
CREATE TABLE "new_majors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_majors" ("code", "created_at", "description", "id", "name", "updated_at") SELECT "code", "created_at", "description", "id", "name", "updated_at" FROM "majors";
DROP TABLE "majors";
ALTER TABLE "new_majors" RENAME TO "majors";
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
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_textbooks" ("author", "created_at", "description", "edition", "id", "is_active", "isbn", "price", "publish_date", "publisher", "title", "updated_at") SELECT "author", "created_at", "description", "edition", "id", "is_active", "isbn", "price", "publish_date", "publisher", "title", "updated_at" FROM "textbooks";
DROP TABLE "textbooks";
ALTER TABLE "new_textbooks" RENAME TO "textbooks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
