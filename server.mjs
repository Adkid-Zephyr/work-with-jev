import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {makeRequest,interpret} from './lib/core.mjs';
import {createProviders} from './lib/providers/index.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const run=promisify(execFile);const port=Number(process.env.PORT||4173);
const nonce=randomBytes(24).toString('hex');let apiKey=process.env.TYPESAFE_API_KEY||'';let classifying=false;
const cli=process.env.LARK_CLI_PATH||join(root,'node_modules/.bin/lark-cli');
async function lark(args) {
 try {const {stdout}=await run(cli,args,{timeout:45000,maxBuffer:4*1024*1024,env:{...process.env,LARKSUITE_CLI_NO_UPDATE_NOTIFIER:'1',LARKSUITE_CLI_NO_SKILLS_NOTIFIER:'1'}});return JSON.parse(stdout);}
 catch(e) {let detail;try{detail=JSON.parse(e.stderr||e.stdout||'').error;}catch{}
 throw new Error(detail?.message?`飞书：${detail.message}${detail.missing_scopes?.length?'；缺少权限：'+detail.missing_scopes.join(', '):''}`:e.code==='ENOENT'?'未安装飞书 CLI，请先运行 npm install':e.killed?'飞书请求超时，请检查网络与登录状态':'飞书尚未连接或请求失败。请在「连接设置」完成应用配置和登录。');}
}
const providers=createProviders(lark,{wecom:{cachePath:join(root,'.data/wecom-inbox.json')}});
if(process.env.WECOM_BOT_ID&&process.env.WECOM_BOT_SECRET)providers.get('wecom').configure({botId:process.env.WECOM_BOT_ID,secret:process.env.WECOM_BOT_SECRET}).catch(()=>console.error('企业微信自动连接失败，请在设置中检查'));

function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(Buffer.byteLength(s)>350000)throw new Error('请求过大，请缩短消息');}return JSON.parse(s||'{}');}
const server=http.createServer(async(req,res)=>{
 try {
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){send(res,403,{error:'仅允许本机访问'});return;}
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  const origin=req.headers.origin;
  if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin)){send(res,403,{error:'请求来源不匹配'});return;}
  if(url.pathname==='/api/status'&&req.method==='GET'){send(res,200,{nonce,hasKey:!!apiKey});return;}
  if(url.pathname.startsWith('/api/')) {
   if(req.method!=='POST'||req.headers['x-demo-token']!==nonce){send(res,403,{error:'请刷新页面后重试'});return;}
   const b=await body(req);
   if(url.pathname==='/api/key'){if(typeof b.key!=='string'||b.key.length>500)throw new Error('密钥格式不正确');apiKey=b.key.trim();send(res,200,{hasKey:!!apiKey});return;}
   if(url.pathname==='/api/wecom/connect'){send(res,200,await providers.get('wecom').configure(b));return;}
   if(url.pathname==='/api/wecom/disconnect'){send(res,200,await providers.get('wecom').disconnect());return;}
   const sourceRoute=url.pathname.match(/^\/api\/([a-z][a-z0-9_-]*)\/(status|search|messages)$/);
   if(sourceRoute){
    const provider=providers.get(sourceRoute[1]);
    if(!provider){send(res,404,{error:'未接入该消息来源'});return;}
    send(res,200,await provider[sourceRoute[2]](b));return;
   }
   if(url.pathname==='/api/classify') {
    if(!apiKey)throw new Error('请先在连接设置中填写 Jev API Key');
    if(classifying){send(res,409,{error:'另一批分类正在进行，请稍后'});return;}
    if(b.consent!==true)throw new Error('请确认将本批消息发送给 TypeSafe');
    const ms=b.messages;if(!Array.isArray(ms)||!ms.length||ms.length>30)throw new Error('每次分类限 1–30 条消息');
    if(ms.some(m=>typeof m.id!=='string'||typeof m.text!=='string'||m.text.length>6000))throw new Error('消息格式不正确或单条过长');
    if(typeof b.viewer?.name!=='string'||!b.viewer.name.trim())throw new Error('请填写你的姓名');
    const viewer={name:b.viewer.name.slice(0,80),role:String(b.viewer.role||'').slice(0,1000),openId:String(b.viewer.openId||'').slice(0,100)};
    if(ms.reduce((n,m)=>n+m.text.length,0)>24000)throw new Error('本批文本超过 24,000 字符，请减少条数或选择较短消息');
    classifying=true;
    try {
     const started=Date.now();let response;
     for(let attempt=0;attempt<3;attempt++){
      response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(makeRequest(ms,viewer)),signal:AbortSignal.timeout(60000)});
      if(![429,529].includes(response.status)||attempt===2)break;
      await new Promise(r=>setTimeout(r,Math.min(5000,1000*2**attempt)));
     }
     if(!response.ok)throw new Error(response.status===401?'Jev 密钥无效，请重新配置':`Jev 请求失败（HTTP ${response.status}），结果未改变，请稍后重试`);
     const result=await response.json();const results=ms.map((m,i)=>({id:m.id,...interpret(result.answers,i)}));
     send(res,200,{results,model:result.model,usage:result.usage,elapsedMs:Date.now()-started});
    } finally {classifying=false;}return;
   }
   send(res,404,{error:'接口不存在'});return;
  }
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/core.mjs':'../lib/core.mjs'};
  if(req.method!=='GET'||!files[url.pathname]){res.writeHead(404);res.end('Not found');return;}
  const data=await readFile(join(root,'dist',files[url.pathname]));
  res.writeHead(200,{'Content-Type':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.js')||url.pathname.endsWith('.mjs')?'text/javascript':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"});res.end(data);
 }catch(e){send(res,400,{error:e.name==='TimeoutError'?'Jev 响应超时，请稍后重试':e.message||'请求失败'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`消息分拣台 http://127.0.0.1:${port}`));
