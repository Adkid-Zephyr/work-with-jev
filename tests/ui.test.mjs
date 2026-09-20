import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {mergeMessages,safeMessageLink,isSystemNotice} from '../lib/core.mjs';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace("import {mergeMessages,safeMessageLink,isSystemNotice} from '/core.mjs';",'');
async function boot(saved,hasKey=false){
 const dom=new JSDOM(html,{url:'http://127.0.0.1:4173',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.mergeMessages=mergeMessages;w.safeMessageLink=safeMessageLink;w.isSystemNotice=isSystemNotice;w.structuredClone=structuredClone;w.confirm=()=>true;w.fetch=async()=>({json:async()=>({nonce:'test',hasKey})});
 if(saved)w.localStorage.setItem('jev-inbox-v1',saved);
 await new vm.Script('(async()=>{'+app+'})()').runInContext(dom.getInternalVMContext());
 return {dom,w,doc:w.document};
}
test('极简看板：原位勾选/撤销、详情改分类、刷新持久化与身份隔离',async()=>{
 const {dom,w,doc}=await boot();
 assert.equal(doc.querySelectorAll('.card').length,14);
 assert.equal(doc.querySelector('aside'),null);assert.equal(doc.querySelector('#stats'),null);
 assert.equal(doc.querySelector('[data-action="star"]'),null);
 const id=doc.querySelector('.card').dataset.id;
 doc.querySelector(`[data-id="${id}"] [data-action="complete"]`).click();
 assert.ok(doc.querySelector(`[data-id="${id}"].done-card`));
 assert.equal(doc.querySelectorAll('.card').length,14);
 let fresh=await boot(w.localStorage.getItem('jev-inbox-v1'));
 assert.ok(fresh.doc.querySelector(`[data-id="${id}"] input`).checked);fresh.dom.window.close();
 doc.querySelector(`[data-id="${id}"] [data-action="complete"]`).click();
 assert.ok(!doc.querySelector(`[data-id="${id}"].done-card`));
 doc.querySelector(`[data-id="${id}"] [data-action="detail"]`).click();
 const select=doc.querySelector('#detailCategory');select.value='valuable';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.ok(doc.querySelector(`.valuable [data-id="${id}"]`));
 fresh=await boot(w.localStorage.getItem('jev-inbox-v1'));assert.ok(fresh.doc.querySelector(`.valuable [data-id="${id}"]`));
 doc.querySelector('[data-person="li"]').click();assert.equal(doc.querySelector('.urgent .column-title span').textContent,'1');
 doc.querySelector('[data-person="wang"]').click();assert.ok(doc.querySelector(`.valuable [data-id="${id}"]`));
 fresh.dom.window.close();dom.window.close();
});
test('旧版稍后事项回到主看板，不丢失完成与收藏数据',async()=>{
 const {dom,w}=await boot();const data=JSON.parse(w.localStorage.getItem('jev-inbox-v1'));
 data.stores['demo|wang'][0].status='later';data.stores['demo|wang'][0].starred=true;
 const next=await boot(JSON.stringify(data));const saved=JSON.parse(next.w.localStorage.getItem('jev-inbox-v1'));
 assert.equal(saved.stores['demo|wang'][0].status,'open');assert.equal(saved.stores['demo|wang'][0].starred,true);
 next.dom.window.close();dom.window.close();
});
test('缺少密钥只打开配置，不虚构分类；消息 HTML 作为文本显示',async()=>{
 const {dom,doc,w}=await boot();doc.querySelector('#classifyBtn').click();assert.equal(doc.querySelector('#settingsDialog').open,true);
 const state=JSON.parse(w.localStorage.getItem('jev-inbox-v1'));state.stores['demo|wang'][0].text='<img src=x onerror=alert(1)>';
 const fresh=await boot(JSON.stringify(state));assert.equal(fresh.doc.querySelectorAll('.card img').length,0);assert.match(fresh.doc.querySelector('.card-text').textContent,/<img/);
 fresh.dom.window.close();dom.window.close();
});

test('条数默认50、保存选择、拒绝越界；预览按指定条数截取',async()=>{
 const {dom,w,doc}=await boot(undefined,true);const input=doc.querySelector('#messageCount');assert.equal(input.value,'50');
 input.value='5';input.dispatchEvent(new w.Event('change'));doc.querySelector('#classifyBtn').click();assert.equal(doc.querySelectorAll('#consentPreview p').length,5);
 const fresh=await boot(w.localStorage.getItem('jev-inbox-v1'));assert.equal(fresh.doc.querySelector('#messageCount').value,'5');
 input.value='201';input.dispatchEvent(new w.Event('change'));assert.equal(input.value,'5');
 fresh.dom.window.close();dom.window.close();
});

test('跨群保存：切群隔离看板，待办去重、拖动、完成同步与刷新恢复',async()=>{
 const viewer={name:'测试用户',role:'运营',openId:'test-user'};const k='feishu|'+JSON.stringify(viewer);
 const message=(id,chatId,group)=>({id,chatId,group,text:id+' 工作内容',sender:'同事',time:1000,category:'todo',status:'open',supported:true,source:'feishu'});
 const saved=JSON.stringify({source:'feishu',viewer,chat:{id:'oc_a',name:'A 群'},stores:{[k]:[message('a1','oc_a','A 群'),message('a2','oc_a','A 群'),message('b1','oc_b','B 群')]}});
 const {dom,w,doc}=await boot(saved);
 assert.equal(doc.querySelectorAll('.card').length,2);
 doc.querySelector('[data-id="a1"] [data-action="enqueue"]').click();
 doc.querySelector('[data-id="a1"] [data-action="enqueue"]').click();assert.equal(doc.querySelectorAll('.queue-item').length,1);
 doc.querySelector('#sourceName').click();assert.equal(doc.querySelector('#sourceDialog').open,true);assert.equal(doc.querySelectorAll('[data-recent]').length,2);
 doc.querySelector('[data-recent="1"]').click();await new Promise(r=>setImmediate(r));
 assert.equal(doc.querySelectorAll('.card').length,1);assert.ok(doc.querySelector('[data-id="b1"]'));assert.equal(doc.querySelectorAll('.queue-item').length,1);
 doc.querySelector('[data-id="b1"] [data-action="enqueue"]').click();assert.equal(doc.querySelectorAll('.queue-item').length,2);
 const tasks=doc.querySelectorAll('.queue-item');const dataTransfer={setData(){},effectAllowed:'',dropEffect:''};
 const start=new w.Event('dragstart',{bubbles:true});Object.defineProperty(start,'dataTransfer',{value:dataTransfer});tasks[1].querySelector('.drag-handle').dispatchEvent(start);
 const drop=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(drop,'dataTransfer',{value:dataTransfer});tasks[0].dispatchEvent(drop);
 assert.match(doc.querySelector('.queue-item').textContent,/b1 工作内容/);
 doc.querySelector('.queue-item input').click();assert.ok(doc.querySelector('[data-id="b1"].done-card'));
 doc.querySelector('#sourceName').click();doc.querySelector('[data-recent="0"]').click();await new Promise(r=>setImmediate(r));
 assert.equal(doc.querySelectorAll('.card').length,2);assert.equal(doc.querySelectorAll('.queue-item').length,2);
 const fresh=await boot(w.localStorage.getItem('jev-inbox-v1'));assert.match(fresh.doc.querySelector('.queue-item').textContent,/b1 工作内容/);assert.ok(fresh.doc.querySelector('.queue-item input').checked);assert.equal(fresh.doc.querySelectorAll('.card').length,2);
 fresh.doc.querySelector('[data-queue-action="remove"]').click();assert.equal(fresh.doc.querySelectorAll('.queue-item').length,1);assert.equal(JSON.parse(fresh.w.localStorage.getItem('jev-inbox-v1')).stores[k].length,3);
 fresh.dom.window.close();dom.window.close();
});

test('修改条数更新看板，增加条数后分类会补拉，预览只用本次范围',async()=>{
 const viewer={name:'测试',role:'运营',openId:'test'},k='feishu|'+JSON.stringify(viewer);
 const msg=i=>({id:'m'+i,chatId:'oc_test',group:'测试群',text:'工作 '+i,time:i,sender:'成员',supported:true,category:'todo',status:'open'});
 const state={source:'feishu',viewer,chat:{id:'oc_test',name:'测试群'},messageCount:50,stores:{[k]:Array.from({length:50},(_,i)=>msg(100-i))}};
 const {dom,w,doc}=await boot(JSON.stringify(state),true);
 const input=doc.querySelector('#messageCount');input.value='10';input.dispatchEvent(new w.Event('change'));assert.equal(doc.querySelectorAll('.card').length,10);
 input.value='75';input.dispatchEvent(new w.Event('change'));
 let count;w.fetch=async(url,options)=>{assert.equal(url,'/api/feishu/messages');count=JSON.parse(options.body).count;return {ok:true,json:async()=>({messages:Array.from({length:75},(_,i)=>msg(100-i)),hasMore:true})}};
 doc.querySelector('#classifyBtn').click();await new Promise(r=>setImmediate(r));
 assert.equal(count,75);assert.equal(doc.querySelectorAll('#consentPreview p').length,75);assert.equal(doc.querySelectorAll('.card').length,75);
 input.value='5';input.dispatchEvent(new w.Event('change'));assert.equal(doc.querySelectorAll('.card').length,5);assert.equal(JSON.parse(w.localStorage.getItem('jev-inbox-v1')).stores[k].length,75);
 dom.window.close();
});

test('待分类消息：官方链接、手动分类、直接加入待办，无需模型请求',async()=>{
 const viewer={name:'测试',role:'运营'},k='feishu|'+JSON.stringify(viewer),link='https://applink.feishu.cn/client/chat/open?openChatId=oc_test&position=12';
 const msg=(id,url)=>({id,chatId:'oc_test',group:'测试群',text:'待处理 '+id,sender:'成员',time:1000,category:null,status:'open',source:'feishu',supported:true,messageLink:url});
 const {dom,w,doc}=await boot(JSON.stringify({source:'feishu',viewer,chat:{id:'oc_test',name:'测试群'},stores:{[k]:[msg('a',link),msg('b','javascript:alert(1)')]}}));
 w.fetch=()=>{throw new Error('人工处理不得调用 API')};
 assert.equal(doc.querySelector('#pending a').href,link);assert.equal(doc.querySelectorAll('#pending a').length,1);
 const select=doc.querySelector('[data-id="a"] select');select.value='urgent';select.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(doc.querySelector('.urgent [data-id="a"]'));
 doc.querySelector('#pending [data-pending="enqueue"]').click();assert.ok(doc.querySelector('.todo [data-id="b"]'));assert.equal(doc.querySelectorAll('.queue-item').length,1);
 const fresh=await boot(w.localStorage.getItem('jev-inbox-v1'));assert.equal(fresh.doc.querySelectorAll('.queue-item').length,1);assert.equal(fresh.doc.querySelectorAll('#pending .pending-item').length,0);
 fresh.dom.window.close();dom.window.close();
});

test('低优先级默认折叠；同账号历史队列迁移并在修改职责后保留',async()=>{
 const viewer={name:'测试',role:'新职责',openId:'same-account'},oldViewer={...viewer,role:'旧职责'};
 const m={id:'m1',chatId:'oc_test',group:'测试群',text:'完整的待办内容',sender:'成员',time:1000,category:'todo',status:'open',source:'feishu'};
 const q={id:JSON.stringify([m.chatId,m.id]),message:m,status:'open'};
 const state={source:'feishu',viewer,chat:{id:'oc_test',name:'测试群'},stores:{['feishu|'+JSON.stringify(viewer)]:[m]},queues:{['feishu|'+JSON.stringify(oldViewer)]:[q],'feishu|{"name":"别人","openId":"other-account"}':[{...q,id:'other'}]}};
 const {dom,w,doc}=await boot(JSON.stringify(state));assert.equal(doc.querySelector('#noiseDisclosure').open,false);assert.equal(doc.querySelectorAll('.queue-item').length,1);
 doc.querySelector('.queue-text').click();assert.match(doc.querySelector('.detail-original').textContent,/完整的待办内容/);
 doc.querySelector('#identityBtn').click();doc.querySelector('#viewerRole').value='再改一次职责';doc.querySelector('#saveIdentity').click();assert.equal(doc.querySelectorAll('.queue-item').length,1);
 const saved=w.localStorage.getItem('jev-inbox-v1');const fresh=await boot(saved);assert.equal(fresh.doc.querySelectorAll('.queue-item').length,1);assert.equal(JSON.parse(saved).queues['queue|feishu|same-account'].length,1);
 fresh.dom.window.close();dom.window.close();
});
