CREATE TABLE `nexora_network_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`api_base` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`account_id` text,
	`identifier` text,
	`name` text,
	`state` text NOT NULL,
	`execution_lease` text,
	`execution_until` text,
	`config` text NOT NULL,
	`sync_cursor` text,
	`last_sync_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_network_account_unique` ON `nexora_network_accounts` (`account_id`);--> statement-breakpoint
CREATE TABLE `nexora_network_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`receipt` text,
	`reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_network_action_dedupe` ON `nexora_network_actions` (`owner`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `nexora_network_auth` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` text NOT NULL,
	`state` text NOT NULL
);
