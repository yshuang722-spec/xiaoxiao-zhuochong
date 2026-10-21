const {connectRole}=require('../../../dsh-pet/runtime/electron-helper/collision-link.cjs');
const client=connectRole({id:'child-role',home:process.argv[2],onHit:hit=>process.send({hit}),onStatus:ready=>{if(ready)process.send({ready})}});
process.on('message',m=>{if(m.state)client.publish(m.state);if(m.close){client.close();process.exit(0)}});
process.on('disconnect',()=>{client.close();process.exit(0)});
