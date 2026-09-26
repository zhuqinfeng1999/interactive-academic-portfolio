import * as T from '../vendor/three/three.module.js';

// Original, lightweight geometry for illustrative navigation and idealized dynamics.
// No inference API, arbitrary code execution, or experimental-result claims.
const clamp=T.MathUtils.clamp;
const ease=t=>t*t*(3-2*t);
function mesh(parent,geometry,material,position=[0,0,0]){
  const m=new T.Mesh(geometry,material);m.position.fromArray(position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function rounded(w,h,d,r=.02){
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:r*.35,bevelSize:r*.35,bevelSegments:3,steps:1,curveSegments:10});g.translate(0,0,-d/2);return g;
}
function rod(parent,a,b,r,material){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),12),material,start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function label(parent,text,position,size=.12,color='#bddfeb'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.font='500 48px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,256,78);
  const mat=new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false});const sprite=new T.Sprite(mat);sprite.position.fromArray(position);sprite.scale.set(size*4,size,1);parent.add(sprite);return sprite;
}

export class RoverStudy{
  constructor(mats){
    this.root=new T.Group();this.mats=mats;this.time=0;this.command=0;this.running=false;
    const deckMaterial=new T.MeshPhysicalMaterial({color:0x12212b,metalness:.55,roughness:.42,envMapIntensity:.65,clearcoat:.12});
    const deck=mesh(this.root,rounded(1.18,.92,.025,.06),deckMaterial,[0,0,-.045]);deck.receiveShadow=true;
    // Floor markings have a navigation meaning: docks, a start bay and local grid.
    const grid=[];for(let x=-.5;x<=.51;x+=.1)grid.push(x,-.4,0,x,.4,0);for(let y=-.4;y<=.41;y+=.1)grid.push(-.5,y,0,.5,y,0);
    this.root.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(grid,3)),new T.LineBasicMaterial({color:0x7094a4,transparent:true,opacity:.18})));
    this.destinations=[new T.Vector3(.35,.22,.0),new T.Vector3(.35,-.22,.0),new T.Vector3(-.34,0,0)];
    this.docks=this.destinations.map((p,i)=>{
      const dock=new T.Group();dock.position.copy(p);this.root.add(dock);
      const ring=mesh(dock,new T.TorusGeometry(.087,.003,8,64),i===0?mats.cyan:i===1?mats.amber:mats.silver,[0,0,.005]);
      const pad=mesh(dock,new T.CircleGeometry(.083,48),new T.MeshStandardMaterial({color:[0x315b6d,0x68513a,0x303b45][i],roughness:.4,metalness:.6,transparent:true,opacity:.65}),[0,0,.003]);
      label(dock,['CYAN','AMBER','HOME'][i],[0,i===1?-.135:.135,.025],.042);return {dock,ring,pad};
    });
    this.bot=new T.Group();this.root.add(this.bot);this.wheels=[];
    mesh(this.bot,rounded(.31,.22,.07,.04),mats.graphite,[0,0,.13]);
    mesh(this.bot,rounded(.30,.21,.055,.04),mats.silver,[0,0,.177]);
    mesh(this.bot,rounded(.215,.16,.018,.025),mats.titanium,[-.02,0,.216]);
    // Four rubber tires, machined hubs and raised treads: no featureless toy blocks.
    for(const x of [-.10,.10])for(const y of [-.137,.137]){
      const wheel=new T.Group();wheel.position.set(x,y,.075);this.bot.add(wheel);this.wheels.push(wheel);
      const tire=mesh(wheel,new T.CylinderGeometry(.072,.072,.045,40),mats.rubber);const hub=mesh(wheel,new T.CylinderGeometry(.043,.043,.048,32),mats.silver);
      for(let k=0;k<16;k++){const a=k*Math.PI/8;const t=mesh(wheel,new T.BoxGeometry(.016,.043,.008),mats.graphite,[Math.sin(a)*.071,0,Math.cos(a)*.071]);t.rotation.y=a;}
      mesh(wheel,new T.CylinderGeometry(.015,.015,.051,24),mats.cyan);
    }
    rod(this.bot,[-.035,0,.23],[-.035,0,.36],.021,mats.graphite);
    mesh(this.bot,rounded(.08,.22,.065,.022),mats.titanium,[-.017,0,.39]);
    this.head=new T.Group();this.head.position.set(.03,0,.39);this.bot.add(this.head);
    for(const y of [-.07,.07]){
      const rim=mesh(this.head,new T.CylinderGeometry(.027,.027,.014,32),mats.silver,[0,y,0]);rim.rotation.z=Math.PI/2;
      const lens=mesh(this.head,new T.CylinderGeometry(.020,.020,.018,32),mats.graphite,[.008,y,0]);lens.rotation.z=Math.PI/2;
      const pupil=mesh(this.head,new T.CircleGeometry(.009,32),mats.indicator,[.019,y,0]);pupil.rotation.y=Math.PI/2;
    }
    mesh(this.bot,rounded(.008,.14,.007,.002),mats.indicator,[.157,0,.157]);
    for(const y of [-.078,.078])mesh(this.bot,new T.SphereGeometry(.006,12,8),mats.indicator,[-.135,y,.216]);
    label(this.bot,'E—01',[-.04,0,.255],.027);
    this.pathLine=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xa2d9ec,transparent:true,opacity:.7}));this.root.add(this.pathLine);
    this.reset();
  }
  reset(){this.running=false;this.time=0;this.bot.position.copy(this.destinations[2]);this.bot.rotation.z=0;this.setRoute(0);}
  setRoute(index){
    this.command=index;this.start=this.bot.position.clone();this.end=this.destinations[index].clone();
    // A smooth center-lane route from the current pose, not a reset/teleport.
    const mid=this.start.clone().lerp(this.end,.5);mid.y*=.35;
    this.curve=new T.CatmullRomCurve3([this.start,this.start.clone().lerp(mid,.6),mid,mid.clone().lerp(this.end,.6),this.end]);
    this.pathLine.geometry.dispose();this.pathLine.geometry=new T.BufferGeometry().setFromPoints(this.curve.getPoints(70).map(p=>p.setZ(.008)));
    this.docks.forEach((d,i)=>d.ring.material=i===index?this.mats.indicator:i===0?this.mats.cyan:i===1?this.mats.amber:this.mats.silver);
  }
  run(index){this.setRoute(index);this.time=0;this.stationary=this.start.distanceTo(this.end)<.01;this.initialHeading=this.bot.rotation.z;this.running=true;}
  update(dt,instant=false){
    if(!this.running)return {phase:'ready',done:false};
    const duration=this.stationary?1.6:5.2;this.time=instant?duration:Math.min(duration,this.time+dt);
    const u=ease(clamp((this.time-.9)/3.5,0,1)),p=this.curve.getPoint(u),tangent=this.curve.getTangent(Math.min(.995,u));
    this.bot.position.copy(p);const heading=Math.atan2(tangent.y,tangent.x);const blend=ease(clamp(this.time/.9,0,1));
    this.bot.rotation.z=this.initialHeading+Math.atan2(Math.sin(heading-this.initialHeading),Math.cos(heading-this.initialHeading))*blend;
    if(!this.stationary&&this.time>.9&&this.time<4.4)this.wheels.forEach(w=>w.rotation.y-=dt*4.5);
    const scanStart=this.stationary?.8:4.4;this.head.rotation.z=this.time<.8?Math.sin(this.time*4)*.1:this.command===1&&this.time>scanStart?Math.sin((this.time-scanStart)/.8*Math.PI)*.4:0;
    const done=this.time>=duration;if(done)this.running=false;
    return {phase:done?'complete':this.time<.4?'observe':this.time<.9?'ground':this.stationary||this.time>=4.4?'verify':'navigate',done};
  }
}

