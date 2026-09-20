import {normalizeMessages,unwrapCli} from '../core.mjs';

/** Read-only provider. exec is a fixed-argv CLI runner, never a shell command. */
export function createFeishuProvider(exec) {
 const lark=exec;
 return {
 id:'feishu', name:'飞书',
 async status(){
    const d=unwrapCli(await lark(['auth','status','--json','--verify']));const u=d.identities?.user;
    return ({connected:u?.available===true&&u?.verified===true,name:u?.userName||'',openId:u?.openId||'',status:u?.status||'未登录'});
 },
 async search(b){
    const query=String(b.query||'').trim();if(!query||query.length>64)throw new Error('请输入 1–64 字的群名关键词');
    const d=unwrapCli(await lark(['im','+chat-search','--as','user','--query',query,'--search-types','private,public_joined,external','--page-size','20','--format','json']));
    const chats=d.chats??d.items;if(!Array.isArray(chats))throw new Error('无法识别飞书群列表');
    return ({chats:chats.map(x=>({id:x.chat_id,name:x.name||'未命名群'}))});
 },
 async messages(b){
    if(!/^oc_[a-zA-Z0-9]+$/.test(b.chat?.id||''))throw new Error('请选择搜索到的群聊');
    const count=b.count===undefined?50:Number(b.count);
    if(!Number.isInteger(count)||count<1||count>200)throw new Error('条数必须是 1–200 的整数');
    let messages=[],token='',hasMore=false;
    for(let page=0;page<10&&messages.length<count;page++){
     const args=['im','+chat-messages-list','--as','user','--chat-id',b.chat.id,'--page-size',String(Math.min(50,count-messages.length)),'--order','desc','--no-reactions','--format','json'];
     if(token)args.push('--page-token',token);
     const p=await lark(args),data=unwrapCli(p);
     const map=new Map(messages.map(m=>[m.id,m]));for(const m of normalizeMessages(p,b.chat))map.set(m.id,m);messages=[...map.values()];
     hasMore=!!data.has_more;const next=data.page_token;
     if(!hasMore||!next||next===token)break;token=next;
    }
    return ({messages:messages.sort((a,b)=>a.time-b.time).slice(-count),hasMore});
 }
 };
}
