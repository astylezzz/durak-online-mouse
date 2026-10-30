// Test-only PeerJS-compatible transport. No production code uses this module.
class Emitter {
 constructor(){this.events={};}
 on(name,fn){(this.events[name]??=[]).push(fn);return this;}
 emit(name,...args){for(const fn of this.events[name]||[])fn(...args);}
 removeAllListeners(){this.events={};}
}
class Connection extends Emitter {
 constructor(peer,id,destination){super();this.peer=peer;this.id=id;this.destination=destination;this.open=false;}
 send(payload){this.peer.channel.postMessage({to:this.destination,type:'data',id:this.id,payload});}
 close(){if(!this.open)return;this.open=false;this.peer.channel.postMessage({to:this.destination,type:'close',id:this.id});this.emit('close');}
}
export class Peer extends Emitter {
 constructor(id){super();this.id=typeof id==='string'?id:crypto.randomUUID();this.uid=crypto.randomUUID();this.connections={};this.channel=new BroadcastChannel('mouse-test-peer');this.channel.onmessage=e=>this.receive(e.data);setTimeout(()=>{const old=localStorage.getItem(this.id);if(old){this.emit('error',{type:'unavailable-id'});return;}localStorage.setItem(this.id,this.uid);this.emit('open',this.id);},20);}
 connect(peerId){const to=localStorage.getItem(peerId),id=crypto.randomUUID(),c=new Connection(this,id,to);this.connections[id]=c;setTimeout(()=>this.channel.postMessage({to,type:'dial',id,from:this.uid}),20);return c;}
 receive(m){if(m.to!==this.uid)return;if(m.type==='dial'){const c=new Connection(this,m.id,m.from);this.connections[m.id]=c;c.open=true;this.emit('connection',c);this.channel.postMessage({to:m.from,type:'ready',id:m.id});}else{const c=this.connections[m.id];if(!c)return;if(m.type==='ready'){c.open=true;c.emit('open');}if(m.type==='data')c.emit('data',m.payload);if(m.type==='close'){c.open=false;c.emit('close');}}}
 destroy(){if(localStorage.getItem(this.id)===this.uid)localStorage.removeItem(this.id);for(const c of Object.values(this.connections))c.close();this.channel.close();this.destroyed=true;}
 reconnect(){}
}
export default Peer;
