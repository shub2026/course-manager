-- DropIndex
DROP INDEX "users_username_idx";

-- CreateIndex
CREATE INDEX "classes_custom_plan_id_idx" ON "classes"("custom_plan_id");

-- CreateIndex
CREATE INDEX "plan_course_semesters_semester_idx" ON "plan_course_semesters"("semester");

-- CreateIndex
CREATE INDEX "plan_textbooks_semester_id_idx" ON "plan_textbooks"("semester_id");

-- CreateIndex
CREATE INDEX "plan_textbooks_textbook_id_idx" ON "plan_textbooks"("textbook_id");

-- CreateIndex
CREATE INDEX "training_plans_major_id_idx" ON "training_plans"("major_id");

-- CreateIndex
CREATE INDEX "training_plans_college_id_idx" ON "training_plans"("college_id");

-- CreateIndex
CREATE INDEX "training_plans_training_level_id_idx" ON "training_plans"("training_level_id");
