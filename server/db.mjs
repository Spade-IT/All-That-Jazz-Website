import pg from 'pg';
export function connectDatabase(config) {
  const pool = new pg.Pool({...config,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:15000});
  pool.on('error', () => console.error('Idle PostgreSQL connection failed'));
  return {query:(sql,args)=>pool.query(sql,args), close:()=>pool.end(), async transaction(fn) {
    const client=await pool.connect();
    try {await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
    catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }};
}
