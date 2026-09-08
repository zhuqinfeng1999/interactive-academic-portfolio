/* Spatialfolio — one synthetic district, four ways to observe it.
   Shared GPU geometry and camera transitions; no external models or textures. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const modes={
    pointcloud:{index:0,yaw:-.38,pitch:.42,distance:30,zoom:1,title:'Spatial reconstruction',hint:'Hover to inspect · drag to orbit'},
    aerial:{index:1,yaw:-.28,pitch:1.20,distance:34,zoom:.82,title:'Earth observation',hint:'Move to sample · click to hold'},
    panoramic:{index:2,yaw:-.38,pitch:.42,distance:30,zoom:1,title:'Panoramic perception',hint:'Move to direct the gaze · click to hold'},
    robotics:{index:3,yaw:-.38,pitch:.60,distance:31,zoom:.95,title:'Embodied navigation',hint:'Point along the road · click to navigate'}
  };
  const colors=[
    [.18,.34,.45],[.34,.65,.84],[.39,.81,.87],
    [.24,.68,.57],[.96,.59,.38],[.17,.48,.64],
    [.42,.81,.88],[.90,.61,.36]
  ];
  const vertex=[
    'precision highp float;',
    'attribute vec3 aPosition,aNormal,aColor;',
    'attribute vec4 aMeta;',
    'uniform vec3 uRight,uUp,uForward,uTarget,uAgent;',
    'uniform vec2 uViewport,uCenter,uFoot;',
    'uniform vec4 uModes;',
    'uniform vec3 uGaze;',
    'uniform float uDistance,uScale,uDpr,uTime,uSelected,uSemantic;',
    'uniform mediump float uHalo,uOverlay;',
    'varying mediump vec3 vColor; varying mediump float vAlpha;',
    'void main(){',
    ' vec3 pos=aPosition;',
    ' if(aMeta.x>6.5)pos+=uAgent;',
    ' vec3 p=pos-uTarget; float depth=uDistance+dot(p,uForward);',
    ' vec2 xy=vec2(dot(p,uRight),dot(p,uUp))*uScale*uDistance/(uViewport*.5);',
    ' gl_Position=vec4(xy+uCenter*depth,1.002002*depth-.2002002,depth);',
    ' float selected=1.-step(.2,abs(aMeta.w-uSelected));',
    ' float height=clamp(pos.y/7.,0.,1.);',
    ' vec3 structure=mix(vec3(.24,.46,.67),vec3(.63,.85,1.),height);',
    ' if(aMeta.x<.5)structure=vec3(.22,.38,.48);',
    ' if(aMeta.x>1.5&&aMeta.x<2.5)structure=vec3(.35,.73,.85);',
    ' if(aMeta.x>2.5&&aMeta.x<3.5)structure=vec3(.22,.58,.53);',
    ' if(aMeta.x>3.5&&aMeta.x<4.5)structure=vec3(.63,.52,.42);',
    ' if(aMeta.x>4.5&&aMeta.x<5.5)structure=vec3(.12,.32,.47);',
    ' vec3 color=mix(structure,aColor,uSemantic*.85);',
    ' color=mix(color,aColor,selected*.86);',
    ' vec2 sampleDelta=abs(pos.xz-uFoot);',
    ' float sampled=(1.-smoothstep(2.05,2.3,sampleDelta.x))*(1.-smoothstep(1.3,1.55,sampleDelta.y));',
    ' color=mix(color,aColor*1.35,sampled*uModes.y*.9);',
    ' vec3 direction=normalize(pos-vec3(1.2,1.35,.2));',
    ' float gaze=smoothstep(.84,.94,dot(direction,uGaze));',
    ' color=mix(color,vec3(.46,.88,.87),gaze*uModes.z*.48);',
    ' float normalLength=length(aNormal);',
    ' float facing=dot(aNormal,uForward);',
    ' float visible=normalLength<.1?1.:1.-step(.02,facing);',
    ' float edgeFade=1.-smoothstep(.63,1.15,length(pos.xz/vec2(12.,12.)));',
    ' float depthFade=clamp(1.-(depth-19.)/44.,.25,1.);',
    ' float surfaceLight=length(aNormal)>.1?(.88+.36*max(0.,dot(aNormal,normalize(vec3(-.5,1.,.6))))):1.;',
    ' float shine=aMeta.y*surfaceLight*(1.+selected*.35);',
    ' vColor=color*shine;',
    ' vAlpha=visible*edgeFade*depthFade*.9;',
    ' float perspective=clamp(uDistance/depth,.65,1.45);',
    ' gl_PointSize=aMeta.z*uDpr*clamp(uScale/37.,.7,1.4)*perspective;',
    ' if(aMeta.x>6.5){vColor=vec3(.99,.67,.40)*surfaceLight;vAlpha=visible*uModes.w*.85;}',
    ' if(uHalo>.5){',
    '   float bright=step(1.35,aMeta.y)+selected*.65;',
    '   gl_PointSize*=3.8;vAlpha*=min(bright,1.)*.095;',
    ' }',
    ' if(uOverlay>.5){vColor=aColor;vAlpha=aMeta.y;gl_PointSize=4.*uDpr;}',
    '}'
  ].join('\n');
  const fragment=[
    'precision mediump float;',
    'varying vec3 vColor;varying float vAlpha;',
    'uniform float uOverlay,uHalo;',
    'void main(){',
    ' if(vAlpha<.003)discard;',
    ' if(uOverlay>.5){gl_FragColor=vec4(vColor,vAlpha);return;}',
    ' float r=length(gl_PointCoord-.5);if(r>.5)discard;',
    ' float shape=uHalo>.5?exp(-r*r*18.)*.65:1.-smoothstep(.12,.5,r);',
    ' gl_FragColor=vec4(vColor,vAlpha*shape);',
    '}'
  ].join('\n');

  class SpatialCloud {
    constructor(host){
      this.host=host;this.legacy=host.canvas;this.explorer=host.scene==='explorer';
      this.canvas=document.createElement('canvas');this.canvas.className='spatial-cloud-canvas';
      this.canvas.tabIndex=0;this.canvas.setAttribute('role','img');
      this.canvas.setAttribute('aria-label','Interactive synthetic urban district. Four connected sensing modes. Drag to orbit; arrow keys rotate; Space pauses; R resets.');
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'});
      this.available=Boolean(this.gl);if(!this.available)return;
      this.mode=host.mode;this.seed=9277;this.data=[];this.objects=[];
      this.mobile=innerWidth<=860;this.step=innerWidth<700?.095:.054;
      this.frame=0;this.visible=true;this.active=true;this.elapsed=0;this.lastTime=0;
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.paused=this.motion.matches;
      this.coarse=matchMedia('(pointer: coarse)');
      this.pointer={x:-1000,y:-1000,nx:0,ny:0,active:false};this.parallax={x:0,y:0};
      this.orbit={yaw:0,pitch:0};this.rig={...modes[this.mode]};
      this.weights=[0,0,0,0];this.weights[modes[this.mode].index]=1;
      this.semantic=0;this.semanticTarget=0;this.selected=-1;this.pinned=-1;
      this.foot={x:1,z:0,held:false};this.gaze={yaw:-.5,pitch:.04,held:false};
      this.robot={z:5.8,start:5.8,goal:-5.8,preview:null,keyboardPreview:null,active:false};
      this.lines=new Float32Array(2400*13);this.lineCount=0;
      this.generate();this.count=this.data.length/13;
      this.vertices=new Float32Array(this.data);this.data=null;
      this.setup();this.legacy.insertAdjacentElement('afterend',this.canvas);
      this.createControls();this.bind();this.setActive(true);this.setMode(this.mode,true);
    }
    random(){this.seed=this.seed*16807%2147483647;return(this.seed-1)/2147483646;}
    road(z){return -.9+.52*Math.sin(z*.37);}
    shore(z){return 6.1+.48*Math.sin(z*.49);}
    point(x,y,z,kind,id,light=.9,size=1.55,normal=[0,0,0]){
      const c=colors[Math.min(kind,7)],n=.88+this.random()*.2;
      this.data.push(x,y,z,...normal,...c,kind,light*n,size,id);
    }
    object(label,x,y,z,w,h,d){
      const id=this.objects.length+1;this.objects.push({id,label,min:[x-w/2,y,z-d/2],max:[x+w/2,y+h,z+d/2]});return id;
    }
    box(x,y,z,w,h,d,id,kind=1,glass=true){
      const face=(o,u,v,du,dv,n)=>{
        const cols=Math.ceil(du/this.step),rows=Math.ceil(dv/this.step);
        for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
          const a=i/cols,b=j/rows,p=o.map((q,k)=>q+u[k]*a+v[k]*b);
          let light=n[1]>.5?.72:1.14;
          if(glass&&n[1]<.5){
            const window=(p[1]-y)%.51>.09&&((n[0]===0?p[0]:p[2])+30)%.38>.055;
            light*=window?.77:1.18;
          }
          const jitter=(this.random()-.5)*this.step*.48;
          this.point(p[0]+jitter,p[1],p[2]+jitter,kind,id,light,1.65,n);
        }
      };
      face([x-w/2,y,z-d/2],[w,0,0],[0,h,0],w,h,[0,0,-1]);
      face([x-w/2,y,z+d/2],[w,0,0],[0,h,0],w,h,[0,0,1]);
      face([x-w/2,y,z-d/2],[0,h,0],[0,0,d],h,d,[-1,0,0]);
      face([x+w/2,y,z-d/2],[0,h,0],[0,0,d],h,d,[1,0,0]);
      face([x-w/2,y+h,z-d/2],[w,0,0],[0,0,d],w,d,[0,1,0]);
      // Sparse structural accents are actual rooflines and façade corners.
      if(kind!==1)return;
      const edgeStep=this.step*.66;
      for(let xx=-w/2;xx<=w/2;xx+=edgeStep){
        for(const zz of [-d/2,d/2])this.point(x+xx,y+h+.015,z+zz,2,id,1.5,1.15);
      }
      for(let zz=-d/2;zz<=d/2;zz+=edgeStep){
        for(const xx of [-w/2,w/2])this.point(x+xx,y+h+.015,z+zz,2,id,1.45,1.15);
      }
      for(let yy=y;yy<=y+h;yy+=edgeStep){
        for(const [xx,zz]of[[-w/2,-d/2],[w/2,d/2]])
          this.point(x+xx,yy,z+zz,2,id,1.1,1.05);
      }
    }
    tree(x,z,h=1.3,r=.48){
      const id=this.object('Vegetation / planted canopy',x,0,z,r*2,h+r*.3,r*2);
      for(let y=.03;y<h*.63;y+=.07)this.point(x,y,z,3,id,.55,1.1);
      const n=Math.round(410*.082/this.step);
      for(let i=0;i<n;i++){
        const a=this.random()*6.283,b=Math.acos(2*this.random()-1),rr=r*(.58+this.random()*.42);
        const irregular=1+.13*Math.sin(3*a)*Math.sin(b);
        this.point(x+Math.sin(b)*Math.cos(a)*rr*irregular,h*.77+Math.cos(b)*rr*.95,
          z+Math.sin(b)*Math.sin(a)*rr,3,id,.95+.24*Math.cos(b),1.85);
      }
    }
    roundedVolume(x,y,z,w,h,d,r,id){
      const outline=[];
      const add=(px,pz,nx,nz)=>outline.push([px,pz,nx,nz]);
      const segment=(ax,az,bx,bz,nx,nz)=>{
        const n=Math.ceil(Math.hypot(bx-ax,bz-az)/this.step);
        for(let i=0;i<n;i++)add(mix(ax,bx,i/n),mix(az,bz,i/n),nx,nz);
      };
      segment(-w/2+r,-d/2,w/2-r,-d/2,0,-1);
      segment(w/2,-d/2+r,w/2,d/2-r,1,0);
      segment(w/2-r,d/2,-w/2+r,d/2,0,1);
      segment(-w/2,d/2-r,-w/2,-d/2+r,-1,0);
      for(const [cx,cz,from]of[[w/2-r,-d/2+r,-Math.PI/2],[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI]]){
        for(let a=from;a<from+Math.PI/2;a+=this.step/r)add(cx+Math.cos(a)*r,cz+Math.sin(a)*r,Math.cos(a),Math.sin(a));
      }
      for(const [px,pz,nx,nz]of outline){
        for(let yy=0;yy<=h;yy+=this.step){
          const floor=yy%.46<this.step*1.1;
          const light=floor?1.42:.82+.13*Math.sin(px*14+pz*18);
          this.point(x+px,y+yy,z+pz,1,id,light,floor?1.45:1.7,[nx,0,nz]);
        }
        this.point(x+px,y+h,z+pz,2,id,1.8,1.3);
      }
      for(let xx=-w/2;xx<=w/2;xx+=this.step)for(let zz=-d/2;zz<=d/2;zz+=this.step){
        const dx=Math.max(0,Math.abs(xx)-(w/2-r)),dz=Math.max(0,Math.abs(zz)-(d/2-r));
        if(dx*dx+dz*dz>r*r)continue;
        this.point(x+xx,y+h,z+zz,1,id,.61,1.55,[0,1,0]);
      }
    }
    generate(){
      // A curved boulevard, a civic plaza and a planted waterfront form one map.
      const ground=this.object('Ground / boulevard',-.9,-.04,0,2.7,.12,17);
      for(let x=-11.5;x<=11.5;x+=this.step*1.42)for(let z=-11.5;z<11.5;z+=this.step*1.42){
        if(Math.hypot(x/12,z/12)>1.10)continue;
        const road=Math.abs(x-this.road(z))<1.12||Math.abs(z-2.1)<.69;
        const walk=!road&&(Math.abs(x-this.road(z))<1.55||Math.abs(z-2.1)<.99);
        const water=x>this.shore(z);
        if(!water&&!road&&!walk&&this.random()>.23)continue;
        if(water&&this.random()>.45)continue;
        const jitter=(this.random()-.5)*this.step;
        this.point(x+jitter,water?-.08:walk?.06:0,z+jitter,water?5:0,road?ground:0,water?.67:walk?1.15:road?.70:.65,1.25);
      }
      for(let z=-11;z<11;z+=.05){
        if(Math.abs(z-2.1)>.72) {
          for(const edge of [-1.18,1.18])this.point(this.road(z)+edge,.07,z,2,ground,1.55,1.1);
          if(Math.floor((z+10)/.73)%2===0)this.point(this.road(z),.025,z,2,ground,.8,.95);
        }
        for(const offset of [0,-.23])this.point(this.shore(z)+offset,.05,z,2,0,.68,1.0);
      }
      for(let x=-10;x<6.1;x+=.05){
        if(Math.abs(x-this.road(2.1))<1.15)continue;
        for(const z of [1.4,2.8])this.point(x,.055,z,2,0,.75,1.05);
      }
      for(let z=.60;z<1.13;z+=.14)for(let x=-1.7;x<.65;x+=.052)this.point(x,.04,z,2,ground,.8,1.2);

      // A rounded, stepped landmark and low civic volumes share one street scale.
      let id=this.object('Architecture / research tower',1.9,.07,-4.5,2.5,6.18,2.55);
      this.roundedVolume(1.9,.07,-4.5,2.5,.46,2.55,.28,id);
      this.roundedVolume(1.95,.53,-4.55,2.10,4.61,2.18,.53,id);
      this.roundedVolume(1.95,5.14,-4.55,1.83,1.05,1.92,.46,id);
      id=this.object('Architecture / terraced studios',-4.92,.07,-4.7,4,3.2,2.6);
      this.roundedVolume(-5.6,.07,-4.7,2.3,2.76,2.6,.18,id);
      this.roundedVolume(-3.78,.07,-4.35,1.55,1.84,1.9,.14,id);
      this.box(-5.32,2.83,-4.9,1.2,.3,.8,id,0,false);
      id=this.object('Architecture / library',-4.7,.07,-.9,3.4,3.26,2.4);
      this.roundedVolume(-4.7,.07,-.9,3.4,2.76,2.4,.28,id);
      this.roundedVolume(-4.95,2.83,-1.18,2.23,.50,1.45,.16,id);
      id=this.object('Architecture / waterfront tower',4.55,.07,-4.25,1.4,4.85,2.7);
      this.roundedVolume(4.55,.07,-4.25,1.4,3.68,2.7,.29,id);
      id=this.object('Architecture / waterfront studios',3.55,.07,4.85,2.35,2.8,2.1);
      this.roundedVolume(3.55,.07,4.85,2.75,2.3,2.1,.34,id);
      this.box(3.13,2.37,4.92,1.43,.25,1.2,id,0,false);
      // A low, curved roof breaks the high-rise rhythm with civic-scale geometry.
      id=this.object('Architecture / curved civic pavilion',-4.75,.06,4.72,4.35,1.85,2.7);
      this.box(-4.75,.06,4.72,4.35,1.15,2.7,id);
      for(let x=-6.94;x<=-2.56;x+=this.step)for(let z=3.37;z<6.08;z+=this.step){
        const rise=.6*Math.sin((x+6.94)/4.38*Math.PI);
        this.point(x,1.23+rise,z,1,id,.76,1.65,[0,1,0]);
        if(z<3.47||z>5.98)this.point(x,1.25+rise,z,2,id,1.7,1.15);
      }
      // Circular plaza rings are paving, at ground level; not floating decoration.
      for(let a=0;a<Math.PI*2;a+=.009)for(const r of [1.23,1.32])
        this.point(2.15+Math.cos(a)*r,.06,-.45+Math.sin(a)*r,2,0,.48,1.05);
      const trees=[[-2.47,-7],[-2.68,-3.0],[-2.4,-1],[-2.06,4.2],[-1.99,6.6],
        [.4,-7],[.72,-2.45],[.75,3.7],[.22,6.8],[3.9,-.7],[4.65,.15],[3.5,.63],
        [5.5,-1.7],[5.6,1.05],[5.95,3.5],[5.9,6.8],[-7.15,-2.9],[-7.2,1.7],[-6.5,7]];
      trees.forEach(([x,z],i)=>this.tree(x,z,1.1+(i%4)*.19,.38+(i%3)*.085));
      // A low-resolution periphery provides urban context without competing with the landmark.
      const primaryStep=this.step;this.step*=1.65;
      for(const [x,z,w,h,d]of[[-8.7,-6.7,2.2,1.84,3.1],[-5.2,-8.6,3.8,2.3,1.7],
        [1.9,-8.7,2.6,2.76,2.0],[4.9,-8.3,1.8,1.84,2.3],[-8.9,-1.2,1.9,1.38,3.4],
        [-8.6,4.8,1.7,1.38,2.3],[-5.2,8.7,3.4,.92,1.8],[2.9,8.5,2.8,.92,1.5]]){
        id=this.object('Architecture / surrounding district',x,.06,z,w,h,d);
        this.roundedVolume(x,.06,z,w,h,d,.15,id);
      }
      this.step=primaryStep;
      for(const [side,z]of[[-1,-5.6],[1,-2.5],[-1,5.7]]){
        const x=this.road(z)+side*.84;
        id=this.object('Vehicle / parked car',x,.06,z,.40,.32,.80);
        this.box(x,.08,z,.4,.19,.80,id,4,false);
        this.box(x,.27,z+.06,.33,.12,.43,id,4,false);
      }
      // Mobile agent shares the same road geometry; its local points move on the GPU.
      this.box(0,.1,0,.38,.18,.61,-7,7,false);
      this.box(0,.28,-.03,.24,.1,.31,-7,7,false);
    }
    setup(){
      const gl=this.gl;
      const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(this.program);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.STATIC_DRAW);
      this.overlayBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.overlayBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.lines.byteLength,gl.DYNAMIC_DRAW);
      this.attributes=[['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aMeta',4,36]].map(([n,size,offset])=>({loc:gl.getAttribLocation(this.program,n),size,offset}));
      this.uniforms={};['Right','Up','Forward','Target','Agent','Viewport','Center','Foot','Modes','Gaze','Distance','Scale','Dpr','Time','Selected','Semantic','Halo','Overlay'].forEach(n=>this.uniforms[n]=gl.getUniformLocation(this.program,'u'+n));
      gl.clearColor(0,0,0,0);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);
    }
    useBuffer(buffer){
      const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(const {loc,size,offset}of this.attributes){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,52,offset);}
    }
    createControls(){
      this.controls=document.createElement('div');this.controls.className='cloud-controls';
      this.controls.innerHTML='<div class="cloud-object-label" role="status" aria-live="polite"></div><span class="cloud-caption">One district · four perspectives</span><div role="group" aria-label="Shared scene controls"><button type="button" data-cloud-style aria-pressed="false">Semantic color</button><button type="button" data-cloud-pause aria-pressed="false">Pause</button><button type="button" data-cloud-reset aria-label="Reset current scene">↺</button></div>';
      (this.legacy.closest('.hero')||this.legacy.parentElement).append(this.controls);
      this.label=this.controls.querySelector('.cloud-object-label');
      this.controls.querySelector('[data-cloud-style]').addEventListener('click',e=>{
        this.semanticTarget=1-this.semanticTarget;e.currentTarget.setAttribute('aria-pressed',String(this.semanticTarget===1));this.requestDraw();});
      this.controls.querySelector('[data-cloud-pause]').addEventListener('click',()=>this.togglePause());
      this.controls.querySelector('[data-cloud-reset]').addEventListener('click',()=>this.reset());
      this.syncPause();
    }
    syncPause(){const b=this.controls.querySelector('[data-cloud-pause]');b.textContent=this.paused?'Play':'Pause';b.setAttribute('aria-pressed',String(this.paused));}
    togglePause(){this.paused=!this.paused;this.syncPause();this.requestDraw();}
    reset(){this.orbit={yaw:0,pitch:0};this.pinned=-1;this.foot.held=false;this.gaze.held=false;
      this.robot={z:5.8,start:5.8,goal:-5.8,preview:null,keyboardPreview:null,active:false};this.requestDraw();}
    setMode(mode,initial=false){
      if(!this.available||!modes[mode])return;
      this.mode=mode;this.pinned=-1;this.selected=-1;this.drag=null;
      this.pointer.active=false;this.orbit={yaw:0,pitch:0};
      this.canvas.setAttribute('aria-label','Interactive synthetic urban district: '+modes[mode].title+'. '+modes[mode].hint+'. Drag to orbit. Arrow keys interact with this mode; Enter selects or holds; Space pauses; R resets.');
      if(initial||this.motion.matches){this.rig={...modes[mode]};this.weights=this.weights.map((_,i)=>Number(i===modes[mode].index));}
      this.setActive(true);this.requestDraw();
    }
    setActive(value){
      this.active=Boolean(value&&this.available);this.canvas.hidden=!this.active;this.controls.hidden=!this.active;
      this.legacy.style.visibility=this.active?'hidden':'';
      this.legacy.closest('.hero,.explorer-shell')?.classList.toggle('has-spatial-cloud',this.active);
      if(this.active){this.resize();this.requestDraw();}else{cancelAnimationFrame(this.frame);this.frame=0;}
    }
    bind(){
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);
      this.visibilityObserver=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;this.requestDraw();});this.visibilityObserver.observe(this.canvas);
      document.addEventListener('visibilitychange',()=>{this.lastTime=0;this.requestDraw();});
      this.motion.addEventListener('change',()=>{this.paused=this.motion.matches;this.syncPause();this.requestDraw();});
      const update=e=>{const r=this.canvas.getBoundingClientRect();this.pointer={x:e.clientX-r.left,y:e.clientY-r.top,nx:clamp((e.clientX-r.left)/r.width-.5,-.5,.5),ny:clamp((e.clientY-r.top)/r.height-.5,-.5,.5),active:true};this.robot.keyboardPreview=null;};
      this.canvas.addEventListener('pointerdown',e=>{
        update(e);this.drag={x:e.clientX,y:e.clientY,yaw:this.orbit.yaw,pitch:this.orbit.pitch,moved:false};
        this.canvas.setPointerCapture(e.pointerId);this.requestDraw();
      });
      this.canvas.addEventListener('pointermove',e=>{
        update(e);
        if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.drag.moved||=Math.hypot(dx,dy)>6;
          if(this.drag.moved){this.orbit.yaw=this.drag.yaw-dx*.004;this.orbit.pitch=clamp(this.drag.pitch+dy*.003,-.24,.24);this.canvas.classList.add('is-dragging');}}
        this.requestDraw();
      },{passive:true});
      const release=e=>{
        const tapped=this.drag&&!this.drag.moved&&e.type!=='pointercancel';this.drag=null;this.canvas.classList.remove('is-dragging');
        if(tapped&&this.view){
          if(this.mode==='pointcloud'){const hit=this.pick();this.pinned=hit===this.pinned?-1:hit;}
          if(this.mode==='aerial'){this.updateInteraction(0);this.foot.held=!this.foot.held;}
          if(this.mode==='panoramic'){this.updateInteraction(0);this.gaze.held=!this.gaze.held;}
          if(this.mode==='robotics'){const g=this.groundAtPointer();if(g){this.robot.start=this.robot.z;this.robot.goal=clamp(g[2],-7,7);this.robot.active=true;if(this.motion.matches)this.robot.z=this.robot.goal;}}
        }
        this.requestDraw();
      };
      this.canvas.addEventListener('pointerup',release);this.canvas.addEventListener('pointercancel',release);
      this.canvas.addEventListener('lostpointercapture',()=>{this.drag=null;this.canvas.classList.remove('is-dragging');});
      this.canvas.addEventListener('pointerleave',()=>{this.pointer.active=false;this.robot.preview=null;this.requestDraw();});
      this.canvas.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','r','R','Enter'].includes(e.key))return;
        e.preventDefault();
        if(e.key===' ')this.togglePause();
        else if(e.key.toLowerCase()==='r')this.reset();
        else if(e.key==='Enter'){
          if(this.mode==='pointcloud'){const buildings=this.objects.filter(o=>o.label.startsWith('Architecture'));const current=buildings.findIndex(o=>o.id===this.pinned);this.pinned=buildings[(current+1)%buildings.length].id;}
          if(this.mode==='aerial')this.foot.held=!this.foot.held;
          if(this.mode==='panoramic')this.gaze.held=!this.gaze.held;
          if(this.mode==='robotics'){this.robot.start=this.robot.z;this.robot.goal=this.robot.preview??-this.robot.goal;this.robot.active=true;if(this.motion.matches)this.robot.z=this.robot.goal;}
        }else{
          const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dz=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
          this.pointer.active=false;
          if(this.mode==='pointcloud'){this.orbit.yaw-=dx*.12;this.orbit.pitch=clamp(this.orbit.pitch-dz*.06,-.24,.24);}
          if(this.mode==='aerial'){this.foot.held=true;this.foot.x=clamp(this.foot.x+dx*.5,-5,5);this.foot.z=clamp(this.foot.z+dz*.5,-6,6);}
          if(this.mode==='panoramic'){this.gaze.held=true;this.gaze.yaw+=dx*.16;this.gaze.pitch=clamp(this.gaze.pitch-dz*.10,-.7,.7);}
          if(this.mode==='robotics')this.robot.keyboardPreview=clamp((this.robot.preview??this.robot.goal)+dx+dz,-7,7);
        }
        this.requestDraw();
      });
      this.canvas.addEventListener('webglcontextlost',e=>{
        e.preventDefault();this.available=false;this.setActive(false);this.host.updateReadout();this.host.draw(performance.now(),true);});
      this.canvas.addEventListener('webglcontextrestored',()=>{
        this.setup();this.available=true;this.setMode(this.host.mode,true);this.host.updateReadout();});
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height||!this.available)return;
      this.width=r.width;this.height=r.height;this.mobile=innerWidth<=860;this.dpr=Math.min(devicePixelRatio||1,1.7);
      this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);
      this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.requestDraw();
    }
    requestDraw(){if(this.available&&this.active&&this.visible&&!document.hidden&&!this.frame)this.frame=requestAnimationFrame(t=>this.draw(t));}
    ray(){
      if(!this.pointer.active||!this.view)return null;
      const {right,up,forward,target,scale,distance,center}=this.view;
      const sx=this.pointer.x-this.width*(.5+center[0]*.5),sy=this.height*(.5-center[1]*.5)-this.pointer.y;
      const direction=right.map((v,i)=>v*sx+up[i]*sy+forward[i]*scale*distance);
      const length=Math.hypot(...direction);
      return {origin:target.map((v,i)=>v-forward[i]*distance),direction:direction.map(v=>v/length)};
    }
    groundAtPointer(){
      const ray=this.ray();if(!ray||Math.abs(ray.direction[1])<.001)return null;
      const t=-ray.origin[1]/ray.direction[1];return t>0?ray.origin.map((v,i)=>v+ray.direction[i]*t):null;
    }
    pick(){
      const ray=this.ray();if(!ray||this.drag?.moved)return -1;
      let closest=Infinity,hit=-1;
      for(const o of this.objects){
        let near=0,far=100;
        for(let i=0;i<3;i++){
          const d=ray.direction[i],start=ray.origin[i];
          if(Math.abs(d)<1e-7){if(start<o.min[i]||start>o.max[i]){far=-1;break;}}
          else{const a=(o.min[i]-start)/d,b=(o.max[i]-start)/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
        }
        if(far>=near&&near<closest){closest=near;hit=o.id;}
      }
      return hit;
    }
    updateInteraction(dt){
      const still=this.paused||this.motion.matches;const ease=still?1:1-Math.exp(-Math.max(dt,16)/55);
      if(!this.foot.held&&this.mode==='aerial'){
        const g=this.groundAtPointer();
        const x=g?clamp(g[0],-5,5):1.3+Math.sin(this.elapsed*.00017)*2.7;
        const z=g?clamp(g[2],-6,6):Math.cos(this.elapsed*.00013)*3.5;
        this.foot.x=mix(this.foot.x,x,ease);this.foot.z=mix(this.foot.z,z,ease);
      }
      if(!this.gaze.held&&this.mode==='panoramic'){
        const yaw=this.pointer.active?this.pointer.nx*5.8:Math.sin(this.elapsed*.00017)*1.7-.5;
        const pitch=this.pointer.active?-this.pointer.ny*1.5:.04;
        this.gaze.yaw=mix(this.gaze.yaw,yaw,ease);this.gaze.pitch=mix(this.gaze.pitch,pitch,ease);
      }
      if(this.mode==='robotics'){
        const g=this.groundAtPointer();this.robot.preview=g?clamp(g[2],-7,7):this.robot.keyboardPreview;
        if(this.robot.active&&!still){const d=this.robot.goal-this.robot.z,step=Math.min(Math.abs(d),dt*.0015);this.robot.z+=Math.sign(d)*step;if(Math.abs(d)<.025)this.robot.active=false;}
      }
    }
    line(a,b,color,alpha){
      if(this.lineCount+2>2400)return;
      for(const p of [a,b]){
        const offset=this.lineCount*13;this.lines.set([...p,0,0,0,...color,6,alpha,1,-10],offset);this.lineCount++;
      }
    }
    overlays(){
      this.lineCount=0;const blue=[.35,.78,.89],mint=[.40,.9,.77],amber=[1,.65,.37];
      if(this.weights[1]>.015){
        const x=this.foot.x,z=this.foot.z,w=2.25,h=1.5,alpha=this.weights[1]*.75;
        const corners=[[x-w,.15,z-h],[x+w,.15,z-h],[x+w,.15,z+h],[x-w,.15,z+h]];
        corners.forEach((p,i)=>this.line(p,corners[(i+1)%4],blue,alpha));
        for(let i=1;i<4;i++){const xx=x-w+i*w*.5;this.line([xx,.14,z-h],[xx,.14,z+h],blue,alpha*.18);}
        const marker=.20;this.line([x-marker,.16,z],[x+marker,.16,z],mint,alpha);this.line([x,.16,z-marker],[x,.16,z+marker],mint,alpha);
      }
      if(this.weights[2]>.015){
        const center=[1.2,1.35,.2],r=2.5,alpha=this.weights[2];
        const sphere=(longitude,latitude)=>[center[0]+Math.cos(latitude)*Math.sin(longitude)*r,center[1]+Math.sin(latitude)*r,center[2]+Math.cos(latitude)*Math.cos(longitude)*r];
        for(const latitude of [-Math.PI/4,0,Math.PI/4])for(let a=0;a<Math.PI*2;a+=.10)this.line(sphere(a,latitude),sphere(a+.10,latitude),blue,alpha*.20);
        for(let a=0;a<Math.PI*2;a+=Math.PI/3)for(let b=-Math.PI/2;b<Math.PI/2;b+=.10)this.line(sphere(a,b),sphere(a,b+.10),blue,alpha*.16);
        const yaw=this.gaze.yaw,pitch=this.gaze.pitch;
        for(let b=-Math.PI/2;b<Math.PI/2;b+=.07)this.line(sphere(yaw,b),sphere(yaw,b+.07),mint,alpha*.73);
        for(let a=0;a<Math.PI*2;a+=.07)this.line(sphere(a,pitch),sphere(a+.07,pitch),blue,alpha*.52);
        const gaze=sphere(yaw,pitch);this.line(center,gaze,mint,alpha*.62);
        const s=.085;this.line([gaze[0]-s,gaze[1],gaze[2]],[gaze[0]+s,gaze[1],gaze[2]],mint,alpha);
        this.line([gaze[0],gaze[1]-s,gaze[2]],[gaze[0],gaze[1]+s,gaze[2]],mint,alpha);
      }
      if(this.weights[3]>.015){
        const alpha=this.weights[3],start=this.robot.start,end=this.robot.goal;
        for(let i=0;i<100;i++){const z0=mix(start,end,i/100),z1=mix(start,end,(i+1)/100);this.line([this.road(z0)+.32,.16,z0],[this.road(z1)+.32,.16,z1],amber,alpha*.85);}
        for(const [z,color,strength]of[[end,amber,1],[this.robot.preview,mint,.7]]){
          if(z===null)continue;const x=this.road(z)+.32,s=.19;
          this.line([x-s,.17,z-s],[x+s,.17,z+s],color,alpha*strength);
          this.line([x-s,.17,z+s],[x+s,.17,z-s],color,alpha*strength);
        }
      }
    }
    updateLabel(){
      let text=modes[this.mode].hint;
      if(this.coarse.matches&&this.mode==='pointcloud')text='Tap to inspect · drag to orbit';
      if(this.mode==='pointcloud'){
        const object=this.objects.find(o=>o.id===this.selected);if(object)text=object.label+(this.pinned>0?' · selected':'');
      }else if(this.mode==='aerial'&&this.foot.held)text='Sample held · click to release';
      else if(this.mode==='panoramic'&&this.gaze.held)text='Gaze held · click to release';
      else if(this.mode==='robotics'&&this.robot.active)text='Following the road · click to set a new destination';
      if(this.label.textContent!==text)this.label.textContent=text;
    }
    draw(time){
      this.frame=0;if(!this.active||!this.available||!this.visible||document.hidden)return;
      const dt=Math.min(this.lastTime?time-this.lastTime:16,45);this.lastTime=time;
      if(!this.paused&&!this.drag)this.elapsed+=dt;
      const instant=this.motion.matches||this.paused;
      const cameraEase=instant?1:1-Math.exp(-dt/190),interactionEase=instant?1:1-Math.exp(-dt/75);
      const desired=modes[this.mode];let settling=false;
      for(const key of ['yaw','pitch','distance','zoom']){const before=this.rig[key];this.rig[key]=mix(before,desired[key],cameraEase);settling||=Math.abs(this.rig[key]-desired[key])>.0005;}
      this.weights=this.weights.map((v,i)=>mix(v,Number(i===desired.index),cameraEase));
      this.semantic=mix(this.semantic,this.semanticTarget,interactionEase);
      this.parallax.x=mix(this.parallax.x,this.pointer.active?this.pointer.nx:0,interactionEase);
      this.parallax.y=mix(this.parallax.y,this.pointer.active?this.pointer.ny:0,interactionEase);
      const yaw=this.rig.yaw+this.orbit.yaw+(!this.motion.matches?this.parallax.x*.065:0)+(this.paused?0:Math.sin(this.elapsed*.00011)*.07);
      const pitch=clamp(this.rig.pitch+this.orbit.pitch-this.parallax.y*.025,.30,1.40);
      const right=[Math.cos(yaw),0,-Math.sin(yaw)];
      const up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)];
      const forward=[-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
      const target=[-.2,1.45,-.25],distance=this.rig.distance;
      const scale=Math.min(this.width/(this.explorer&&!this.mobile?29:22.9),this.height/16.9)*this.rig.zoom;
      const center=this.explorer&&!this.mobile?[.33,-.01]:[.045,-.02];
      this.view={right,up,forward,target,scale,center,distance};
      this.updateInteraction(dt);
      this.selected=this.mode==='pointcloud'?(this.pinned>0?this.pinned:this.pick()):-1;
      this.updateLabel();this.overlays();
      const gaze=[Math.sin(this.gaze.yaw)*Math.cos(this.gaze.pitch),Math.sin(this.gaze.pitch),Math.cos(this.gaze.yaw)*Math.cos(this.gaze.pitch)];
      const gl=this.gl,u=this.uniforms;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      gl.uniform3fv(u.Right,right);gl.uniform3fv(u.Up,up);gl.uniform3fv(u.Forward,forward);gl.uniform3fv(u.Target,target);
      gl.uniform3f(u.Agent,this.road(this.robot.z)+.32,0,this.robot.z);
      gl.uniform2f(u.Viewport,this.width,this.height);gl.uniform2fv(u.Center,center);gl.uniform2f(u.Foot,this.foot.x,this.foot.z);
      gl.uniform4fv(u.Modes,this.weights);gl.uniform3fv(u.Gaze,gaze);
      gl.uniform1f(u.Distance,distance);gl.uniform1f(u.Scale,scale);gl.uniform1f(u.Dpr,this.dpr);gl.uniform1f(u.Time,this.elapsed*.001);
      gl.uniform1f(u.Selected,this.selected);gl.uniform1f(u.Semantic,this.semantic);
      gl.uniform1f(u.Overlay,0);gl.uniform1f(u.Halo,0);this.useBuffer(this.buffer);
      gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,this.count);
      gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.uniform1f(u.Halo,1);gl.drawArrays(gl.POINTS,0,this.count);
      if(this.lineCount){
        this.useBuffer(this.overlayBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.lines.subarray(0,this.lineCount*13));
        gl.uniform1f(u.Halo,0);gl.uniform1f(u.Overlay,1);gl.drawArrays(gl.LINES,0,this.lineCount);
      }
      gl.depthMask(true);
      if(!this.paused||settling)this.requestDraw();
    }
  }
  window.SpatialCloud=SpatialCloud;
})();
