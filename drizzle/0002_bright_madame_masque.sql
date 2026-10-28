CREATE TABLE `nexora_linkedin_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`name` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`scopes` text NOT NULL,
	`expires_at` text NOT NULL,
	`connected_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nexora_linkedin_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL,
	`state` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`subject` text NOT NULL,
	`remote_id` text,
	`reason` text,
	`started_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nexora_linkedin_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`scopes` text NOT NULL
);
