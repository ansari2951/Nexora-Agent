CREATE TABLE `nexora_intake_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`lead_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`state` text NOT NULL,
	`expires_at` text NOT NULL,
	`submission_id` text,
	`submission_hash` text,
	`submission` text,
	`created_at` text NOT NULL,
	`submitted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_intake_token` ON `nexora_intake_links` (`token_hash`);