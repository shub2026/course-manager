-- 手动创建 system_settings 表（当 Prisma 迁移失败时使用）
-- 使用方法: sqlite3 data/kec.db < prisma/manual_create_settings.sql

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "description" TEXT
);

-- 插入默认设置
INSERT OR IGNORE INTO "system_settings" ("key", "value", "description")
VALUES (
    'current_semester',
    '2025-2026-2',
    '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）'
);

INSERT OR IGNORE INTO "system_settings" ("key", "value", "description")
VALUES (
    'organization_name',
    '欢迎回来',
    '系统标识（单位名称），用于首页展示'
);

-- 验证
SELECT 'Table created: ' || name FROM sqlite_master WHERE type='table' AND name='system_settings';
SELECT 'Settings count: ' || count(*) FROM system_settings;
