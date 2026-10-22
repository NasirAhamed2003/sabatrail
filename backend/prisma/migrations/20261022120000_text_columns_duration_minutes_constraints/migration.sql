-- Long text columns: VARCHAR(191) rejected longer descriptions, tips and image URLs
ALTER TABLE `Places` ADD COLUMN `before_you_go` TEXT NULL,
    ADD COLUMN `image_credit` VARCHAR(191) NULL,
    ADD COLUMN `visit_duration_minutes` INTEGER NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `travel_tips` TEXT NULL,
    MODIFY `facilities` TEXT NULL,
    MODIFY `image` TEXT NULL;

-- Backfill minutes from the legacy free-text duration.
-- "30 minutes" -> 30, "1 hour" -> 60, "1-2 hours" -> 90 (midpoint of a range).
UPDATE `Places`
SET `visit_duration_minutes` = CASE
    WHEN `visit_duration` REGEXP '^[0-9]+ *- *[0-9]+ *(hour|hr)' THEN
        ROUND((CAST(REGEXP_SUBSTR(`visit_duration`, '^[0-9]+') AS UNSIGNED)
             + CAST(REGEXP_SUBSTR(REGEXP_REPLACE(`visit_duration`, '^[0-9]+ *- *', ''), '^[0-9]+') AS UNSIGNED)) * 30)
    WHEN `visit_duration` REGEXP '^[0-9]+ *(hour|hr)' THEN
        CAST(REGEXP_SUBSTR(`visit_duration`, '^[0-9]+') AS UNSIGNED) * 60
    WHEN `visit_duration` REGEXP '^[0-9]+ *min' THEN
        CAST(REGEXP_SUBSTR(`visit_duration`, '^[0-9]+') AS UNSIGNED)
    ELSE NULL
END
WHERE `visit_duration` IS NOT NULL;

-- Role becomes an enum (existing values are already USER / ADMIN)
ALTER TABLE `Users` MODIFY `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

-- Category names are unique
CREATE UNIQUE INDEX `Categories_category_name_key` ON `Categories`(`category_name`);

-- A place can appear only once in a plan
CREATE UNIQUE INDEX `Visit_Plan_Places_plan_id_place_id_key` ON `Visit_Plan_Places`(`plan_id`, `place_id`);
