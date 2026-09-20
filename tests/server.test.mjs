import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import http from 'node:http';
test('本机 API：外域与伪 Host 拒绝；密钥不回显；缺少模型凭证不产生结果',async()=>{
 const port=14973,base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),TYPESAFE_API_KEY:''},stdio:['ignore','pipe','pipe']});
 try{
 await once(child.stdout,'data');const res=await fetch(base+'/api/status');const {nonce,hasKey}=await res.json();assert.equal(hasKey,false);
 const badHost=await new Promise((resolve,reject)=>{const r=http.get(base+'/api/status',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode)});r.on('error',reject)});assert.equal(badHost,403);
 assert.equal((await fetch(base+'/api/status',{headers:{origin:'https://evil.example'}})).status,403);
 const post=(path,data,token=nonce)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Token':token},body:JSON.stringify(data)});
 assert.equal((await post('key',{key:'fake'},'wrong')).status,403);
 const noKey=await post('classify',{consent:true,messages:[{id:'a',text:'hi'}],viewer:{name:'我'}});assert.equal(noKey.status,400);assert.match((await noKey.json()).error,/API Key/);
 const key=await post('key',{key:'secret-test'});const output=await key.text();assert.ok(!output.includes('secret-test'));assert.equal((await (await fetch(base+'/api/status')).json()).hasKey,true);
 const noConsent=await post('classify',{messages:[{id:'a',text:'hi'}],viewer:{name:'我'}});assert.equal(noConsent.status,400);
 assert.equal((await fetch(base+'/.env')).status,404);
 }finally{child.kill();await once(child,'exit');}
});
