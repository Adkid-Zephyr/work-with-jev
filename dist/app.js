import {mergeMessages,safeMessageLink,isSystemNotice} from '/core.mjs';
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS={urgent:{name:'紧急处理',desc:'需要你尽快回复或行动',icon:'ϟ'},todo:{name:'我的待办',desc:'与你相关，安排时间完成',icon:'☑'},valuable:{name:'值得一看',desc:'有用的分享与重要进展',icon:'◇'},noise:{name:'暂时略过',desc:'不占用此刻的注意力',icon:'☷'}};
const people={wang:{name:'小王',role:'内容运营，负责新品上线的脚本、发布文案和活动协调'},li:{name:'小李',role:'设计师，负责新品封面、视觉素材与视频剪辑'},chen:{name:'小陈',role:'开发工程师，负责官网、上线发布和接口排查'}};
const examples=[
 ['林悦','10:02','@小王 客户正在等最终脚本，麻烦现在确认开场能不能用，我这边等你回复再发。','urgent','noise','noise'],
 ['周宁','10:08','@小王 发布文案里产品名称写错了，马上就要推送，麻烦先核对一下。','urgent','noise','noise'],
 ['林悦','09:36','@小王 这周把下期选题整理成清单，周五例会上我们一起过一下。','todo','noise','noise'],
 ['小李','09:42','@小王 封面初稿已经放在共享文档里，有空帮忙看一下标题是否和脚本一致。','todo','valuable','noise'],
 ['小陈','09:48','@小王 周四演示前，麻烦准备三条观众可能会问的问题。','todo','noise','valuable'],
 ['周宁','09:51','分享一份短视频开头写作指南：先展示用户遇到的问题，再解释怎么解决。做这期脚本可以参考。','valuable','valuable','noise'],
 ['林悦','09:55','最近整理了一些低成本收音技巧，室内录口播时，麦克风离嘴近一点往往比换设备更有效。','valuable','valuable','noise'],
 ['小李','10:00','哈哈哈这个表情也太形象了 😂','noise','noise','noise'],
 ['周宁','10:01','收到收到 👍','noise','noise','noise'],
 ['林悦','09:39','@小李 客户马上开会，请现在发一下封面初稿，对方等着展示。','noise','urgent','noise'],
 ['周宁','09:44','@小李 这周再做一版竖屏封面，保持这次的字体和配色。','noise','todo','noise'],
 ['林悦','09:58','@小陈 官网登录接口报错了，演示马上开始，麻烦尽快检查。','noise','noise','urgent'],
 ['周宁','09:46','@小陈 下周给演示页补一下手机布局，完成后发截图就好。','noise','noise','todo'],
 ['小陈','09:50','整理了一份前端性能排查笔记，包含网络请求超时和资源加载的定位方法。','noise','noise','valuable']
];
const storageKey='jev-inbox-v1';let persisted={};try{persisted=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
let source=persisted.source||'demo',person=persisted.person||'wang',viewer=persisted.viewer||{name:'',role:'',openId:''},chat=persisted.chat||null,stores=persisted.stores||{},view='open',nonce='',hasKey=false,busy=false,toastTimer,proposal=null,lastRun='';
let messageCount=Number.isInteger(persisted.messageCount)&&persisted.messageCount>=1&&persisted.messageCount<=200?persisted.messageCount:50;
let queues=persisted.queues||{},draggedTask=null,pendingExpanded=false,noiseExpanded=false;
const viewerKey=()=>source==='demo'?person:JSON.stringify(viewer);
const key=()=>source+'|'+viewerKey();
function demoRows(){let idx=['wang','li','chen'].indexOf(person)+3;return examples.map((x,i)=>({id:'demo-'+i,text:x[2],sender:x[0],time:new Date('2026-09-20T'+x[1]+':00+08:00').getTime(),group:'周五上线项目组',chatId:'demo-launch',source:'demo',supported:true,category:x[idx],status:'open',starred:false,result:{origin:'preset',review:false}}));}
function rows(){if(!stores[key()])stores[key()]=source==='demo'?demoRows():[];return stores[key()];}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({source,person,viewer,chat,stores,messageCount,queues}));}catch{notice('浏览器存储空间不足，本次改动可能无法在刷新后保留。');}}
function notice(s){
 document.querySelectorAll('.dialog-notice').forEach(el=>el.remove());
 const dialog=document.querySelector('dialog[open]');
 $('#notice').textContent=dialog?'':s;$('#notice').classList.toggle('hidden',!!dialog||!s);
 if(dialog&&s){const el=document.createElement('p');el.className='dialog-notice';el.setAttribute('role','alert');el.textContent=s;dialog.querySelector('.dialog-head').after(el)}
}
function toast(s){$('#toast').textContent=s;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3000)}
async function api(path,b={}){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Token':nonce},body:JSON.stringify(b)});const d=await r.json();if(!r.ok)throw new Error(d.error||'请求失败');return d;}
async function task(fn){
 if(busy)return;busy=true;
 const controls=[...document.querySelectorAll('button,input,select,textarea')].map(el=>[el,el.disabled]);
 controls.forEach(([el])=>el.disabled=true);document.querySelector('main').setAttribute('aria-busy','true');notice('');
 try{await fn()}catch(e){notice(e.message);if(!document.querySelector('dialog[open]'))toast(e.message)}
 finally{busy=false;controls.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled});document.querySelector('main').removeAttribute('aria-busy');render()}
}
function currentViewer(){return source==='demo'?people[person]:viewer;}
function visibleMessages(){return rows().filter(m=>!isSystemNotice(m)&&(source==='demo'||m.chatId===chat?.id)).sort((a,b)=>a.time-b.time).slice(-messageCount)}
function render(){
 const active=document.activeElement,owner=active?.closest('[data-task],[data-id]');
 const focus=owner?{scope:active.closest('#queueList,#board,#pending')?.id,id:owner.dataset.task||owner.dataset.id,task:!!owner.dataset.task,action:active.dataset.queueAction||active.dataset.action||active.dataset.pending,tag:active.tagName}:null;
 const queueScroll=$('#queueList').scrollTop;
 const scrolls=new Map([...document.querySelectorAll('.column-body')].map(el=>[el.dataset.column,el.scrollTop]));
 const all=visibleMessages(),current=currentViewer();
 $('#messageCount').value=messageCount;
 // Earlier builds had a deferred list. Bring it back into the single board.
 for(const m of all) if(m.status==='later')m.status='open';
 $('#identityText').textContent=current.name?`我是${current.name}`:'设置我的身份';
 $('#sourceSelect').value=source;
 $('#pullBtn').classList.toggle('hidden',source!=='feishu');$('#resetBtn').classList.toggle('hidden',source!=='demo');
 $('#sourceName').textContent=chat?.name?chat.name+' ⌄':'选择群聊';$('#sourceName').classList.toggle('hidden',source==='demo');
 $('#modeLabel').textContent=source==='demo'?(all.some(m=>m.result?.origin==='jev')?'示例 · Jev 实测':'示例 · 预设分类'):'飞书 · 当前 '+all.length+' / '+messageCount+' 条';
 $('#classifyBtn').textContent=busy?'分类中…':'分类';
 const pending=all.filter(m=>!m.category);$('#pending').classList.toggle('hidden',!pending.length);
 $('#pending').innerHTML=`<details ${pendingExpanded?'open':''}><summary>${pending.length} 条待分类消息</summary>${pending.map(m=>`<article class="pending-item" data-id="${esc(m.id)}"><div class="card-meta">${esc(m.sender)} · ${esc(m.group)}</div><button class="pending-text" data-pending="detail" title="查看全文"><p>${esc(m.text)}${!m.supported?'（附件待确认）':''}</p></button><div class="pending-actions">${messageLink(m)}<select data-pending="category" aria-label="手动分类"><option value="">手动分类…</option>${Object.entries(CATS).map(([k,c])=>`<option value="${k}">${c.name}</option>`).join('')}</select><button data-pending="enqueue" class="quiet" ${isQueued(m)?'disabled':''}>${isQueued(m)?'已加入待办':'+ 加入待办'}</button></div></article>`).join('')}</details>`;
 const disclosure=$('#pending details');disclosure.ontoggle=()=>{if(disclosure.isConnected)pendingExpanded=disclosure.open};
 $('#board').innerHTML=Object.entries(CATS).map(([cat,c])=>{const list=all.filter(x=>x.category===cat);const heading=`${c.name}<span>${list.filter(x=>x.status!=='done').length}</span>`;const body=`<div class="column-body" data-column="${cat}">${list.map(card).join('')||'<div class="empty">暂无消息</div>'}</div>`;return cat==='noise'?`<section class="column noise"><details id="noiseDisclosure" ${noiseExpanded?'open':''}><summary class="column-title">${heading}</summary>${body}</details></section>`:`<section class="column ${cat}"><h2 class="column-title">${heading}</h2>${body}</section>`}).join('');
 for(const el of document.querySelectorAll('.column-body'))el.scrollTop=scrolls.get(el.dataset.column)||0;
 const noise=$('#noiseDisclosure');noise.ontoggle=()=>{if(noise.isConnected)noiseExpanded=noise.open};
 $('#keyStatus').textContent=hasKey?'· 已配置':'· 未配置';
 renderQueue();$('#queueList').scrollTop=queueScroll;
 if(focus?.scope){
  const container=document.getElementById(focus.scope);
  const owner=[...container.querySelectorAll(focus.task?'[data-task]':'[data-id]')].find(el=>(el.dataset.task||el.dataset.id)===focus.id);
  const control=owner&&[...owner.querySelectorAll('button,input,select')].find(el=>el.tagName===focus.tag&&(el.dataset.queueAction||el.dataset.action||el.dataset.pending)===focus.action);
  if(control&&!control.disabled)control.focus({preventScroll:true});
 }
 $('#evidence').textContent=lastRun;$('#evidence').classList.toggle('hidden',!lastRun);save();
}
function setCategory(m,category){
 if(!CATS[category])return;
 m.category=category;m.manual=true;
 const live=rows().find(row=>row.id===m.id&&row.chatId===m.chatId);
 if(live){live.category=category;live.manual=true}
 for(const t of queue())if(t.message.id===m.id&&t.message.chatId===m.chatId){t.message.category=category;t.message.manual=true}
}
function isQueued(m){return queue().some(t=>t.message.id===m.id&&t.message.chatId===m.chatId)}
function messageLink(m){const url=safeMessageLink(m.messageLink);return url?`<a class="message-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">在飞书打开 ↗</a>`:m.source==='feishu'?'<span class="link-unavailable">暂无定位链接，请刷新消息</span>':'';}
$('#pending').addEventListener('change',e=>{if(e.target.dataset.pending!=='category'||!CATS[e.target.value])return;const m=rows().find(m=>m.id===e.target.closest('[data-id]').dataset.id);if(!m)return;pendingExpanded=true;setCategory(m,e.target.value);render();toast('已手动分类')});
$('#pending').addEventListener('click',e=>{const b=e.target.closest('button[data-pending]');if(!b)return;const m=rows().find(m=>m.id===b.closest('[data-id]').dataset.id);if(!m)return;if(b.dataset.pending==='detail'){showDetail(m);return}pendingExpanded=true;if(!m.category){m.category='todo';m.manual=true;}enqueue(m)});
function card(m){const t=new Date(m.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});return `<article class="card ${m.status==='done'?'done-card':''}" data-id="${esc(m.id)}"><input class="complete-check" type="checkbox" data-action="complete" aria-label="完成：${esc(m.text.slice(0,30))}" ${m.status==='done'?'checked':''}><button class="card-detail" data-action="detail" aria-label="查看消息原文"><div class="card-meta">${esc(m.sender)}<time>${t}</time></div><p class="card-text">${esc(m.text)}</p>${m.result?.review?'<span class="review">待确认</span>':''}</button><button class="queue-add" data-action="enqueue" ${queue().some(t=>t.message.id===m.id&&t.message.chatId===m.chatId)?'disabled':''}>${queue().some(t=>t.message.id===m.id&&t.message.chatId===m.chatId)?'已加入待办':'+ 加入待办'}</button>${messageLink(m)}</article>`;}
$('#board').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||busy)return;const m=rows().find(m=>m.id===b.closest('[data-id]').dataset.id);if(!m)return;if(b.dataset.action==='enqueue'){enqueue(m);return}showDetail(m)});
$('#board').addEventListener('change',e=>{if(e.target.dataset.action!=='complete')return;const m=rows().find(m=>m.id===e.target.closest('[data-id]').dataset.id);if(!m)return;m.status=e.target.checked?'done':'open';for(const t of queue())if(t.message.id===m.id&&t.message.chatId===m.chatId)t.status=m.status;render();});
function queueKey(){return source==='demo'?'queue|demo|'+person:'queue|feishu|'+(viewer.openId||'name:'+viewer.name)}
function queue(){
 const target=queueKey(),list=queues[target]??(queues[target]=[]);
 for(const old of Object.keys(queues)){
  let matches=source==='demo'&&old===key();
  if(source==='feishu'&&old.startsWith('feishu|')){try{const v=JSON.parse(old.slice(7));matches=viewer.openId?!!v.openId&&v.openId===viewer.openId:!v.openId&&v.name===viewer.name}catch{}}
  if(!matches)continue;
  const ids=new Set(list.map(t=>t.id));for(const t of queues[old])if(!ids.has(t.id)){list.push(t);ids.add(t.id)}
  delete queues[old];
 }
 return list;
}
function retainQueueForViewer(previous){
 const oldKey=previous.openId?'queue|feishu|'+previous.openId:'queue|feishu|name:'+previous.name;
 const newKey=viewer.openId?'queue|feishu|'+viewer.openId:'queue|feishu|name:'+viewer.name;
 if(oldKey===newKey||(previous.openId&&viewer.openId&&previous.openId!==viewer.openId))return;
 const target=queues[newKey]??(queues[newKey]=[]),ids=new Set(target.map(t=>t.id));
 for(const t of queues[oldKey]||[])if(!ids.has(t.id)){target.push(t);ids.add(t.id)}
 delete queues[oldKey];
}
function enqueue(m){if(queue().some(t=>t.message.id===m.id&&t.message.chatId===m.chatId))return;queue().push({id:JSON.stringify([m.chatId,m.id]),message:structuredClone(m),status:m.status==='done'?'done':'open'});render();toast('已加入跨群待办');}
function renderQueue(){
 $('#queueCount').textContent=queue().filter(t=>t.status!=='done').length;
 $('#queueList').innerHTML=queue().map((t,i)=>`<div class="queue-item ${t.status==='done'?'queue-done':''}" data-task="${esc(t.id)}"><button class="drag-handle" draggable="true" aria-label="拖动待办排序；也可使用上下按钮">⠿</button><input type="checkbox" data-queue-action="complete" aria-label="完成待办" ${t.status==='done'?'checked':''}><div class="queue-content"><button class="queue-text" data-queue-action="detail" title="查看全文"><p>${esc(t.message.text)}</p></button><small>${esc(t.message.group)} · ${esc(t.message.sender)}</small>${messageLink(rows().find(m=>m.id===t.message.id&&m.chatId===t.message.chatId)||t.message)}</div><div class="queue-controls"><button data-queue-action="up" aria-label="上移待办" ${i===0?'disabled':''}>↑</button><button data-queue-action="down" aria-label="下移待办" ${i===queue().length-1?'disabled':''}>↓</button><button data-queue-action="remove" aria-label="移出待办">×</button></div></div>`).join('')||'<p class="queue-empty">将消息加入待办，切换群聊后仍保留。</p>';
}
function moveTask(id,to){const list=queue(),from=list.findIndex(t=>t.id===id);if(from<0||to<0||to>=list.length)return;const [item]=list.splice(from,1);list.splice(to,0,item);render()}
$('#queueList').addEventListener('change',e=>{if(e.target.dataset.queueAction!=='complete')return;const t=queue().find(t=>t.id===e.target.closest('[data-task]').dataset.task);if(!t)return;t.status=e.target.checked?'done':'open';const m=rows().find(m=>m.id===t.message.id&&m.chatId===t.message.chatId);if(m)m.status=t.status;render()});
$('#queueList').addEventListener('click',e=>{const b=e.target.closest('button[data-queue-action]');if(!b)return;const id=b.closest('[data-task]').dataset.task,i=queue().findIndex(t=>t.id===id);if(i<0)return;if(b.dataset.queueAction==='detail'){showDetail(queue()[i].message);return}if(b.dataset.queueAction==='remove'){const [removed]=queue().splice(i,1);render();toast('已移出待办，原消息保留');return}moveTask(id,i+(b.dataset.queueAction==='up'?-1:1))});
$('#queueList').addEventListener('dragstart',e=>{const handle=e.target.closest('.drag-handle');if(!handle)return;draggedTask=handle.closest('[data-task]').dataset.task;e.dataTransfer.setData('text/plain',draggedTask);e.dataTransfer.effectAllowed='move'});
$('#queueList').addEventListener('dragover',e=>{if(draggedTask){e.preventDefault();e.dataTransfer.dropEffect='move'}});
$('#queueList').addEventListener('drop',e=>{if(!draggedTask)return;e.preventDefault();const target=e.target.closest('[data-task]');const to=target?queue().findIndex(t=>t.id===target.dataset.task):queue().length-1;moveTask(draggedTask,to);draggedTask=null});
$('#queueList').addEventListener('dragend',()=>{draggedTask=null});
function showDetail(m){m=rows().find(row=>row.id===m.id&&row.chatId===m.chatId)||m;const signals=m.result?.signals;const context=rows().filter(x=>x.chatId===m.chatId&&x.id!==m.id).sort((a,b)=>Math.abs(a.time-m.time)-Math.abs(b.time-m.time)).slice(0,4).sort((a,b)=>a.time-b.time);$('#detailBody').innerHTML=`<p>${esc(m.sender)} · ${esc(m.group)} · ${new Date(m.time).toLocaleString('zh-CN')}</p><div class="detail-original">${esc(m.text)}</div>${messageLink(m)}<label>分类<select id="detailCategory">${!m.category?'<option value="">尚未分类</option>':''}${Object.entries(CATS).map(([k,c])=>`<option value="${k}" ${k===m.category?'selected':''}>${c.name}</option>`).join('')}</select></label>${signals?'<h3>Jev 判断信号</h3>'+Object.entries(signals).map(([k,v])=>`<div class="signal-row"><span>${{related:'与我相关',action:'需要我行动',urgent:'迫切需要处理',value:'有参考价值'}[k]}</span><b>${Math.round(v*100)}%</b></div>`).join('')+'<p>概率不是正确率保证；当前分类阈值尚未经过业务数据校准。</p>':`<p>${m.manual?'手动分类，未使用模型概率。':m.source==='demo'?'预设演示结果。':'尚无模型判断。'}</p>`}<h3>附近的群消息</h3>${context.map(x=>`<div class="context-item"><b>${esc(x.sender)}</b><br>${esc(x.text)}</div>`).join('')}<p>以上为本次已加载的附近消息，不代表完整会话。</p>`;$('#detailCategory').onchange=e=>{setCategory(m,e.target.value);render()};$('#detailDialog').showModal();}

