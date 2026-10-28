CREATE TABLE `nexora_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`section` text,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`scheduled_at` text,
	`post_id` text,
	`subject` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_review_snapshot` ON `nexora_reviews` (`owner`,`fingerprint`);