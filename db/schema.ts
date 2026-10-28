import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('nexora_records', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), kind: text('kind').notNull(),
 payload: text('payload').notNull(), dedupe: text('dedupe'),
 createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('nexora_owner_dedupe').on(t.owner,t.dedupe)]);
export const aiRuns = sqliteTable('nexora_ai_runs', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), createdAt: text('created_at').notNull(),
});

export const agentControls = sqliteTable('nexora_agent_controls', {
 owner: text('owner').primaryKey(), config: text('config').notNull(), updatedAt: text('updated_at').notNull(),
});
export const agentJobs = sqliteTable('nexora_agent_jobs', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), type: text('type').notNull(), targetId: text('target_id'),
 state: text('state').notNull(), input: text('input').notNull(), output: text('output'), reason: text('reason'),
 dedupe: text('dedupe').notNull(), lease: text('lease'), leaseUntil: text('lease_until'),
 attempts: integer('attempts').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
},t=>[uniqueIndex('nexora_job_dedupe').on(t.owner,t.dedupe)]);
export const agentAlerts = sqliteTable('nexora_agent_alerts', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(), body: text('body').notNull(),
 targetId: text('target_id'), seen: integer('seen').notNull().default(0), createdAt: text('created_at').notNull(),
});

// Separate server-only tables: never returned by the generic records API.
export const linkedinAccounts = sqliteTable('nexora_linkedin_accounts', {
 owner: text('owner').primaryKey(), subject: text('subject').notNull(), name: text('name').notNull(),
 encryptedToken: text('encrypted_token').notNull(), scopes: text('scopes').notNull(),
 expiresAt: text('expires_at').notNull(), connectedAt: text('connected_at').notNull(),
});
export const linkedinStates = sqliteTable('nexora_linkedin_states', {
 hash: text('hash').primaryKey(), owner: text('owner').notNull(), expiresAt: text('expires_at').notNull(),
 redirectUri: text('redirect_uri').notNull(), scopes: text('scopes').notNull(),
});
export const linkedinPosts = sqliteTable('nexora_linkedin_posts', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), body: text('body').notNull(),
 state: text('state').notNull(), scheduledAt: text('scheduled_at').notNull(),
 subject: text('subject').notNull(), remoteId: text('remote_id'), reason: text('reason'),
 startedAt: text('started_at'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});

// Single-use bearer links. Raw link tokens never enter the database.
export const intakeLinks = sqliteTable('nexora_intake_links', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), leadId:text('lead_id').notNull(),
 tokenHash:text('token_hash').notNull(), state:text('state').notNull(), expiresAt:text('expires_at').notNull(),
 submissionId:text('submission_id'), submissionHash:text('submission_hash'), submission:text('submission'),
 createdAt:text('created_at').notNull(), submittedAt:text('submitted_at'),
},t=>[uniqueIndex('nexora_intake_token').on(t.tokenHash)]);

// Immutable owner approval snapshots, separate from editable workspace records.
export const reviews=sqliteTable('nexora_reviews',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),targetId:text('target_id').notNull(),section:text('section'),
 fingerprint:text('fingerprint').notNull(),payload:text('payload').notNull(),state:text('state').notNull(),
 scheduledAt:text('scheduled_at'),postId:text('post_id'),subject:text('subject'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('nexora_review_snapshot').on(t.owner,t.fingerprint)]);

// Provider secrets and external execution receipts are never exposed via records.
export const networkAccounts=sqliteTable('nexora_network_accounts',{
 owner:text('owner').primaryKey(),apiBase:text('api_base').notNull(),encryptedKey:text('encrypted_key').notNull(),
 accountId:text('account_id'),identifier:text('identifier'),name:text('name'),state:text('state').notNull(),
 executionLease:text('execution_lease'),executionUntil:text('execution_until'),config:text('config').notNull(),syncCursor:text('sync_cursor'),lastSyncAt:text('last_sync_at'),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('nexora_network_account_unique').on(t.accountId)]);
export const networkAuth=sqliteTable('nexora_network_auth',{
 tokenHash:text('token_hash').primaryKey(),owner:text('owner').notNull(),expiresAt:text('expires_at').notNull(),state:text('state').notNull(),
});
export const networkActions=sqliteTable('nexora_network_actions',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),accountId:text('account_id').notNull(),kind:text('kind').notNull(),
 targetId:text('target_id').notNull(),fingerprint:text('fingerprint').notNull(),payload:text('payload').notNull(),state:text('state').notNull(),
 receipt:text('receipt'),reason:text('reason'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('nexora_network_action_dedupe').on(t.owner,t.fingerprint)]);

// Narrow external runner credentials: hashes only, separate from generic records.
export const n8nRunners=sqliteTable('nexora_n8n',{
 owner:text('owner').primaryKey(),tokenHash:text('token_hash').notNull(),enabled:integer('enabled').notNull().default(0),
 allowModel:integer('allow_model').notNull().default(0),allowPosting:integer('allow_posting').notNull().default(0),allowNetwork:integer('allow_network').notNull().default(0),expiresAt:text('expires_at').notNull(),lastSeenAt:text('last_seen_at'),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('nexora_n8n_token').on(t.tokenHash)]);