for(const b of document.querySelectorAll('[data-close]')){b.setAttribute('aria-label','关闭');b.onclick=()=>b.closest('dialog').close();}
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
$('#settingsBtn').onclick=()=>$('#settingsDialog').showModal();
$('#saveKey').onclick=()=>task(async()=>{const d=await api('key',{key:$('#keyInput').value});hasKey=d.hasKey;$('#keyInput').value='';toast(hasKey?'密钥已保存在本机服务内存':'已清除密钥')});
$('#checkFeishu').onclick=()=>task(async()=>{try{const d=await api('feishu/status');$('#feishuStatus').textContent=d.connected?`已连接：${d.name||'飞书用户'}`:`登录状态：${d.status}`;const previous={...viewer};if(source==='feishu')queue();if(d.name&&!viewer.name)viewer.name=d.name;if(d.openId)viewer.openId=d.openId;retainQueueForViewer(previous);}catch(e){$('#feishuStatus').textContent=e.message;throw e}});
$('#sourceSelect').onchange=()=>{if($('#sourceSelect').value==='demo'){source='demo';lastRun='';notice('');render()}else{openChats();$('#sourceSelect').value=source}};
$('#searchChats').onclick=()=>task(async()=>{if(!$('#chatQuery').value.trim())throw new Error('请输入群名称关键词');const d=await api('feishu/search',{query:$('#chatQuery').value});$('#chatResults').innerHTML=d.chats.map((c,i)=>`<button class="chat-option" data-index="${i}"><span>${esc(c.name)}</span><span>选择并拉取 →</span></button>`).join('')||'<p>没有找到匹配的群。请换一个关键词，或确认当前账号可访问该群。</p>';$('#chatResults').onclick=e=>{const b=e.target.closest('[data-index]');if(b)selectChat(d.chats[Number(b.dataset.index)])};});
$('#chatQuery').onkeydown=e=>{if(e.key==='Enter')$('#searchChats').click()};
function openChats(){
 notice('');
 const stored=stores['feishu|'+JSON.stringify(viewer)]||[];
 const chats=[...new Map(stored.map(m=>[m.chatId,{id:m.chatId,name:m.group}])).values()];
 $('#recentChats').innerHTML=chats.length?'<p>已整理的群聊</p>'+chats.map((c,i)=>`<button class="chat-option" data-recent="${i}"><span>${esc(c.name)}</span><span>打开已保存 →</span></button>`).join(''):'';
 $('#recentChats').onclick=e=>{const b=e.target.closest('[data-recent]');if(b)selectChat(chats[Number(b.dataset.recent)])};
 $('#sourceDialog').showModal();$('#chatQuery').focus();
}
$('#sourceName').onclick=openChats;
async function selectChat(c,refresh=false){await task(async()=>{
 const targetKey='feishu|'+JSON.stringify(viewer),cached=(stores[targetKey]||[]).some(m=>m.chatId===c.id);
 if(!refresh&&cached){chat=c;source='feishu';lastRun='';$('#sourceDialog').close();return;}
 const d=await api('feishu/messages',{chat:c,count:messageCount});chat=c;source='feishu';view='open';stores[key()]=mergeMessages(rows(),d.messages);lastRun=`本次拉取 ${d.messages.length} 条消息${d.hasMore?'，还有更早消息未加载':''}。尚未发送给 Jev。`;$('#sourceDialog').close();toast('消息已拉取');if(!viewer.name)openIdentity()
});}
$('#pullBtn').onclick=()=>{if(chat)selectChat(chat,true);else openChats()};
function openIdentity(){const v=currentViewer();$('#viewerName').value=v.name;$('#viewerRole').value=v.role;$('#demoIdentities').classList.toggle('hidden',source!=='demo');$('#viewerName').disabled=source==='demo';$('#viewerRole').disabled=source==='demo';$('#saveIdentity').classList.toggle('hidden',source==='demo');$('#identityDialog').showModal()}
$('#identityBtn').onclick=openIdentity;
$('#demoIdentities').onclick=e=>{const p=e.target.closest('[data-person]')?.dataset.person;if(p){person=p;lastRun='';$('#identityDialog').close();render();toast('已切换身份：'+people[p].name)}};
$('#saveIdentity').onclick=()=>{const name=$('#viewerName').value.trim();if(!name){toast('请填写姓名');return}const previous={...viewer};queue();const raw=rows().map(m=>({...m,category:null,result:null,manual:false,status:'open',starred:false}));viewer={...viewer,name,role:$('#viewerRole').value.trim()};retainQueueForViewer(previous);if(!stores[key()])stores[key()]=raw;$('#identityDialog').close();lastRun='';render();toast('身份已保存')};
$('#resetBtn').onclick=()=>{if(confirm('重置示例分类与勾选？')){stores[key()]=demoRows();lastRun='';render();toast('演示已重置')}};
$('#classifyBtn').onclick=()=>task(async()=>{
 if(!hasKey){$('#settingsDialog').showModal();toast('先填写 Jev API Key，即可运行真实分类');return}
 if(!currentViewer().name){openIdentity();return}
 if(source==='feishu'){
  if(!chat){openChats();return}
  notice(`正在拉取最近 ${messageCount} 条消息…`);
  const d=await api('feishu/messages',{chat,count:messageCount});
  stores[key()]=mergeMessages(rows(),d.messages);save();
  // Use the actual fetched snapshot, not stale cached messages that were recalled.
  const ids=new Set(d.messages.map(m=>m.id));
  prepareClassification(rows().filter(m=>m.chatId===chat.id&&ids.has(m.id)).sort((a,b)=>a.time-b.time).slice(-messageCount),d.messages.length);
  notice('');
 }else prepareClassification(visibleMessages(),visibleMessages().length);
});
function prepareClassification(messages,fetched){
 const all=messages.filter(m=>!isSystemNotice(m)&&m.supported!==false);
 if(!all.length){toast('当前范围内没有可分类的文字消息');return}
 proposal={messages:structuredClone(all),viewer:structuredClone(currentViewer()),storeKey:key()};
 $('#consentText').textContent=`目标 ${messageCount} 条，本次取得 ${fetched} 条，其中 ${all.length} 条文字消息将分类；身份：${proposal.viewer.name}。手动分类和完成状态保留。`;
 $('#consentPreview').innerHTML=all.map(m=>`<p><b>${esc(m.sender)}</b> · ${esc(m.group)}<br>${esc(m.text)}</p>`).join('');$('#consentDialog').showModal();
}

