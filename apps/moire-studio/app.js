(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const canvas = $("#artwork"), ctx = canvas.getContext("2d", { alpha: false });
  const STORAGE = "moire-studio.v1";
  const palettes = [
    { id:"tide",name:"Deep tide",bg:"#101a1d",ink:"#d5eee0",colors:["#a6d8c7","#65a9a1","#e5b28d","#8ba6cf","#d6d39c"] },
    { id:"clay",name:"Soft clay",bg:"#241a19",ink:"#f2dfc6",colors:["#d88f73","#e4bd91","#8f9d82","#c78391","#eeddb1"] },
    { id:"gloaming",name:"Blue hour",bg:"#131a29",ink:"#dce7ff",colors:["#8bb8ec","#b5a3e8","#f0ab9a","#83cfca","#d7dc91"] },
    { id:"orchid",name:"Wild orchid",bg:"#211a27",ink:"#f0e4f2",colors:["#d49bc6","#8dbfbd","#f0bd83","#a7a4e0","#efb4ab"] },
    { id:"lichen",name:"Lichen light",bg:"#202319",ink:"#ecebd7",colors:["#c7d58c","#8eac82","#d9b985","#a7cbd0","#e2d8b0"] }
  ];
  const scenes = [
    ["topography","Field notes"],["orbital","Quiet orbit"],["canopy","Night garden"],["dunes","Slow dunes"],["radiant","Afterglow"]
  ];
  const defaults = { scene:"topography", palette:"tide", seed:"moonlit-garden", density:56, flow:35, aspect:"landscape" };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  let state = loadState(), history = [], historyAt = -1, gallery = loadGallery(), toastTimer;
  let resizeTimer, renderToken = 0;

  function loadState() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || "{}"); } catch {}
    const params = new URLSearchParams(location.search);
    const shared = params.get("recipe");
    if (shared) { try { saved = { ...saved, ...JSON.parse(decodeURIComponent(escape(atob(shared)))) }; } catch {} }
    return { ...defaults, ...saved };
  }
  function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { notify("Browser storage is full. Export a recipe to keep it safe."); } }
  function loadGallery() { try { const x=JSON.parse(localStorage.getItem(STORAGE+".gallery")||"[]"); return Array.isArray(x)?x.slice(0,24):[]; } catch { return []; } }
  function persistGallery() { try { localStorage.setItem(STORAGE+".gallery",JSON.stringify(gallery)); } catch { notify("Gallery is full. Remove a saved world and try again."); } }
  function hashSeed(str) { let h=1779033703^str.length; for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;} return () => {h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0;}; }
  function rng(seed) { const seedFn=hashSeed(seed);let a=seedFn();return () => { a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
  function palette() { return palettes.find(p=>p.id===state.palette)||palettes[0]; }
  function titleCase(str) { return str.replace(/(^|[-\s])\S/g,m=>m.toUpperCase()); }
  function syncControls() {
    $("#scene").value=state.scene; $("#density").value=state.density; $("#flow").value=state.flow; $("#seed").value=state.seed; $("#aspect").value=state.aspect;
    $("#density-value").textContent=state.density+"%"; $("#flow-value").textContent=state.flow+"%"; $("#art-title").textContent=titleCase(state.seed||"untitled world").toUpperCase();
    $("#palette-name").textContent=palette().name.toUpperCase();
    $("#palettes").innerHTML=palettes.map(p=>`<button class="palette-chip" aria-label="${p.name}" aria-pressed="${p.id===state.palette}" title="${p.name}" data-palette="${p.id}"><span class="palette-swatch" style="--sw1:${p.colors[0]};--sw2:${p.colors[2]};--sw3:${p.colors[4]}"></span></button>`).join("");
    $("#palettes").querySelectorAll("[data-palette]").forEach(b=>b.onclick=()=>change({palette:b.dataset.palette}));
    $("#canvas-stage").className="canvas-stage "+state.aspect;
    $("#undo").disabled=historyAt<=0;$("#redo").disabled=historyAt<0||historyAt>=history.length-1;
    paintGallery();
  }
  function addHistory() { const copy=clone(state); if(historyAt<history.length-1)history=history.slice(0,historyAt+1); if(JSON.stringify(history.at(-1))!==JSON.stringify(copy)){history.push(copy);if(history.length>40)history.shift();historyAt=history.length-1;} syncControls(); }
  function change(patch) { state={...state,...patch};persist();addHistory();draw(); }
  function restore(s) { state={...defaults,...s};persist();syncControls();draw(); }
  function setCanvasSize(target=canvas) {
    const box=canvas.getBoundingClientRect();let w=Math.max(320,Math.round(box.width)),h=w*2/3;
    if(state.aspect==="square")h=w; if(state.aspect==="portrait"){h=w*1.25;w=Math.min(w,520);}
    if(target===canvas){canvas.width=w;canvas.height=h;return [w,h];}
    return [w,h];
  }
  function draw() {
    const token=++renderToken;$("#rendering").hidden=false;
    requestAnimationFrame(()=>{if(token!==renderToken)return;const [w,h]=setCanvasSize();render(ctx,w,h,state,token);$("#rendering").hidden=true;});
  }
  function render(c,w,h,s,token) {
    const p=palettes.find(x=>x.id===s.palette)||palettes[0],random=rng(s.seed+"|"+s.scene+"|"+s.palette);
    c.save();c.fillStyle=p.bg;c.fillRect(0,0,w,h);c.lineCap="round";c.lineJoin="round";
    const density=Number(s.density)/100,flow=Number(s.flow)/100;
    if(s.scene==="topography")drawTopography(c,w,h,p,random,density,flow,token);
    else if(s.scene==="orbital")drawOrbital(c,w,h,p,random,density,flow);
    else if(s.scene==="canopy")drawCanopy(c,w,h,p,random,density,flow);
    else if(s.scene==="dunes")drawDunes(c,w,h,p,random,density,flow);
    else drawRadiant(c,w,h,p,random,density,flow);
    drawGrain(c,w,h,random,Math.round(300+density*1100));
    c.restore();
  }
  function drawTopography(c,w,h,p,random,density,flow,token) {
    const nx=Math.round(32+density*40),ny=Math.round(nx*h/w),grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>{
      let x=i/nx,y=j/ny;let dx=x-.52,dy=y-.5;return Math.sin((x*4.2+Math.sin(y*8+flow*2)*.18)*Math.PI)*.39+Math.cos((y*3.8+Math.sin(x*6)*.16)*Math.PI)*.32+Math.sin((dx*dx+dy*dy)*38+flow*4)*.22+Math.sin(x*11+y*9)*.08;
    }));
    const cuts=12+Math.round(density*22);
    for(let k=0;k<cuts;k++){
      if(token!==renderToken)return;
      const level=-.8+k*(1.6/(cuts-1)),color=p.colors[k%p.colors.length];
      c.beginPath();
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
        const vals=[grid[y][x],grid[y][x+1],grid[y+1][x+1],grid[y+1][x]],pts=[];
        for(let e=0;e<4;e++){const a=vals[e],b=vals[(e+1)%4];if((a<level&&b>=level)||(b<level&&a>=level)){const t=(level-a)/(b-a);let ex=[x+(e===1?1:e===2?t:0),y+(e===2?1:e===3?1-t:0)];if(e===0)ex=[x+t,y];if(e===1)ex=[x+1,y+t];if(e===2)ex=[x+1-t,y+1];pts.push(ex);}}
        if(pts.length>=2){c.moveTo(pts[0][0]/nx*w,pts[0][1]/ny*h);c.lineTo(pts[1][0]/nx*w,pts[1][1]/ny*h);}
      }
      c.globalAlpha=.38+random()*.22;c.strokeStyle=color;c.lineWidth=0.75+random()*.7;c.stroke();
    }
    c.globalAlpha=1;
    c.fillStyle=p.ink;c.font="10px 'DM Mono',monospace";c.fillText("N  27° 14′",w*.06,h*.12);c.fillText("FIELD STUDY  /  "+String(Math.floor(random()*900)+100),w*.06,h*.16);
    for(let i=0;i<22;i++){let x=random()*w,y=random()*h;c.globalAlpha=.25;c.fillStyle=p.colors[i%p.colors.length];c.beginPath();c.arc(x,y,random()*1.6+.5,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  }
  function drawOrbital(c,w,h,p,r,density,flow) {
    const cx=w*(.47+(r()-.5)*.08),cy=h*(.49+(r()-.5)*.08),base=Math.min(w,h)*(.12+density*.07),rx=w*.43,ry=h*.42;
    const haze=c.createRadialGradient(cx,cy,base*.4,cx,cy,base*2.6);haze.addColorStop(0,p.colors[0]+"66");haze.addColorStop(1,p.bg+"00");c.fillStyle=haze;c.fillRect(0,0,w,h);
    for(let i=0;i<7+Math.floor(density*13);i++){const radius=base*(1.12+i*.13),tilt=-.35+r()*.7;c.save();c.translate(cx,cy);c.rotate(tilt);c.beginPath();c.ellipse(0,0,radius*1.75,radius*.64,0,0,Math.PI*2);c.strokeStyle=p.colors[i%p.colors.length];c.globalAlpha=.24+r()*.38;c.lineWidth=.7+r()*1.2;c.stroke();if(i%3===0){c.translate(Math.cos(flow+i)*radius*1.75,Math.sin(flow+i)*radius*.64);c.beginPath();c.arc(0,0,2+r()*3,0,Math.PI*2);c.fillStyle=p.ink;c.globalAlpha=.8;c.fill();}c.restore();}
    const glow=c.createRadialGradient(cx-base*.25,cy-base*.3,base*.05,cx,cy,base);glow.addColorStop(0,p.ink);glow.addColorStop(.24,p.colors[0]);glow.addColorStop(.72,p.colors[1]);glow.addColorStop(1,p.bg);c.beginPath();c.arc(cx,cy,base,0,Math.PI*2);c.fillStyle=glow;c.fill();
    for(let i=0;i<90+density*180;i++){const x=r()*w,y=r()*h; c.globalAlpha=.22+r()*.65;c.fillStyle=i%5===0?p.colors[i%p.colors.length]:p.ink;c.beginPath();c.arc(x,y,r()*1.35+.3,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  }
  function drawCanopy(c,w,h,p,r,density,flow) {
    const count=8+Math.round(density*16),ground=h*.88;
    for(let i=0;i<count;i++){const x=(i+.5)/count*w+(r()-.5)*w/count*.7,top=h*(.16+r()*.37),stem=(1.2+r()*2.2)*(i%4===0?1.4:1);c.beginPath();c.moveTo(x,ground);c.bezierCurveTo(x+(r()-.5)*45,ground*.64,x+(r()-.5)*35,top+35,x+(r()-.5)*25,top);c.strokeStyle=p.colors[i%p.colors.length];c.globalAlpha=.38+r()*.45;c.lineWidth=stem;c.stroke();
      const leaves=10+Math.floor(density*24);
      for(let j=0;j<leaves;j++){let t=.18+r()*.76,y=ground-(ground-top)*t,side=r()<.5?-1:1,l=(5+r()*13)*(0.6+density),xleaf=x+side*(8+r()*22)*(1-t*.3);c.save();c.translate(xleaf,y);c.rotate(side*(-.4+r()*.5));c.beginPath();c.ellipse(0,0,l*.7,l*.24,0,0,Math.PI*2);c.fillStyle=p.colors[Math.floor(r()*p.colors.length)];c.globalAlpha=.35+r()*.4;c.fill();c.restore();}
    }
    const mist=c.createLinearGradient(0,h*.54,0,h);mist.addColorStop(0,"#00000000");mist.addColorStop(1,p.bg+"e8");c.fillStyle=mist;c.fillRect(0,h*.5,w,h*.5);
    for(let i=0;i<18+density*25;i++){const x=r()*w,y=h*(.25+r()*.58);c.beginPath();c.arc(x,y,r()*2.5+.5,0,Math.PI*2);c.fillStyle=i%2?p.ink:p.colors[2];c.globalAlpha=.4+r()*.4;c.fill();}c.globalAlpha=1;
  }
  function drawDunes(c,w,h,p,r,density,flow) {
    const layers=8+Math.round(density*16);
    for(let i=0;i<layers;i++){const baseY=h*(.24+i*.76/layers),amp=h*(.025+r()*.055)*(0.5+flow),phase=r()*Math.PI*2,freq=.7+r()*1.5;c.beginPath();c.moveTo(0,h);c.lineTo(0,baseY);for(let x=0;x<=w+8;x+=8){const y=baseY+Math.sin(x/w*Math.PI*freq+phase)*amp+Math.sin(x/w*Math.PI*freq*2+phase*.6)*amp*.26;c.lineTo(x,y);}c.lineTo(w,h);c.closePath();const color=p.colors[i%p.colors.length];c.globalAlpha=.55+r()*.3;c.fillStyle=color;c.fill();
      c.beginPath();for(let x=0;x<=w+8;x+=8){let y=baseY+Math.sin(x/w*Math.PI*freq+phase)*amp+Math.sin(x/w*Math.PI*freq*2+phase*.6)*amp*.26;c.lineTo(x,y);}c.strokeStyle=p.ink;c.globalAlpha=.1+r()*.15;c.lineWidth=.6+r()*.6;c.stroke();
    }
    const sunX=w*(.2+r()*.6),sunY=h*(.22+r()*.18),sunR=Math.min(w,h)*(.05+density*.065);const sun=c.createRadialGradient(sunX,sunY,2,sunX,sunY,sunR*1.7);sun.addColorStop(0,p.ink);sun.addColorStop(.22,p.colors[2]);sun.addColorStop(1,p.colors[2]+"00");c.globalAlpha=.85;c.fillStyle=sun;c.fillRect(sunX-sunR*2,sunY-sunR*2,sunR*4,sunR*4);c.globalAlpha=1;
  }
  function drawRadiant(c,w,h,p,r,density,flow) {
    const cx=w*(.5+(r()-.5)*.14),cy=h*(.5+(r()-.5)*.1),rays=24+Math.round(density*96),reach=Math.min(w,h)*(.3+density*.16);
    const halo=c.createRadialGradient(cx,cy,0,cx,cy,reach*1.3);halo.addColorStop(0,p.colors[2]+"55");halo.addColorStop(1,p.bg+"00");c.fillStyle=halo;c.fillRect(0,0,w,h);
    for(let i=0;i<rays;i++){const a=i/rays*Math.PI*2,spread=(.015+r()*.075)*(0.6+flow),len=reach*(.42+r()*.85),color=p.colors[i%p.colors.length];c.beginPath();c.moveTo(cx+Math.cos(a)*reach*.12,cy+Math.sin(a)*reach*.12);const mx=cx+Math.cos(a+spread)*len*.55,my=cy+Math.sin(a+spread)*len*.55;c.quadraticCurveTo(mx+Math.cos(a+Math.PI/2)*len*.08,my+Math.sin(a+Math.PI/2)*len*.08,cx+Math.cos(a+spread*.3)*len,cy+Math.sin(a+spread*.3)*len);c.strokeStyle=color;c.globalAlpha=.22+r()*.45;c.lineWidth=.5+r()*1.8;c.stroke();}
    const core=c.createRadialGradient(cx,cy,1,cx,cy,reach*.18);core.addColorStop(0,p.ink);core.addColorStop(.3,p.colors[0]);core.addColorStop(1,p.colors[0]+"00");c.fillStyle=core;c.fillRect(cx-reach*.2,cy-reach*.2,reach*.4,reach*.4);
    for(let i=0;i<50+density*100;i++){const a=r()*Math.PI*2,rad=reach*(.15+r()*.9);c.beginPath();c.arc(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad,r()*1.4+.3,0,Math.PI*2);c.fillStyle=p.ink;c.globalAlpha=.25+r()*.6;c.fill();}c.globalAlpha=1;
  }
  function drawGrain(c,w,h,r,count) {c.fillStyle="#fff";for(let i=0;i<count;i++){const x=r()*w,y=r()*h;c.globalAlpha=r()*.055;c.fillRect(x,y,.7,.7);}c.globalAlpha=1;}
  function notify(msg) {const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2400);}
  function randomSeed(){const words=["amber","quiet","wild","soft","silver","hidden","velvet","little","cloud","moss","distant","blue","sunken","lunar","slow","bright","secret","winter","paper","golden","tender","electric","violet","hollow","drifting","secret","faint","open"];return words[Math.floor(Math.random()*words.length)]+"-"+words[Math.floor(Math.random()*words.length)]+"-"+Math.floor(100+Math.random()*900);}
  function downloadBlob(blob,name){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function slug(){return (state.seed||"moire-art").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"moire-art";}
  function exportPng(){const[w,h]=setCanvasSize(),scale=2;const off=document.createElement("canvas");off.width=w*scale;off.height=h*scale;const c=off.getContext("2d",{alpha:false});c.scale(scale,scale);const token=renderToken;render(c,w,h,state,token);off.toBlob(b=>{if(b){downloadBlob(b,slug()+"-moire.png");notify("Your 2× artwork is ready.");}}, "image/png");}
  function saveArtwork(){const thumb=document.createElement("canvas");thumb.width=360;thumb.height=240;render(thumb.getContext("2d"),360,240,state,renderToken);const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:titleCase(state.seed),recipe:clone(state),thumb:thumb.toDataURL("image/jpeg",.72),savedAt:Date.now()};gallery.unshift(item);gallery=gallery.slice(0,24);persistGallery();paintGallery();notify("Saved to your gallery.");}
  function paintGallery(){const g=$("#gallery");if(!g)return;$("#gallery-count").textContent=gallery.length;$("#clear-gallery").hidden=!gallery.length;if(!gallery.length){g.innerHTML='<div class="gallery-empty"><span>✳</span><p>Your gallery is waiting for its first little wonder.</p><small>Save any artwork to keep it here on this device.</small></div>';return;}g.innerHTML=gallery.map(x=>`<article class="gallery-card"><img src="${x.thumb}" alt="Saved ${escapeHtml(x.title)} artwork" data-load="${x.id}"><div class="gallery-meta"><div><strong>${escapeHtml(x.title)}</strong><small>${new Date(x.savedAt).toLocaleDateString()}</small></div><button data-delete="${x.id}" aria-label="Delete ${escapeHtml(x.title)}">×</button></div></article>`).join("");g.querySelectorAll("[data-load]").forEach(el=>el.onclick=()=>{const item=gallery.find(x=>x.id===el.dataset.load);if(item)restore(item.recipe);window.scrollTo({top:0,behavior:"smooth"});});g.querySelectorAll("[data-delete]").forEach(el=>el.onclick=()=>{gallery=gallery.filter(x=>x.id!==el.dataset.delete);persistGallery();paintGallery();});}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function shareLink(){const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(state))));const url=new URL(location.href);url.searchParams.set("recipe",encoded);navigator.clipboard?.writeText(url.toString()).then(()=>notify("Share link copied.")).catch(()=>notify("Clipboard unavailable. Copy the URL from your address bar."));history.replaceState(null,"",url);}
  function exportRecipe(){downloadBlob(new Blob([JSON.stringify({app:"moire-studio",version:1,recipe:state},null,2)],{type:"application/json"}),slug()+"-recipe.json");notify("Recipe downloaded.");}
  function importRecipe(file){const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result);const recipe=obj.recipe||obj;if(!scenes.some(x=>x[0]===recipe.scene)||!palettes.some(x=>x.id===recipe.palette))throw Error("Recipe is not from Moiré Studio.");restore({...defaults,...recipe});notify("Recipe imported.");}catch(e){notify(e.message||"Could not read that recipe.");}};reader.readAsText(file);}
  function wire(){
    $("#scene").onchange=e=>change({scene:e.target.value});
    $("#density").oninput=e=>{state={...state,density:Number(e.target.value)};$("#density-value").textContent=state.density+"%";persist();draw();};$("#density").onchange=()=>addHistory();
    $("#flow").oninput=e=>{state={...state,flow:Number(e.target.value)};$("#flow-value").textContent=state.flow+"%";persist();draw();};$("#flow").onchange=()=>addHistory();
    $("#seed").oninput=e=>{state={...state,seed:e.target.value||"untitled"};$("#art-title").textContent=titleCase(state.seed).toUpperCase();persist();draw();};$("#seed").onchange=()=>addHistory();
    $("#aspect").onchange=e=>change({aspect:e.target.value});
    $("#randomize").onclick=()=>{const scene=scenes[Math.floor(Math.random()*scenes.length)][0],pal=palettes[Math.floor(Math.random()*palettes.length)].id;change({scene,palette:pal,seed:randomSeed(),density:20+Math.floor(Math.random()*75),flow:Math.floor(Math.random()*100)});notify("A new world, just for you.");};
    $("#seed-shuffle").onclick=()=>change({seed:randomSeed()});$("#save").onclick=saveArtwork;$("#export").onclick=exportPng;
    $("#undo").onclick=()=>{if(historyAt>0){historyAt--;restore(history[historyAt]);}};
    $("#redo").onclick=()=>{if(historyAt<history.length-1){historyAt++;restore(history[historyAt]);}};
    $("#more").onclick=()=>$("#more-menu").hidden=!$("#more-menu").hidden;$("#share").onclick=shareLink;$("#export-json").onclick=exportRecipe;$("#import-open").onclick=()=>$("#import-file").click();$("#import-file").onchange=e=>{if(e.target.files?.[0])importRecipe(e.target.files[0]);e.target.value="";};
    $("#clear-gallery").onclick=()=>{if(confirm("Remove every saved world from this browser?")){gallery=[];persistGallery();paintGallery();}};
    $("#help-open").onclick=()=>$("#help-dialog").showModal();$("#help-close").onclick=()=>$("#help-dialog").close();
    document.addEventListener("click",e=>{if(!e.target.closest(".art-actions"))$("#more-menu").hidden=true;});
    document.addEventListener("keydown",e=>{const el=e.target,typing=el.matches("input,textarea,select");if(e.key==="Escape")$("#more-menu").hidden=true;if(!typing&&e.code==="Space"){e.preventDefault();$("#randomize").click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();(e.shiftKey?$("#redo"):$("#undo")).click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveArtwork();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="e"){e.preventDefault();exportPng();}});
    window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(draw,140);});
  }
  syncControls();if(history.length===0){history=[clone(state)];historyAt=0;}wire();draw();
})();