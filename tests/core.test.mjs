import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMessages,mergeMessages,interpret,makeRequest} from '../lib/core.mjs';
test('飞书消息归一化：过滤撤回、去重、保留非文本待确认、替换 mention',()=>{
 const messages=normalizeMessages({ok:true,data:{messages:[{message_id:'a',msg_type:'text',create_time:'123',content:'{"text":"@_user_1 需要回复"}',mentions:[{key:'@_user_1',name:'小王'}],sender:{name:'小李'}},{message_id:'a',msg_type:'text'},{message_id:'b',deleted:true},{message_id:'c',msg_type:'image',content:'img_123'}]}},{id:'oc_x',name:'测试'});
 assert.equal(messages.length,2);assert.equal(messages[0].text,'@小王 需要回复');assert.equal(messages[1].supported,false);
});
test('重复拉取保留完成、收藏、手动分类；编辑过的文本重新待分类',()=>{
 const prev=[{id:'a',text:'任务',status:'done',starred:true,category:'todo',manual:true}];
 const merged=mergeMessages(prev,[{id:'a',text:'任务',status:'open',starred:false,category:null}]);
 assert.equal(merged.length,1);assert.equal(merged[0].status,'done');assert.equal(merged[0].category,'todo');assert.equal(merged[0].starred,true);assert.equal(merged[0].manual,true);
 const edited=mergeMessages(prev,[{id:'a',text:'已延期',status:'open'}]);assert.equal(edited[0].category,null);assert.equal(edited[0].status,'done');
});
const answers=(r,a,u,v)=>Object.fromEntries(['related','action','urgent','value'].map((k,i)=>['m0_'+k,{noul:[r,a,u,v][i]}]));
test('别人的紧急任务不进入我的紧急；模糊判断保留待确认',()=>{
 assert.equal(interpret(answers(.05,.02,.99,.1),0).category,'noise');
 assert.equal(interpret(answers(.95,.95,.95,.1),0).category,'urgent');
 assert.equal(interpret(answers(.95,.95,.2,.1),0).category,'todo');
 assert.equal(interpret(answers(.95,.02,.1,.9),0).category,'valuable');
 assert.equal(interpret(answers(.5,.3,.5,.4),0).review,true);
 assert.throws(()=>interpret({},0),/不完整/);assert.throws(()=>interpret(answers(NaN,.9,.9,.9),0));
});
test('问题明确引用目标，模型状态不携带预设答案、完成标记、API Key',()=>{
 const req=makeRequest([{id:'a',text:'收到',category:'noise',apiKey:'secret',status:'done'}],{name:'小王'});
 assert.equal(Object.keys(req.questions).length,4);assert.match(req.questions.m0_action.instructions,/messages\[0\]/);
 const encoded=JSON.stringify(req);assert.ok(!encoded.includes('secret'));assert.ok(!encoded.includes('category'));assert.ok(!encoded.includes('"status"'));
});
