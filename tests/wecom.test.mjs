import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWecomProvider,normalizeWecom} from '../lib/providers/wecom.mjs';
class FakeClient extends EventEmitter{connect(){this.emit('connected');return this}disconnect(){this.emit('disconnected','closed')}}
const msg={msgid:'m1',chattype:'group',chatid:'chat1',from:{userid:'u1'},msgtype:'text',text:{content:'请处理这个问题'}};
test('企微：认证后接收、回调去重、私聊/群隔离、只读、缓存重载与机器人隔离',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jev-wecom-'));let client;const cachePath=join(dir,'inbox.json');
 const makeClient=()=>{client=new FakeClient();return client};const p=createWecomProvider({cachePath,makeClient});
 try{
 assert.equal((await p.status()).connected,false);await assert.rejects(p.search({}));
 await p.configure({botId:'botA',secret:'secret-not-for-storage'});assert.equal((await p.status()).connected,false);
 client.emit('message',{body:msg});assert.equal((await p.status()).received,0);
 client.emit('authenticated');assert.equal((await p.status()).connected,true);
 client.emit('message',{body:msg});client.emit('message',{body:msg});client.emit('message',{body:{...msg,msgid:'m2',chattype:'single'}});
 const chats=(await p.search({query:''})).chats;assert.equal(chats.length,2);
 const group=chats.find(c=>c.id.includes(':group:'));assert.equal((await p.messages({chat:group})).messages.length,1);
 assert.equal((await p.status()).received,2);await p.flush();assert.ok(!(await readFile(cachePath,'utf8')).includes('secret-not-for-storage'));
 await p.disconnect();const reloaded=createWecomProvider({cachePath,makeClient});await reloaded.configure({botId:'botA',secret:'x'});assert.equal((await reloaded.search({})).chats.length,2);await reloaded.disconnect();
 await p.configure({botId:'botB',secret:'y'});assert.equal((await p.search({})).chats.length,0);await assert.rejects(p.messages({chat:group}));
 client.emit('authenticated');client.emit('event.disconnected_event',{});assert.equal((await p.status()).status,'replaced');
 }finally{await p.disconnect();await p.flush();await rm(dir,{recursive:true,force:true});}
});
test('企微：保留文本、语音文本和图文文字；不保留附件URL或aeskey',()=>{
 const file=normalizeWecom({...msg,msgtype:'file',file:{url:'secret-url',aeskey:'secret-key'}},'bot');assert.equal(file.supported,false);assert.ok(!JSON.stringify(file).includes('secret'));
 const mixed=normalizeWecom({...msg,msgtype:'mixed',mixed:{msg_item:[{msgtype:'text',text:{content:'你好'}},{msgtype:'image',image:{url:'private'}}]}},'bot',123);
 assert.equal(mixed.time,123);assert.equal(mixed.supported,true);assert.match(mixed.text,/附件未读取/);
 assert.equal(normalizeWecom({msgtype:'event'},'bot'),null);
});
