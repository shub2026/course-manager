-- CreateTable
CREATE TABLE "majors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "courses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'public',
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "training_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "major_id" INTEGER NOT NULL,
    "version" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_plans_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_courses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "start_semester" INTEGER NOT NULL,
    "end_semester" INTEGER NOT NULL,
    "weekly_hours" REAL NOT NULL,
    "weeks_per_semester" INTEGER NOT NULL DEFAULT 18,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan_courses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "training_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "textbooks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "author" TEXT,
    "edition" TEXT,
    "publish_date" TEXT,
    "price" REAL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "plan_textbooks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_course_id" INTEGER NOT NULL,
    "textbook_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_textbooks_plan_course_id_fkey" FOREIGN KEY ("plan_course_id") REFERENCES "plan_courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_textbooks_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "enrollment_year" INTEGER NOT NULL,
    "duration_years" INTEGER NOT NULL,
    "major_id" INTEGER NOT NULL,
    "student_count" INTEGER NOT NULL,
    "custom_plan_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "classes_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "classes_custom_plan_id_fkey" FOREIGN KEY ("custom_plan_id") REFERENCES "training_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
