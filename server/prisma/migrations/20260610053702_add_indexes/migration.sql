-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "classes_enrollment_year_idx" ON "classes"("enrollment_year");

-- CreateIndex
CREATE INDEX "classes_major_id_status_idx" ON "classes"("major_id", "status");

-- CreateIndex
CREATE INDEX "classes_training_level_id_idx" ON "classes"("training_level_id");

-- CreateIndex
CREATE INDEX "classes_college_id_idx" ON "classes"("college_id");

-- CreateIndex
CREATE INDEX "courses_type_idx" ON "courses"("type");

-- CreateIndex
CREATE INDEX "courses_code_idx" ON "courses"("code");

-- CreateIndex
CREATE INDEX "plan_courses_plan_id_idx" ON "plan_courses"("plan_id");

-- CreateIndex
CREATE INDEX "plan_courses_course_id_idx" ON "plan_courses"("course_id");

-- CreateIndex
CREATE INDEX "textbooks_is_active_idx" ON "textbooks"("is_active");

-- CreateIndex
CREATE INDEX "textbooks_category_idx" ON "textbooks"("category");

-- CreateIndex
CREATE INDEX "textbooks_isbn_idx" ON "textbooks"("isbn");
