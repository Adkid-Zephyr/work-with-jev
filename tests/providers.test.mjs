import test from 'node:test';import assert from 'node:assert/strict';
import {createFeishuProvider} from '../lib/providers/feishu.mjs';
import {createProviders} from '../lib/providers/index.mjs';
test('provider boundary: only Feishu registered, user identity required',async()=>{
 const calls=[];const p=createFeishuProvider(async args=>{calls.push(args);return {ok:true,data:{chats:[{chat_id:'oc_demo',name:'演示'}]}}});
 assert.deepEqual(await p.search({query:'演示'}),{chats:[{id:'oc_demo',name:'演示'}]});assert.ok(calls[0].includes('user'));
 assert.deepEqual([...createProviders(()=>{}).keys()],['feishu']);await assert.rejects(p.search({query:''}));
});
test('pagination retrieves requested count in <=50-item pages, validates count',async()=>{
 let n=0;const calls=[];
 const p=createFeishuProvider(async args=>{calls.push(args);const size=Number(args[args.indexOf('--page-size')+1]);const messages=Array.from({length:size},()=>({message_id:'m'+(++n),content:'hello',msg_type:'text',create_time:1000-n}));return {ok:true,data:{messages,has_more:true,page_token:'page'+n}}});
 const d=await p.messages({chat:{id:'oc_demo',name:'Demo'},count:75});assert.equal(d.messages.length,75);assert.equal(calls.length,2);assert.ok(calls[1].includes('--page-token'));assert.equal(calls[1][calls[1].indexOf('--page-size')+1],'25');
 await assert.rejects(p.messages({chat:{id:'oc_demo'},count:201}));
});
