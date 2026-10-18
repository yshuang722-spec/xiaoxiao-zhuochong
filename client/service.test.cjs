const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
function fixture(){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'pet-client-audit-'));
 const http={request(_opts,callback){const req=new EventEmitter();req.setTimeout=()=>{};req.write=()=>{};req.end=()=>{queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=200;callback(res);res.emit('data',Buffer.from('{}'));res.emit('end');});};return req;}};
 const context={require:n=>n==='node:http'?http:require(n),process:{env:{...process.env,USERPROFILE:home,DSH_HOME:path.join(home,'.dsh')}},__dirname:__dirname,module:{exports:{}},Buffer,setTimeout};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'service.cjs'),'utf8'),context);
 const folder=path.join(home,'source');fs.mkdirSync(path.join(folder,'animations'),{recursive:true});fs.writeFileSync(path.join(folder,'animations','站立.webm'),'test');
 const cfg={pets:[{id:'testgirl',name:'test'}],animations:{idle:['站立'],turn:['站立'],drag:['站立'],clicks:['站立'],moves:{default:{minDist:0,maxDist:0,margin:20,leadSec:0,tailSec:0},actions:[]},categories:[{id:'小动作',actions:['站立'],weight:1}],events:{balance:Array(6).fill('站立')}}};
 return {home,folder,cfg,api:context.module.exports,save(){fs.writeFileSync(path.join(folder,'config.json'),JSON.stringify(cfg));},cleanup(){fs.rmSync(home,{recursive:true,force:true});}};
}
test('a stationary character pack can be imported without movement actions',async()=>{
 const f=fixture();try{fs.mkdirSync(f.api.ROOT,{recursive:true});f.save();await f.api.importProject(f.folder);assert.ok(fs.existsSync(path.join(f.api.ROOT,'testgirl/config.json')));}finally{f.cleanup();}
});
test('first import creates the character root on a fresh installation',async()=>{
 const f=fixture();try{f.cfg.animations.moves.actions=[{name:'站立',weight:1}];f.save();await f.api.importProject(f.folder);assert.ok(fs.existsSync(path.join(f.api.ROOT,'testgirl/animations/站立.webm')));}finally{f.cleanup();}
});
test('bad action paths are rejected before any project is installed',async()=>{
 const f=fixture();try{f.cfg.animations.moves.actions=[{name:'../escape'}];f.save();await assert.rejects(f.api.importProject(f.folder),/动作文件名/);assert.ok(!fs.existsSync(path.join(f.api.ROOT,'testgirl')));}finally{f.cleanup();}
});
