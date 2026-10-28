import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('Turso bridge migrates once, preserves tenant filters and rolls back failed atomic batches',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nexora-db-'));
 process.env.TURSO_DATABASE_URL='file:'+join(dir,'test.db');process.env.TURSO_AUTH_TOKEN='local-test';
 const {env}=await import('../lib/runtime');const db=env.DB;
 try {
  const migrations=await db.prepare('SELECT count(*) AS n FROM nexora_schema_migrations').first<{n:number}>();assert.equal(migrations?.n,8);
  await db.batch(['a','b'].map(owner=>db.prepare('INSERT INTO nexora_records(id,owner,kind,payload,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(owner,owner,'lead','{}','now','now')));
  const a=await db.prepare('SELECT id FROM nexora_records WHERE owner=?').bind('a').all();assert.deepEqual(a.results,[{id:'a'}]);
  await assert.rejects(db.batch([db.prepare('UPDATE nexora_records SET payload=? WHERE owner=?').bind('{"changed":true}','a'),db.prepare('INSERT INTO table_that_does_not_exist VALUES(1)')]));
  assert.equal((await db.prepare('SELECT payload FROM nexora_records WHERE id=?').bind('a').first<{payload:string}>())?.payload,'{}');
  const {getDb}=await import('../db');const {records}=await import('../db/schema');const {eq}=await import('drizzle-orm');
  const rows=await getDb().select().from(records).where(eq(records.owner,'b'));assert.equal(rows.length,1);assert.equal(rows[0].id,'b');
 }finally{await rm(dir,{recursive:true,force:true});}
});
