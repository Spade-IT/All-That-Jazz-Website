import {z} from 'zod';
export const slots=['taxi','japan','usa','elite','aimc'];
export const templates=[...slots];
export const slotNames={taxi:'01 · Southwest',japan:'02 · Northwest',usa:'03 · North stage',elite:'04 · Northeast',aimc:'05 · Southeast'};
const text=(n,max)=>z.string().trim().min(n).max(max);
const optionalText=max=>z.string().trim().max(max).default('');
export const stallSchema=z.object({
 name:text(2,100),title:text(2,160),category:text(2,80),client:optionalText(160),year:optionalText(20),place:optionalText(120),
 summary:text(10,4000),award:optionalText(400),mood:optionalText(200),
 color:z.string().regex(/^#[0-9a-fA-F]{6}$/),template:z.enum(templates),slot:z.enum(slots),
 sourceUrl:z.union([z.literal(''),z.url().refine(s=>{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;},'Use an HTTPS URL without credentials')]).default(''),
 coverId:z.uuid().nullable().default(null),logoId:z.uuid().nullable().default(null),sortOrder:z.number().int().min(0).max(999).default(0)
}).strict();
export const enquirySchema=z.object({name:text(2,100),company:optionalText(120),email:z.email().max(180),
 eventType:z.enum(['Corporate event','Dealer & incentive programme','Brand activation','Conference','Something else']),timeframe:optionalText(140),brief:text(10,4000),consent:z.literal(true),website:z.string().max(200).default(''),idempotencyKey:z.uuid()}).strict();
export function validId(id){return z.uuid().parse(id);}
export const revisionSchema=z.object({revision:z.number().int().positive()}).strict();
export const saveSchema=z.object({revision:z.number().int().positive(),draft:stallSchema}).strict();
export const loginSchema=z.object({email:z.email().max(180),password:z.string().min(1).max(256)}).strict();
export function validatePassword(p){if(typeof p!=='string'||p.length<14||p.length>256)throw Object.assign(new Error('Use a password of 14–256 characters'),{statusCode:400});return p;}
export function fail(statusCode,message){throw Object.assign(new Error(message),{statusCode});}
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
