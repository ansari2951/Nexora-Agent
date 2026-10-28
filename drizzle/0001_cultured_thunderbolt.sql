CREATE TABLE `nexora_agent_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`target_id` text,
	`seen` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nexora_agent_controls` (
	`owner` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nexora_agent_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`target_id` text,
	`state` text NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`reason` text,
	`dedupe` text NOT NULL,
	`lease` text,
	`lease_until` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_job_dedupe` ON `nexora_agent_jobs` (`owner`,`dedupe`);