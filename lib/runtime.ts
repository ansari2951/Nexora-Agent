import { createClient, type Client, type InValue, type ResultSet } from '@libsql/client';
import migrations from '@/db/migrations.json';

let client: Client | undefined;
let ready: Promise<void> | undefined;
function connection() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Database connection is not configured.');
  return client ??= createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
}
async function initialize() {
  const tx=await connection().transaction('write');
  try {
    await tx.execute('CREATE TABLE IF NOT EXISTS nexora_schema_migrations (name TEXT PRIMARY KEY NOT NULL)');
    const done=new Set((await tx.execute('SELECT name FROM nexora_schema_migrations')).rows.map(r=>String(r.name)));
    for(const migration of migrations) {
      if(done.has(migration.name))continue;
      for(const sql of migration.statements) await tx.execute(sql);
      await tx.execute({sql:'INSERT INTO nexora_schema_migrations(name) VALUES(?)',args:[migration.name]});
    }
    await tx.commit();
  } catch(error) {await tx.rollback();throw error;} finally {tx.close();}
}
async function database(){await (ready ??= initialize().catch(e=>{ready=undefined;throw e;}));return connection();}
function result(r:ResultSet){return {success:true,results:r.rows.map(row=>Object.fromEntries(r.columns.map(c=>[c,typeof row[c]==='bigint'?Number(row[c]):row[c]]))),meta:{changes:r.rowsAffected,last_row_id:Number(r.lastInsertRowid||0),duration:0,changed_db:r.rowsAffected>0}};}
class Statement {
  constructor(readonly sql:string,readonly args:InValue[]=[]){ }
  bind(...args:unknown[]){return new Statement(this.sql,args.map(v=>v===undefined?null:v) as InValue[]);}
  async all(){return result(await (await database()).execute({sql:this.sql,args:this.args}));}
  async run(){return this.all();}
  async first(column?:string){const row=(await this.all()).results[0];return column?row?.[column]??null:row??null;}
  async raw(options?:{columnNames?:boolean}){const r=await (await database()).execute({sql:this.sql,args:this.args});const rows=r.rows.map(row=>r.columns.map(c=>row[c]));return options?.columnNames?[r.columns,...rows]:rows;}
}
// Compatibility boundary keeps existing parameterized SQL and atomic batches.
const db={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){return (await (await database()).batch(statements.map(s=>({sql:s.sql,args:s.args})),'write')).map(result);}};
export const env={...process.env,DB:db as unknown as D1Database};
