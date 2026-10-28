CREATE TABLE `nexora_n8n` (
 `owner` text PRIMARY KEY NOT NULL,
 `token_hash` text NOT NULL,
 `enabled` integer NOT NULL DEFAULT 0,
 `allow_model` integer NOT NULL DEFAULT 0,
 `expires_at` text NOT NULL,
 `last_seen_at` text,
 `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nexora_n8n_token` ON `nexora_n8n` (`token_hash`);
