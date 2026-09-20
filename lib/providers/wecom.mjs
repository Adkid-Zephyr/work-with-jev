import AiBot from '@wecom/aibot-node-sdk';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';

export function normalizeWecom(body,botId,receivedAt=Date.now()) {
 if(!body||typeof body.msgid!=='string'||!['group','single'].includes(body.chattype))return null;
 const sender=String(body.from?.userid||'未知成员');
 const rawChat=body.chattype==='group'?body.chatid:sender;
 if(typeof rawChat!=='string'||!rawChat)return null;
 const chatId=`wecom:${botId}:${body.chattype}:${rawChat}`;
 let text='',supported=false;
 if(body.msgtype==='text'){text=body.text?.content||'';supported=!!text;}
 else if(body.msgtype==='voice'){text=body.voice?.content||'';supported=!!text;}
 else if(body.msgtype==='mixed'){
  text=(body.mixed?.msg_item||[]).map(item=>item.msgtype==='text'?item.text?.content||'':'[附件未读取]').join('\n');
  supported=(body.mixed?.msg_item||[]).some(item=>item.msgtype==='text'&&item.text?.content);
 }else text=`[${body.msgtype||'未知类型'}：附件未读取]`;
 if(body.quote?.text?.content)text+='\n[引用] '+body.quote.text.content;
 return {id:`wecom:${botId}:${body.msgid}`,source:'wecom',messageType:body.msgtype,chatId,group:(body.chattype==='group'?'群聊 · ':'私聊 · ')+rawChat,sender,senderId:sender,time:receivedAt,timeKind:'received',text:String(text).slice(0,6000),supported,messageLink:'',threadId:'',mentions:[],category:null,status:'open',starred:false};
}

export function createWecomProvider({cachePath,makeClient=options=>new AiBot.WSClient(options)}={}) {
 let client=null,botId='',state='not_configured',storageError='',records=[],writing=Promise.resolve();
 const ready=(async()=>{
  if(!cachePath)return;
  try{const raw=await readFile(cachePath,'utf8');if(raw.length>9000000)throw new Error('cache size');const d=JSON.parse(raw);if(!Array.isArray(d))throw new Error('cache shape');records=d.filter(m=>m.source==='wecom'&&typeof m.id==='string'&&typeof m.text==='string').slice(-1000);}
  catch(e){if(e.code!=='ENOENT')throw new Error('企业微信本地缓存无法读取，请先备份并检查 .data/wecom-inbox.json');}
 })();
 // Avoid unhandled startup rejection; public methods still surface the failure.
 ready.catch(()=>{});
 function persist(){if(!cachePath)return;const content=JSON.stringify(records);writing=writing.catch(()=>{}).then(async()=>{await mkdir(dirname(cachePath),{recursive:true,mode:0o700});await writeFile(cachePath+'.tmp',content,{mode:0o600});await rename(cachePath+'.tmp',cachePath);storageError='';}).catch(()=>{storageError='本地缓存保存失败，请检查磁盘权限；当前消息仅在内存中。'});}
 function accept(frame){const m=normalizeWecom(frame?.body,botId);if(!m||records.some(x=>x.id===m.id))return;records.push(m);records=records.slice(-1000);persist();}
 function disconnect(){const old=client;client=null;if(old)old.disconnect();state='disconnected';}
 const provider={
  id:'wecom',name:'企业微信',
  async configure({botId:id,secret}){
   await ready;if(typeof id!=='string'||!id.trim()||id.length>200||typeof secret!=='string'||!secret.trim()||secret.length>500)throw new Error('请填写有效的 Bot ID 和 Secret');
   disconnect();botId=id.trim();state='connecting';
   const c=makeClient({botId,secret:secret.trim(),maxReconnectAttempts:5,maxAuthFailureAttempts:1,logger:{debug(){},info(){},warn(){},error(){}}});client=c;
   c.on('authenticated',()=>{if(client===c)state='connected'});
   c.on('message',frame=>{if(client===c&&state==='connected')accept(frame)});
   c.on('disconnected',()=>{if(client===c)state='disconnected'});
   c.on('reconnecting',()=>{if(client===c)state='reconnecting'});
   c.on('error',()=>{if(client===c)state='error'});
   c.on('event.disconnected_event',()=>{if(client===c){state='replaced';client=null;c.disconnect()}});
   try{c.connect()}catch{state='error';client=null;c.disconnect();throw new Error('企业微信连接失败，请核对凭证与网络');}
   return provider.status();
  },
  async status(){await ready;return {connected:state==='connected',status:state,botId,received:records.filter(m=>m.id.startsWith(`wecom:${botId}:`)).length,warning:storageError};},
  async search({query=''}){
   await ready;if(!botId)throw new Error('请先在设置中连接企业微信智能机器人');
   const q=String(query).trim().toLowerCase();if(q.length>200)throw new Error('搜索关键词过长');
   const chats=new Map();for(const m of records)if(m.id.startsWith(`wecom:${botId}:`))chats.set(m.chatId,{id:m.chatId,name:m.group});
   return {chats:[...chats.values()].filter(c=>c.name.toLowerCase().includes(q)),status:state};
  },
  async messages({chat,count=50}){
   await ready;if(!Number.isInteger(count)||count<1||count>200)throw new Error('条数必须是 1–200 的整数');
   if(!botId||typeof chat?.id!=='string'||!chat.id.startsWith(`wecom:${botId}:`))throw new Error('请选择当前机器人的会话');
   const all=records.filter(m=>m.chatId===chat.id).sort((a,b)=>a.time-b.time);
   return {messages:all.slice(-count),hasMore:all.length>count,status:state,warning:storageError};
  },
  async disconnect(){disconnect();return provider.status()},
  async flush(){await ready;await writing;},
 };
 return provider;
}
