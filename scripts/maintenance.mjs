import {getConfig} from '../server/config.mjs';
import {connectDatabase} from '../server/db.mjs';
const config=getConfig();if(!Number.isInteger(config.retentionDays)||config.retentionDays<1)throw new Error('ENQUIRY_RETENTION_DAYS must be a positive integer');
const db=connectDatabase(config.db);
try{await db.transaction(async tx=>{
 await tx.query('DELETE FROM sessions WHERE expires_at<now()');
 await tx.query("DELETE FROM login_attempts WHERE created_at<now()-interval '1 day'");
 const r=await tx.query("DELETE FROM enquiries WHERE created_at<now()-($1::int * interval '1 day') RETURNING id",[config.retentionDays]);
 await tx.query("DELETE FROM audit_log WHERE created_at<now()-interval '365 days'");
 console.log(`Maintenance complete. Removed ${r.rows.length} enquiries beyond the configured retention period.`);
});}finally{await db.close();}