export class DynamicsStudy{
  constructor(mats){
    this.root=new T.Group();this.mats=mats;this.running=false;this.time=0;this.choice=0;this.balls=[];this.pivots=[];
    mesh(this.root,rounded(.98,.52,.06,.06),mats.graphite,[0,0,.04]);
    mesh(this.root,rounded(.92,.46,.015,.045),mats.titanium,[0,0,.08]);
    // Two real suspension rails, each sphere hanging from paired filaments.
    for(const y of [-.18,.18]){
      for(const x of [-.43,.43])rod(this.root,[x,y,.09],[x,y,.84],.017,mats.silver);
      rod(this.root,[-.43,y,.84],[.43,y,.84],.02,mats.silver);
      for(const x of [-.43,.43])mesh(this.root,new T.SphereGeometry(.02,16,12),mats.silver,[x,y,.84]);
    }
    for(let i=0;i<5;i++){
      const p=new T.Group();p.position.set((i-2)*.133,0,.825);this.root.add(p);this.pivots.push(p);
      rod(p,[0,-.18,0],[0,-.025,-.48],.0015,mats.silver);rod(p,[0,.18,0],[0,.025,-.48],.0015,mats.silver);
      const ball=mesh(p,new T.SphereGeometry(.0665,40,28),mats.titanium,[0,0,-.50]);ball.userData.impulse=i<2?0:2;this.balls.push(ball);
      mesh(p,new T.TorusGeometry(.067,.0016,6,48),mats.cyan,[0,0,-.50]);
    }
    this.prediction=new T.Group();this.root.add(this.prediction);
    this.reset();
  }
  reset(){this.running=false;this.time=0;this.choose(0);}
  choose(index){
    this.choice=index;this.count=index===1?2:1;this.sign=index===2?-1:1;this.running=false;this.time=0;this.prediction.visible=true;
    this.pivots.forEach((p,i)=>p.rotation.y=(this.sign===1?i<this.count:i>=5-this.count)?this.sign*.62:0);
    while(this.prediction.children.length){const c=this.prediction.children[0];c.geometry?.dispose();c.material?.dispose();this.prediction.remove(c);}
    const x=this.sign===1?.266:-.266,points=[];
    for(let j=0;j<=50;j++){const a=-this.sign*.62*j/50;points.push(new T.Vector3(x-.5*Math.sin(a),0,.825-.5*Math.cos(a)));}
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:0x8dcbe0,dashSize:.013,gapSize:.012,transparent:true,opacity:.55}));line.computeLineDistances();this.prediction.add(line);
    for(const j of [18,34,50])mesh(this.prediction,new T.SphereGeometry(.0665,24,16),new T.MeshPhysicalMaterial({color:0xa5dcea,metalness:.4,roughness:.25,transparent:true,opacity:.08,depthWrite:false}),points[j].toArray());
  }
  run(){this.time=0;this.running=true;}
  update(dt,instant=false){
    if(!this.running)return {phase:'ready',done:false};this.time=instant?6.8:Math.min(6.8,this.time+dt);
    // Ideal equal-mass transfer, attenuated over time. This is a closed-form
    // teaching illustration, not a general contact solver or learned WAM.
    const settle=1-ease(clamp((this.time-4.7)/2.1,0,1));
    const a=Math.cos(this.time*3.8)*.62*Math.exp(-this.time*.13)*this.sign*settle;
    this.pivots.forEach((p,i)=>p.rotation.y=a>0?(i<this.count?a:0):(i>=5-this.count?a:0));
    this.prediction.visible=this.time<.5;
    const done=this.time>=6.8;if(done){this.running=false;this.pivots.forEach(p=>p.rotation.y=0);}
    return {phase:done?'complete':Math.abs(a)<.09?'transfer':'rollout',done};
  }
}
