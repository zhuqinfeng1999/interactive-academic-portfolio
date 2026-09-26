import * as T from '../vendor/three/three.module.js';
import { RGBELoader } from '../vendor/three/RGBELoader.js';
import { RoverStudy, DynamicsStudy } from './robot-studies.js?v=2.0.0';

// Real robot geometry; illustrative kinematics only. See assets/models/NOTICE.md.
const MODES={
  arm:{kicker:'01 / AGENTIC ROBOTICS',title:'Build. Unbuild. Repeat.',description:'Stack three cubes with an articulated robot, then return them to their original places.',action:'Stack next cube',hint:'Click a cube to stack it · click the top cube to return it'},
  hand:{kicker:'02 / DEXTEROUS MANIPULATION',title:'A finer kind of intelligence.',description:'Explore the joint coordination of a five-finger robotic hand.',action:'Change gesture',hint:'Click to change gesture · drag to inspect'},
  vla:{kicker:'03 / VISION–LANGUAGE–ACTION',title:'Your words. Its next move.',description:'Issue a preset instruction in the terminal and watch a mobile robot navigate to the matching visual landmark.',action:'Run command',hint:'Select a command below · the agent moves to its visual goal'},
  wam:{kicker:'04 / WORLD DYNAMICS',title:'What happens next?',description:'An idealized kinetic study: choose an impulse, preview its consequence, then release it. An illustration of physical prediction, not a learned world model.',action:'Release impulse',hint:'Choose an impulse · dashed arcs show the predicted motion'}
};
const media=matchMedia('(prefers-reduced-motion: reduce)'),clamp=T.MathUtils.clamp;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const resource=(path)=>new URL(path,import.meta.url).href;
const checked=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Asset unavailable: ${r.status}`);return r;};

function materials(){
  // Fine brushed highlights are subordinate to the HDR's broad studio reflections.
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,256,256);
  for(let i=0;i<256;i++){const value=118+((i*73)%22);ctx.fillStyle=`rgb(${value},${value},${value})`;ctx.fillRect(0,i,256,1);}
  const brush=new T.CanvasTexture(c);brush.wrapS=brush.wrapT=T.RepeatWrapping;brush.repeat.set(3,3);
  const metal=(color,roughness,metalness=1)=>new T.MeshPhysicalMaterial({color,roughness,metalness,envMapIntensity:1.65,clearcoat:.3,clearcoatRoughness:.16});
  const titanium=metal(0x929eac,.18);titanium.bumpMap=brush;titanium.bumpScale=.00008;
  return {silver:metal(0xa1adbc,.21),titanium,graphite:metal(0x15212c,.27,.88),rubber:metal(0x091117,.7,.05),cyan:metal(0x438ca3,.2,.8),amber:metal(0xb48b52,.2,.85),white:metal(0xd2dbe0,.25,.8),indicator:new T.MeshStandardMaterial({color:0xc0f0fb,emissive:0x41a9c8,emissiveIntensity:2.2,roughness:.25})};
}
async function loadRig(name,mats){
  const base=resource('../models/'+name+'/');
  const [data,packed]=await Promise.all([checked(base+'model.json').then(r=>r.json()),checked(base+'meshes.bin.gz')]);
  const buffer=await new Response(packed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const geometries={};
  for(const [id,g]of Object.entries(data.geometries)){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,g.position.offset,g.position.count*3),3));
    geo.setAttribute('normal',new T.BufferAttribute(new Float32Array(buffer,g.normal.offset,g.normal.count*3),3));
    geo.setIndex(new T.BufferAttribute(new Uint32Array(buffer,g.index.offset,g.index.count),1));geo.computeBoundingSphere();geometries[id]=geo;
  }
  const joints=new Map(),bodies=new Map();
  const transform=(o,d)=>{o.position.fromArray(d.pos);const [w,x,y,z]=d.quat;o.quaternion.set(x,y,z,w).normalize();};
  function body(d){
    const frame=new T.Group();frame.name=d.name;transform(frame,d);const pivot=new T.Group();frame.add(pivot);bodies.set(d.name,pivot);
    for(const j of d.joints)joints.set(j.name,{pivot,axis:new T.Vector3(...j.axis).normalize(),type:j.type,range:j.range});
    for(const g of d.meshes){
      let material=g.material==='black'?mats.graphite:g.material==='green'||g.material==='light_blue'?mats.indicator:mats.silver;
      if(name==='shadow')material=/distal/.test(g.geometry)?mats.rubber:/knuckle|wrist/.test(g.geometry)?mats.silver:g.geometry==='forearm_1'?mats.graphite:mats.titanium;
      const mesh=new T.Mesh(geometries[g.geometry],material);transform(mesh,g);mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);
    }
    d.children.forEach(child=>pivot.add(body(child)));return frame;
  }
  const root=body(data.root);
  function pose(values){for(const [name,value]of Object.entries(values)){const j=joints.get(name);if(!j)continue;const v=clamp(value,...j.range);if(j.type==='slide')j.pivot.position.copy(j.axis).multiplyScalar(v);else j.pivot.quaternion.setFromAxisAngle(j.axis,v);}}
  const tip=new T.Object3D();tip.position.set(0,0,.1034);if(name==='panda')bodies.get('hand').add(tip);
  return {root,joints,bodies,pose,tip};
}

class RobotStage{
  constructor(container){
    this.container=container;this.canvas=container.querySelector('canvas');this.mode='arm';this.selected=0;this.pathIndex=0;this.grasp=0;this.graspValue=0;this.stack=[];this.commandIndex=0;this.autoPending=false;this.autoElapsed=0;
    this.time=0;this.taskTime=0;this.running=false;this.frame=0;this.last=0;this.visible=true;this.paused=media.matches;this.explicitMotion=false;this.ready=false;this.pixelCap=1.65;this.budgetFrames=0;this.budgetSeconds=0;
    this.hovered=-1;this.pointerInside=false;this.hoverPointer=new T.Vector2();this.hoverPoint=new T.Vector3();
    this.orbit=new T.Vector2();this.pointer=new T.Vector2();this.pointerTarget=new T.Vector2();this.ray=new T.Raycaster();this.point=new T.Vector3();this.ndc=new T.Vector2();
    this.readout=container.querySelector('[data-embodied-readout]');this.action=container.querySelector('[data-embodied-action]');
    this.buildControls();this.bind();container.robotStage=this;container.embodiedWorld=this;
    this.observer=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;this.last=0;if(this.visible)this.request();else this.stop();});this.observer.observe(this.canvas);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);
    document.addEventListener('visibilitychange',()=>{this.last=0;if(document.hidden)this.stop();else this.request();});
    media.addEventListener('change',()=>{this.explicitMotion=false;this.paused=media.matches;this.last=0;this.sync();this.request();});
    this.init().catch(error=>this.fallback(error));
  }
  async init(){
    this.action.disabled=true;this.status('Loading the robotic study…');this.mats=materials();
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x05080c,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.world=new T.Group();this.scene.add(this.world);
    this.camera=new T.PerspectiveCamera(29,1,.01,30);this.camera.up.set(0,0,1);
    const key=new T.DirectionalLight(0xe2edf7,4.6);key.position.set(-1.5,-2.5,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-1.4,right:1.4,top:1.4,bottom:-1.4,near:.1,far:8});key.shadow.normalBias=.0007;key.shadow.bias=-.00015;key.shadow.radius=3;this.scene.add(key);
    const rim=new T.DirectionalLight(0x67c4ed,7);rim.position.set(1.2,1.4,2);this.scene.add(rim);
    const warm=new T.DirectionalLight(0xffbb79,3.1);warm.position.set(-1.5,.3,.8);this.scene.add(warm);
    this.scene.add(new T.HemisphereLight(0xc8dcf0,0x101525,.30));
    const floor=new T.Mesh(new T.PlaneGeometry(8,8),new T.ShadowMaterial({opacity:.20}));floor.receiveShadow=true;floor.position.z=-.065;this.world.add(floor);
    const pmrem=new T.PMREMGenerator(this.renderer);
    const [arm,motion,stacking,environment]=await Promise.all([
      loadRig('panda',this.mats),checked(resource('../models/panda/motion.json')).then(r=>r.json()),checked(resource('../models/panda/stacking.json')).then(r=>r.json()),
      new RGBELoader().loadAsync(resource('../environments/studio_small_09_1k.hdr')).catch(()=>null)
    ]);
    if(environment){const env=pmrem.fromEquirectangular(environment);this.scene.environment=env.texture;environment.dispose();this.environment=env;}pmrem.dispose();
    this.arm=arm;this.motion=motion;this.stacking=stacking;arm.root.position.x=-.22;this.world.add(arm.root);
    this.q=motion.home.slice();this.setArmPose(this.q,.04);
    this.table=new T.Group();this.table.position.x=-.22;this.world.add(this.table);
    const rounded=(size,material)=>{const mesh=new T.Mesh(new T.BoxGeometry(size,size,size,2,2,2),material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};
    this.objects=motion.objects.map((p,i)=>{const object=rounded(.055,[this.mats.amber,this.mats.cyan,this.mats.white][i].clone());object.position.fromArray(p);object.userData.index=i;this.table.add(object);return object;});
    this.hoverOutline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.059,.059,.059)),new T.LineBasicMaterial({color:0xbcecff,transparent:true,opacity:.95}));this.hoverOutline.visible=false;this.table.add(this.hoverOutline);
    const pad=new T.Mesh(new T.CylinderGeometry(.075,.079,.004,64),this.mats.graphite);pad.rotation.x=Math.PI/2;pad.position.set(motion.goal[0],motion.goal[1],.003);pad.receiveShadow=true;this.table.add(pad);
    const ring=new T.Mesh(new T.TorusGeometry(.072,.0009,6,96),this.mats.indicator);ring.position.set(motion.goal[0],motion.goal[1],.006);this.table.add(ring);
    // A restrained target bracket identifies the selected object, not an arbitrary orbit.
    const corners=[];for(const [x,y]of [[-1,-1],[1,-1],[1,1],[-1,1]]){const a=x*.046,b=y*.046;corners.push(a,b,0,a-x*.016,b,0,a,b,0,a,b-y*.016,0);}
    this.focus=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(corners,3)),new T.LineBasicMaterial({color:0x92cadd,transparent:true,opacity:.75}));this.table.add(this.focus);
    this.rover=new RoverStudy(this.mats);this.dynamics=new DynamicsStudy(this.mats);this.world.add(this.rover.root,this.dynamics.root);
    this.ready=true;this.available=true;this.container.classList.add('is-ready');this.resize();this.setMode(new URLSearchParams(location.search).get('scene')||'arm');
    this.autoPending=this.mode==='arm'&&!media.matches&&!this.paused;
    this.handPromise=Promise.all([loadRig('shadow',this.mats),checked(resource('../models/shadow/poses.json')).then(r=>r.json())]).then(([hand,poses])=>{this.hand=hand;this.handPoses=poses.poses;hand.root.scale.setScalar(2.4);hand.root.position.set(.08,0,.03);hand.root.rotation.z=-1.32;hand.root.visible=this.mode==='hand';this.world.add(hand.root);this.addHandObject();this.sync();if(this.mode==='hand')this.status(MODES.hand.hint);this.request();return hand;}).catch(()=>null);
  }
  addHandObject(){
    const sphere=new T.Mesh(new T.IcosahedronGeometry(.032,4),this.mats.amber);sphere.position.set(.002,-.055,.082);sphere.castShadow=true;this.hand.bodies.get('rh_palm').add(sphere);this.handObject=sphere;sphere.visible=false;
  }
  buildControls(){
    this.hoverLabel=document.createElement('span');this.hoverLabel.className='cube-hover-label';this.hoverLabel.hidden=true;this.hoverLabel.setAttribute('aria-hidden','true');this.container.querySelector('.embodied-stage').append(this.hoverLabel);
    const instructions=this.container.querySelector('.embodied-instructions');
    instructions.className='agent-terminal';instructions.setAttribute('aria-label','Illustrative VLA command terminal');
    instructions.innerHTML=`<div class="terminal-header"><span><i aria-hidden="true"></i>agent://navigation</span><small>LOCAL DEMO</small></div>
      <div class="terminal-command"><span aria-hidden="true">❯</span><code data-command-text>await agent.go_to("cyan dock")</code><span class="terminal-caret" aria-hidden="true">▍</span></div>
      <div class="terminal-trace" aria-label="Command execution stages"><span data-step="observe">01 observe</span><span data-step="ground">02 ground</span><span data-step="navigate">03 act</span><span data-step="complete">04 verify</span></div>
      <p class="terminal-result" data-terminal-result>Choose an instruction to start a local simulation.</p>
      <div class="terminal-presets" role="group" aria-label="Preset navigation commands"><button type="button" data-instruction="0" aria-pressed="true"><span>$</span> go_to("cyan") <b>↵</b></button><button type="button" data-instruction="1" aria-pressed="false"><span>$</span> inspect("amber") <b>↵</b></button><button type="button" data-instruction="2" aria-pressed="false"><span>$</span> return_home() <b>↵</b></button></div>`;
    this.container.querySelectorAll('[data-path]').forEach((b,i)=>{b.textContent=['01 · Single impulse','02 · Double impulse','03 · Reverse impulse'][i];b.setAttribute('aria-pressed',String(i===0));});
    const undo=document.createElement('button');undo.type='button';undo.className='embodied-undo';undo.dataset.embodiedUndo='';undo.textContent='Return top cube ↶';this.action.after(undo);this.undo=undo;
    this.commandText=instructions.querySelector('[data-command-text]');this.terminalResult=instructions.querySelector('[data-terminal-result]');
  }
  terminal(phase='ready'){
    const command=['await agent.go_to("cyan dock")','await agent.inspect("amber dock")','await agent.return_home()'][this.commandIndex];
    const value=this.running&&!media.matches?command.slice(0,Math.ceil(this.rover.time/.35*command.length)):command;if(this.commandText.textContent!==value)this.commandText.textContent=value;
    const order=['observe','ground','navigate','complete'],idx=phase==='verify'?3:order.indexOf(phase);
    this.container.querySelectorAll('[data-step]').forEach((s,i)=>{s.classList.toggle('is-done',phase==='complete'||i<idx);s.classList.toggle('is-active',phase!=='complete'&&i===idx);});
    const target=['cyan dock','amber dock','home bay'][this.commandIndex];
    const text={ready:'Choose an instruction · preset, not live model inference.',observe:'observe → camera landmarks: cyan / amber / home',ground:`ground → visual target = ${target}`,navigate:`act → follow route to ${target}`,verify:`verify → inspect ${target}; stop at the landmark`,complete:`✓ complete → arrived at ${target}`}[phase];
    if(this.terminalResult.textContent!==text)this.terminalResult.textContent=text;
  }
  setArmPose(q,grip){const values={finger_joint1:grip,finger_joint2:grip};q.forEach((v,i)=>values['joint'+(i+1)]=v);this.arm.pose(values);}
  status(text){if(this.readout.textContent!==text)this.readout.textContent=text;}
  stop(){cancelAnimationFrame(this.frame);this.frame=0;}
  request(){if(this.ready&&this.visible&&!document.hidden&&!this.frame)this.frame=requestAnimationFrame(t=>this.draw(t));}
  resize(){if(!this.renderer)return;const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;this.renderer.setPixelRatio(Math.min(devicePixelRatio,r.width<550?1.4:1.65,this.pixelCap));this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.request();}
  fallback(error){this.ready=false;this.available=false;this.stop();this.container.classList.remove('is-ready');this.container.classList.add('is-fallback');this.sync();this.status('Static study · interactive 3D is unavailable in this browser.');console.warn('Robot study fallback:',error.message);}
  bind(){
    this.container.addEventListener('pointerdown',()=>{this.autoPending=false;},{capture:true});
    this.container.addEventListener('keydown',()=>{this.autoPending=false;},{capture:true});
    this.container.querySelectorAll('[data-embodied-mode]').forEach(b=>b.addEventListener('click',()=>this.setMode(b.dataset.embodiedMode)));
    this.action.addEventListener('click',()=>this.activate({restart:this.mode==='wam'&&!this.paused}));
    this.undo.addEventListener('click',()=>{if(this.stack.length&&!this.running){this.selected=this.stack.at(-1);this.activate();}});
    this.container.querySelector('[data-embodied-pause]').addEventListener('click',()=>this.togglePlayback());
    this.container.querySelector('[data-embodied-reset]').addEventListener('click',()=>this.reset());
    this.container.querySelectorAll('[data-instruction]').forEach(b=>b.addEventListener('click',()=>{if(this.running)return;this.commandIndex=Number(b.dataset.instruction);this.activate();}));
    this.container.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{if(!this.ready)return;this.pathIndex=Number(b.dataset.path);this.activate({restart:true});}));
    this.canvas.addEventListener('pointerdown',e=>{this.canvas.focus({preventScroll:true});this.drag={x:e.clientX,y:e.clientY,ox:this.orbit.x,oy:this.orbit.y,moved:false};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{const r=this.canvas.getBoundingClientRect();this.pointerTarget.set((e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5);this.hoverPointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.pointerInside=e.pointerType!=='touch';if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>6)this.drag.moved=true;if(this.drag.moved)this.orbit.set(clamp(this.drag.ox+dx*.003,-1,1),clamp(this.drag.oy+dy*.002,-.2,.25));}this.request();});
    this.canvas.addEventListener('pointerleave',()=>{this.pointerInside=false;this.setHovered(-1);this.pointerTarget.set(0,0);this.request();});
    this.canvas.addEventListener('pointercancel',()=>{this.drag=null;});
    this.canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved&&this.ready&&(!this.running||this.mode==='wam')){let act=true;const r=this.canvas.getBoundingClientRect();this.ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.ray.setFromCamera(this.ndc,this.camera);if(this.mode==='arm'){const hits=this.ray.intersectObjects(this.objects);const index=hits.length?hits[0].object.userData.index:this.hovered;if(index>=0)this.selected=index;else act=false;}else if(this.mode==='wam'&&!(this.running&&this.paused)){const hits=this.ray.intersectObjects(this.dynamics.balls);if(hits.length)this.pathIndex=hits[0].object.userData.impulse;}if(act)this.activate({restart:this.mode==='wam'&&!this.paused});}this.drag=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);});
    this.canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','r','R'].includes(e.key))return;e.preventDefault();if(e.key==='Enter')this.activate({restart:this.mode==='wam'&&!this.paused});else if(e.key===' ')this.togglePlayback();else if(e.key.toLowerCase()==='r')this.reset();else if(e.key==='ArrowUp'||e.key==='ArrowDown')this.orbit.y=clamp(this.orbit.y+(e.key==='ArrowUp'?-.06:.06),-.2,.25);else if(this.mode==='hand'){this.orbit.x=clamp(this.orbit.x+(e.key==='ArrowLeft'?-.15:.15),-1,1);}else if(!this.running){const delta=e.key==='ArrowRight'?1:2;if(this.mode==='arm'){this.selected=(this.selected+delta)%3;this.focusTarget();}else if(this.mode==='vla'){this.commandIndex=(this.commandIndex+delta)%3;this.terminal();this.rover.setRoute(this.commandIndex);}else{this.pathIndex=(this.pathIndex+delta)%3;this.dynamics.choose(this.pathIndex);}this.sync();}this.request();});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.ready=false;this.container.classList.remove('is-ready');this.container.classList.add('is-fallback');this.status('The 3D view is recovering.');});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.ready=Boolean(this.arm);this.container.classList.remove('is-fallback');this.container.classList.add('is-ready');this.reset();});
  }
  sync(){
    const pause=this.container.querySelector('[data-embodied-pause]'),playing=!this.paused&&(this.mode==='hand'||this.running);pause.textContent=playing?'Pause':this.running?'Resume':'Play';pause.setAttribute('aria-label',playing?'Pause animation':this.running?'Resume animation':'Play animation');pause.setAttribute('aria-pressed',String(playing));pause.disabled=!this.ready||(this.mode==='hand'&&!this.hand);
    this.action.disabled=!this.ready||(this.running&&this.mode!=='wam'&&!this.paused)||(this.mode==='hand'&&!this.hand);
    this.undo.hidden=this.mode!=='arm';this.undo.disabled=!this.ready||this.running||!this.stack.length;
    if(this.mode==='arm')this.action.textContent=(this.stack.includes(this.selected)?'Return selected cube':'Stack next cube')+' ↗';
    if(this.mode==='wam')this.action.textContent=(this.running?(this.paused?'Resume impulse':'Replay impulse'):'Release impulse')+' ↗';
    this.container.querySelectorAll('[data-instruction]').forEach(b=>{b.disabled=!this.ready||this.running;b.setAttribute('aria-pressed',String(+b.dataset.instruction===this.commandIndex));});
    this.container.querySelectorAll('[data-path]').forEach(b=>{b.disabled=!this.ready;b.setAttribute('aria-pressed',String(+b.dataset.path===this.pathIndex));});
  }
  togglePlayback(){
    if(!this.ready)return;
    if(!this.paused&&(this.running||this.mode==='hand')){this.paused=true;this.status('Paused · Play or click the scene to continue');}
    else{this.paused=false;this.explicitMotion=media.matches;if(!this.running&&this.mode!=='hand')this.activate();}
    this.last=0;this.sync();this.request();
  }
  async setMode(mode){
    if(!MODES[mode])mode='arm';this.autoPending=false;this.mode=mode;this.container.dataset.mode=mode;const info=MODES[mode];
    this.container.querySelectorAll('[data-embodied-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.embodiedMode===mode)));
    this.container.querySelector('[data-embodied-kicker]').textContent=info.kicker;this.container.querySelector('[data-embodied-title]').textContent=info.title;this.container.querySelector('[data-embodied-description]').textContent=info.description;this.action.textContent=info.action+' ↗';
    this.canvas.setAttribute('aria-label',info.description+' Drag to orbit; arrow keys select or inspect; Enter acts; Space pauses; R resets.');
    this.container.querySelector('.embodied-note > span').textContent=mode==='wam'?'Idealized dynamics · not a learned world model':mode==='vla'?'Preset navigation · not live VLA inference':'Illustrative kinematics · not a learned policy';
    const poster=this.container.querySelector('.embodied-poster');if(poster){poster.src=resource('../images/embodied/'+({arm:'arm',hand:'hand',vla:'vla',wam:'world-action'}[mode])+'.webp?v=2.0.0');poster.alt=info.description;}
    if(!this.ready)return;
    this.container.classList.remove('is-fallback');this.container.classList.add('is-ready');
    this.arm.root.visible=mode==='arm';this.table.visible=mode==='arm';if(this.hand)this.hand.root.visible=mode==='hand';this.rover.root.visible=mode==='vla';this.dynamics.root.visible=mode==='wam';this.reset();
    if(mode==='hand'&&!this.hand){this.status('Loading the dexterous hand study…');await this.handPromise;if(this.mode!=='hand')return;if(!this.hand&&this.handPromise){this.container.classList.remove('is-ready');this.container.classList.add('is-fallback');this.status('Static hand study · refresh to retry interactive loading.');return;}this.status(info.hint);this.sync();this.request();}
  }
  reset(){
    this.autoPending=false;this.running=false;this.taskTime=0;this.last=0;this.paused=media.matches;this.explicitMotion=false;this.pointerInside=false;this.setHovered(-1);this.grasp=0;this.graspValue=0;this.stack=[];this.selected=0;this.commandIndex=0;this.pathIndex=0;this.orbit.set(0,0);this.pointerTarget.set(0,0);
    if(this.motion){this.q=this.motion.home.slice();this.objects.forEach((o,i)=>o.position.fromArray(this.motion.objects[i]));this.setArmPose(this.q,.04);this.focusTarget();}
    this.rover?.reset();this.dynamics?.reset();if(this.dynamics)this.dynamics.prediction.visible=true;this.terminal();this.status(MODES[this.mode].hint);this.sync();this.request();
  }
  focusTarget(){if(!this.focus)return;const index=this.hovered>=0&&!this.running?this.hovered:this.selected;this.focus.position.copy(this.objects[index].position);this.focus.position.z-=.027;}
  setHovered(index){
    this.hovered=index;if(!this.objects)return;this.hoverOutline.visible=index>=0;this.hoverLabel.hidden=index<0;
    this.objects.forEach((o,i)=>{o.material.emissive.setHex(i===index?0x6096ac:0);o.material.emissiveIntensity=i===index?.34:0;});
    if(index>=0){const blocked=this.stack.includes(index)&&this.stack.at(-1)!==index;this.hoverOutline.position.copy(this.objects[index].position);this.hoverOutline.material.color.setHex(blocked?0xe3b77e:0xbcecff);this.hoverLabel.dataset.blocked=String(blocked);this.hoverLabel.textContent=`${['Amber','Cyan','Silver'][index]} · ${blocked?'return the top cube first':this.stack.includes(index)?'click to return':'click to stack'}`;}
    this.focusTarget();
  }
  updateHover(){
    if(this.mode!=='arm'||!this.pointerInside||this.running||this.drag?.moved){if(this.hovered>=0)this.setHovered(-1);return;}
    this.world.updateMatrixWorld(true);this.camera.updateMatrixWorld();this.ray.setFromCamera(this.hoverPointer,this.camera);const hits=this.ray.intersectObjects(this.objects);
    let index=hits.length?hits[0].object.userData.index:-1,nearest=Infinity;
    if(index<0)for(const o of this.objects){o.getWorldPosition(this.hoverPoint);const distance=this.hoverPoint.distanceTo(this.camera.position);this.hoverPoint.project(this.camera);const dx=(this.hoverPoint.x-this.hoverPointer.x)*this.width/2,dy=(this.hoverPoint.y-this.hoverPointer.y)*this.height/2,d=Math.hypot(dx,dy),radius=Math.min(44,.0275*this.height/(2*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*distance)+12);if(d<radius&&d<nearest){index=o.userData.index;nearest=d;}}
    if(index!==this.hovered)this.setHovered(index);
    if(index>=0){this.objects[index].getWorldPosition(this.hoverPoint).project(this.camera);this.hoverLabel.style.left=clamp((this.hoverPoint.x+1)*this.width/2,105,this.width-105)+'px';this.hoverLabel.style.top=Math.max(45,(1-this.hoverPoint.y)*this.height/2-28)+'px';}
  }
  activate({restart=false}={}){
    if(!this.ready)return;
    if(this.running&&!restart){if(this.paused){this.paused=false;this.explicitMotion=media.matches;this.last=0;this.sync();this.request();}return;}
    if(restart)this.running=false;
    if(!media.matches||this.explicitMotion)this.paused=false;
    this.last=0;this.setHovered(-1);
    if(this.mode==='hand'){if(!this.hand)return;this.grasp=(this.grasp+1)%3;this.status(['Open · ready to interact','Precision · index–thumb coordination','Enclose · coordinated finger flexion'][this.grasp]);}
    else if(this.mode==='arm'){
      const at=this.stack.indexOf(this.selected),direction=at<0?'stack':'return';
      if(at>=0&&at!==this.stack.length-1){this.status('Return the top cube first to keep the stack supported.');return;}
      const level=at<0?this.stack.length:at;this.track=this.stacking.tracks.find(t=>t.object===this.selected&&t.level===level&&t.direction===direction);if(!this.track)return;
      this.focusTarget();this.taskTime=0;this.running=true;if(media.matches&&!this.explicitMotion){this.taskTime=this.stacking.duration;this.updateArm(0);}
    }else if(this.mode==='vla'){this.rover.run(this.commandIndex);this.running=true;this.terminal('observe');if(media.matches&&!this.explicitMotion)this.updateStudy(0,true);}
    else{this.dynamics.choose(this.pathIndex);this.dynamics.run();this.running=true;if(media.matches&&!this.explicitMotion)this.updateStudy(0,true);}
    this.sync();this.request();
  }
  updateArm(dt){
    if(!this.running)return;this.taskTime=Math.min(this.stacking.duration,this.taskTime+dt);const frames=this.track.frames;
    let i=0;while(i<frames.length-2&&frames[i+1].t<this.taskTime)i++;
    const a=frames[i],b=frames[i+1],t=smooth(clamp((this.taskTime-a.t)/(b.t-a.t),0,1));
    this.q=a.q.map((v,k)=>T.MathUtils.lerp(v,b.q[k],t));this.setArmPose(this.q,T.MathUtils.lerp(a.grip,b.grip,t));
    if(this.taskTime>=this.stacking.attach&&this.taskTime<this.stacking.release){this.world.updateMatrixWorld(true);this.arm.tip.getWorldPosition(this.point);this.table.worldToLocal(this.point);this.objects[this.selected].position.copy(this.point);}
    if(this.taskTime>=this.stacking.release)this.objects[this.selected].position.fromArray(this.track.destination);
    this.focusTarget();this.status(`${a.phase} · ${['amber','cyan','silver'][this.selected]} cube · ${this.track.direction==='stack'?'building the stack':'returning home'}`);
    if(this.taskTime>=this.stacking.duration){this.running=false;if(this.track.direction==='stack')this.stack.push(this.selected);else this.stack.pop();const next=this.objects.findIndex((_,i)=>!this.stack.includes(i));this.selected=next<0?this.stack.at(-1):next;this.focusTarget();this.status(`${this.stack.length}/3 stacked · ${this.stack.length===3?'click the top cube to return it':'choose a cube, or return the top one'}`);this.sync();}
  }
  updateStudy(dt,instant=false){
    const result=this.mode==='vla'?this.rover.update(dt,instant):this.dynamics.update(dt,instant);
    if(this.mode==='vla'){this.terminal(result.phase);this.status(result.done?'Instruction complete · choose another command':'A preset instruction, grounded in a visible landmark.');}
    else this.status(result.done?'Rollout complete · change the impulse and try again':result.phase==='transfer'?'Contact → momentum transfers through the chain':'Prediction → physical rollout · ideal equal-mass dynamics');
    if(result.done){this.running=false;this.sync();}
  }
  updateHand(dt,moving){
    if(!this.hand)return;this.graspValue=T.MathUtils.lerp(this.graspValue,this.grasp,moving?1-Math.exp(-dt*6):1);
    const v=clamp(this.graspValue,0,2),a=this.handPoses[Math.floor(v)],b=this.handPoses[Math.ceil(v)],values={rh_WRJ2:-.08,rh_WRJ1:.04};
    for(const key of Object.keys(a))values[key]=T.MathUtils.lerp(a[key],b[key],v-Math.floor(v));
    this.hand.pose(values);this.handObject.visible=this.grasp===2;
  }
  draw(now){
    this.frame=0;if(!this.ready||!this.visible||document.hidden)return;
    // Kinematic interpolation follows elapsed time, not frame count. Visibility
    // handlers reset the clock so a background tab never skips a whole action.
    const dt=this.last?(now-this.last)/1000:1/60;this.last=now;const moving=!this.paused&&(!media.matches||this.explicitMotion);
    if(moving)this.time+=dt;this.pointer.lerp(this.pointerTarget,moving?1-Math.exp(-dt*10):1);
    // Adapt only from foreground samples; a background-window throttle is not GPU load.
    if(moving&&document.hasFocus()&&dt<.25){this.budgetFrames++;this.budgetSeconds+=dt;if(this.budgetFrames>=60){if(this.budgetSeconds>2.3&&this.pixelCap>.85){this.pixelCap=Math.max(.85,this.pixelCap-.3);if(this.pixelCap<1)this.renderer.shadowMap.enabled=false;this.resize();}this.budgetFrames=0;this.budgetSeconds=0;}}
    this.world.rotation.z=this.orbit.x+this.pointer.x*.25;
    const hand=this.mode==='hand',vla=this.mode==='vla',wam=this.mode==='wam',aspect=this.width/this.height;
    const distance=aspect<.9?1.14:1;
    this.camera.position.set((hand?.72:wam?1.15:vla?1.05:1.5)*distance,((hand?-1.92:wam?-2.55:vla?1.42:2.0)+this.orbit.y)*distance,(hand?1.22:wam?1.28:vla?1.47:1.42)+this.pointer.y*.07);
    this.camera.lookAt(hand?.09:vla?0:wam?0:.12,0,hand?.82:vla?.11:wam?.43:.43);this.camera.fov=vla?36:hand?29:28;this.camera.updateProjectionMatrix();
    if(this.autoPending&&moving&&this.mode==='arm'&&!document.querySelector('[data-loader]:not(.is-complete)')){this.autoElapsed+=dt;if(this.autoElapsed>1.2){this.autoPending=false;this.activate();}}
    if(hand)this.updateHand(dt,moving);else if(this.running&&moving){if(vla||wam)this.updateStudy(dt);else this.updateArm(dt);}
    else if(this.mode==='arm'&&this.taskTime===0){const q=this.motion.home.slice();this.setArmPose(q,.04);}
    this.updateHover();this.renderer.render(this.scene,this.camera);if(moving)this.request();
  }
}
document.querySelectorAll('[data-embodied-world]').forEach(container=>new RobotStage(container));
export {RobotStage,MODES};
