-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_textbooks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "author" TEXT,
    "edition" TEXT,
    "publish_date" TEXT,
    "price" REAL,
    "category" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_textbooks" ("author", "category", "created_at", "description", "edition", "id", "is_active", "isbn", "price", "publish_date", "publisher", "sort_order", "title", "updated_at") SELECT "author", "category", "created_at", "description", "edition", "id", "is_active", "isbn", "price", "publish_date", "publisher", "sort_order", "title", "updated_at" FROM "textbooks";
DROP TABLE "textbooks";
ALTER TABLE "new_textbooks" RENAME TO "textbooks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
