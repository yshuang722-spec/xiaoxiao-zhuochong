const {startBroker}=require('./collision-link.cjs');
const parent=Number(process.argv[2]);
if(!Number.isSafeInteger(parent)||parent<1)throw Error('Parent PID required');
const broker=startBroker();broker.ready.then(()=>console.log('collision broker ready')).catch(e=>console.error(e.message));
setInterval(()=>{try{process.kill(parent,0)}catch{broker.close().finally(()=>process.exit(0))}},5000);