$('#messageCount').onchange=()=>{const n=Number($('#messageCount').value);if(!Number.isInteger(n)||n<1||n>200){toast('请输入 1–200 的整数');$('#messageCount').value=messageCount;return}messageCount=n;lastRun='';render()};
$('#confirmClassify').onclick=()=>task(async()=>{
 const p=proposal;if(!p)return;$('#consentDialog').close();let completed=0;const started=Date.now();
 const batches=[];let batch=[],chars=0;
 for(const m of p.messages){if(batch.length&&(batch.length>=20||chars+m.text.length>20000)){batches.push(batch);batch=[];chars=0}batch.push(m);chars+=m.text.length}if(batch.length)batches.push(batch);
 try{for(const messages of batches){notice(`正在分类 ${completed} / ${p.messages.length} 条…`);const d=await api('classify',{messages,viewer:p.viewer,consent:true});const map=new Map(d.results.map(x=>[x.id,x]));stores[p.storeKey]=stores[p.storeKey].map(m=>{const r=map.get(m.id);return r?{...m,category:m.manual?m.category:r.category,result:r}:m});completed+=d.results.length;save()}}
 catch(e){throw new Error(`已完成 ${completed} / ${p.messages.length} 条，已完成结果已保存。${e.message}`)}
 lastRun=`${completed} 条 · ${((Date.now()-started)/1000).toFixed(1)} 秒 · Jev 实测`;notice('');toast('分类完成');
});
render();try{const r=await fetch('/api/status');const d=await r.json();nonce=d.nonce;hasKey=d.hasKey;render()}catch{notice('本地服务未连接。请在项目目录运行 npm start 后打开此页面。')}
