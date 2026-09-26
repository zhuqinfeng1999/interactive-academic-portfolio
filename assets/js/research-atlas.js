(() => {
  'use strict';
  const stage=document.querySelector('[data-atlas-stage]');
  if(!stage)return;
  const escape=(value='')=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const link=p=>p.links.Project||p.links.Journal||p.links.Springer||p.links.DOI||p.links.arXiv||'/publications/';
  fetch('/assets/data/research.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(data=>{
    const nodes=stage.querySelector('[data-atlas-nodes]'),context=stage.querySelector('[data-atlas-context]');
    const map=new Map(data.domains.map(d=>[d.id,d])),papers=new Map(data.publications.map(p=>[p.id,p]));
    nodes.innerHTML=data.domains.map((d,i)=>(i===0?'<p class="atlas-phase-label">Now & next · embodied intelligence</p>':'')+(d.phase==='foundation'&&data.domains[i-1]?.phase!=='foundation'?'<p class="atlas-phase-label">The foundation · visual intelligence</p>':'')+
      '<button type="button" class="atlas-node '+(d.phase==='foundation'?'atlas-foundation':'')+'" id="'+escape(d.id)+'" data-atlas-node="'+escape(d.id)+'" aria-pressed="false"><b>'+escape(d.number)+' / '+(d.phase==='current'?'Current work':d.phase==='direction'?'Future direction':'Vision foundation')+'</b><span>'+escape(d.title)+'</span></button>').join('');
    const activate=id=>{
      const d=map.get(id);if(!d)return;
      nodes.querySelectorAll('[data-atlas-node]').forEach(b=>{b.classList.toggle('active',b.dataset.atlasNode===id);b.setAttribute('aria-pressed',String(b.dataset.atlasNode===id));});
      const works=d.publicationIds.map(id=>papers.get(id)).filter(Boolean);
      context.innerHTML='<p class="atlas-context-label">'+(d.phase==='current'?'Current work':d.phase==='direction'?'Future research direction':'Published research foundation')+'</p><h2>'+escape(d.title)+'</h2><p>'+escape(d.description)+'</p><img class="atlas-detail-image" src="'+escape(d.image)+'" alt="" />'+
        (works.length?'<div class="atlas-related"><b>Related publications</b>'+works.map(p=>'<a href="'+escape(link(p))+'">'+escape(p.title)+' ↗</a>').join('')+'</div>':'<div class="atlas-related"><b>Explore the idea</b><a href="/explorer/?scene='+escape(d.scene)+'">Open the interactive illustration ↗</a><p class="atlas-disclaimer">A research direction, not a claim of completed experiments. The 3D study illustrates kinematics; it does not run a learned policy.</p></div>');
    };
    nodes.addEventListener('click',e=>{const b=e.target.closest('[data-atlas-node]');if(!b)return;activate(b.dataset.atlasNode);history.replaceState(null,'','#'+b.dataset.atlasNode);});
    const fromHash=()=>activate(map.has(location.hash.slice(1))?location.hash.slice(1):data.domains[0].id);
    window.addEventListener('hashchange',fromHash);fromHash();
    const timeline=document.querySelector('[data-full-timeline]');
    if(timeline)timeline.innerHTML=data.news.map(n=>'<article class="timeline-item reveal visible"><time datetime="'+escape(n.date)+'">'+escape(n.label)+'</time><span></span><p><strong>'+escape(n.title)+'</strong> '+escape(n.text)+'</p></article>').join('');
  }).catch(error=>{stage.querySelector('[data-atlas-context]').innerHTML='<h2>Please refresh</h2><p>The research data could not be loaded.</p>';console.error(error);});
})();
