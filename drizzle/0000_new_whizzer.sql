CREATE TABLE `nexora_ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nexora_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`dedupe` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_owner_dedupe` ON `nexora_records` (`owner`,`dedupe`);