(() => {
  const { recipes, substitutions, sources } = window.RASOI_DATA || {};
  if (!recipes?.length) return;
  const $ = (s, root=document) => root.querySelector(s);
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem("rasoi."+key)) ?? fallback; } catch { return fallback; } };
  const write = (key, val) => { try { localStorage.setItem("rasoi."+key, JSON.stringify(val)); } catch {} };
  const aliases = new Map();
  [["potatoes","potato"],["tomatoes","tomato"],["onions","onion"],["garlic cloves","garlic"],["ginger root","ginger"],["cilantro","fresh cilantro"],["coriander leaves","fresh cilantro"],["coriander leaf","fresh cilantro"],["chickpea flour","besan"],["gram flour","besan"],["chickpeas","dried chickpeas"],["chana","dried chickpeas"],["kidney beans","dried kidney beans"],["rajma","dried kidney beans"],["yoghurt","plain yogurt"],["curd","plain yogurt"],["coriander powder","coriander powder"],["green chillies","green chili"],["chillies","green chili"],["chili","green chili"],["chilli","green chili"],["oil","neutral oil"],["vegetable oil","neutral oil"],["rice","rice"],["basmati rice","rice"],["lemons","lemon"],["limes","lime"],["curry leaf","curry leaves"],["curry leaves","curry leaves"],["spinach leaves","spinach"],["flour","plain flour"],["wheat flour","whole-wheat flour"]].forEach(([a,b])=>aliases.set(norm(a),norm(b)));
  const canon = s => aliases.get(norm(s)) || norm(s);
  const pantry = read("pantry", []);
  let activePantry = [];
  let saved = new Set(read("saved", []));
  let mode = "all", current = null, servings = 4, checks = new Set();
  const pantryInput=$("#pantry-input"), grid=$("#recipe-grid"), dialog=$("#recipe-dialog");
  const toast = msg => { const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove("show"),2400); };
  const pantryTokens = v => [...new Set(String(v).split(/[,;\n]+/).map(x=>canon(x)).filter(Boolean))];
  const ingredientMatch = (item, tokens) => { const name=canon(item.name); return tokens.some(t=>t===name || (t.length>3 && name.includes(t)) || (name.length>3 && t.includes(name))); };
  const score = (r,tokens) => { const needed=r.ingredients.filter(i=>!i.optional); const found=needed.filter(i=>ingredientMatch(i,tokens)); return {found:found.length,total:needed.length,missing:needed.filter(i=>!ingredientMatch(i,tokens)),percent:needed.length?Math.round(found.length/needed.length*100):0}; };
  const dietFacts = r => { const names=r.ingredients.map(i=>norm(i.name)).join(" "); const meat=/\b(chicken|goat|pork|beef|lamb|fish|hilsa|prawn|shrimp|crab|mutton|meat|anchov|seafood)\b/.test(names); const dairy=/\b(ghee|butter|cream|yogurt|milk|paneer|chhena|cheese|curd)\b/.test(names); const egg=/\begg\b/.test(names); return {vegetarian:!meat&&!egg,vegan:!meat&&!egg&&!dairy}; };
  const prepGuidance = r => { const method=r.steps.join(" ").toLowerCase(); const tools=[]; if(/pressure cook/.test(method))tools.push("pressure cooker"); if(/steam/.test(method))tools.push("steamer or covered pot with rack"); if(/skillet|griddle|flat pan/.test(method))tools.push("heavy skillet or griddle"); if(/deep-fry|fry until|frying/.test(method))tools.push("deep, heavy pot and heat-safe draining plate"); if(/blend|grind/.test(method))tools.push("grinder or blender"); if(/bake|oven/.test(method))tools.push("preheated oven and baking tray"); if(!tools.length)tools.push("heavy pot and stirring spoon"); const extra=/soak|ferment|marinat|rest covered/.test(method)?"Some soaking, resting, or fermentation time may be needed beyond the cook-time estimate.":"The cook-time estimate can vary with ingredient size and your stove."; return {tools:[...new Set(tools)].join(" · "),extra}; };
  const pretty = s => String(s).replace(/\b\w/g,m=>m.toUpperCase());
  function updateChips() {
    const box=$("#pantry-chips"); if(!box)return;
    box.innerHTML=activePantry.length?activePantry.map(x=>'<span class="pantry-chip">'+esc(pretty(x))+'</span>').join(""):"";
  }
  function draw() {
    if(!grid)return;
    let list=recipes.filter(r=>{
      const q=norm($("#search").value);
      const hay=norm([r.title,r.region,r.state,r.kind,r.description,...r.ingredients.map(i=>i.name)].join(" "));
      if(q && !hay.includes(q))return false;
      if($("#region-filter").value!=="all"&&r.region!==$("#region-filter").value)return false;
      const diet=$("#diet-filter").value;
      const facts=dietFacts(r);
      if(diet==="vegetarian"&&!facts.vegetarian)return false;
      if(diet==="vegan"&&!facts.vegan)return false;
      if(diet==="nonveg"&&facts.vegetarian)return false;
      const tm=$("#time-filter").value;
      if(tm!=="all"&&r.minutes>=Number(tm))return false;
      if(mode==="saved"&&!saved.has(r.id))return false;
      return true;
    });
    if(mode==="pantry"&&activePantry.length) list.sort((a,b)=>score(b,activePantry).percent-score(a,activePantry).percent || score(b,activePantry).missing.length-score(a,activePantry).missing.length);
    if($("#sort").value==="quick")list.sort((a,b)=>a.minutes-b.minutes);
    if($("#sort").value==="az")list.sort((a,b)=>a.title.localeCompare(b.title));
    $("#results-count").textContent=list.length+" "+(list.length===1?"recipe":"recipes");
    $("#active-message").textContent=mode==="pantry"&&activePantry.length?"Ranked by ingredients you already have · open a card to see what’s missing.":mode==="saved"?"Your saved recipes on this device.":"";
    $("#empty-state").hidden=!!list.length;
    grid.innerHTML=list.map((r,i)=>{
      const sc=activePantry.length?score(r,activePantry):null;
      const percent=sc?'<span class="match-pill">'+(sc.percent===100?"READY NOW":sc.found+"/"+sc.total+" ingredients")+'</span>':"";
      return '<article class="recipe-card" tabindex="0" role="button" data-open="'+esc(r.id)+'"><div class="recipe-art art-'+(i%6)+'" data-image-slot="'+esc(r.id)+'"><span class="recipe-region">'+esc(r.region.toUpperCase())+' · '+esc(r.state.toUpperCase())+'</span><button class="heart '+(saved.has(r.id)?"is-saved":"")+'" data-save="'+esc(r.id)+'" aria-label="'+(saved.has(r.id)?"Remove from":"Save")+' favourites">'+(saved.has(r.id)?"♥":"♡")+'</button><span class="dish-initial">'+esc(r.title.slice(0,1))+'</span></div><div class="recipe-card-body"><div class="recipe-meta"><span>'+esc(r.kind.toUpperCase())+'</span><span>'+r.minutes+' MIN</span></div><h3>'+esc(r.title)+'</h3><p>'+esc(r.description)+'</p><div class="card-bottom">'+percent+'<span>'+ (dietFacts(r).vegan?"VEGAN":dietFacts(r).vegetarian?"VEGETARIAN":"CONTAINS MEAT / FISH")+'</span><b>↗</b></div></div></article>';
    }).join("");
    hydrateCardPhotos(list);
  }
  // Version 4 intentionally discards the old fuzzy matches saved by earlier releases.
  const photoCache = read("photos-v6", {});
  const photoPending = new Map();
  function rememberPhotos(){write("photos-v6",photoCache);}
  function showPhoto(slot, photo, dish){
    if(!slot||!photo?.thumb)return;
    slot.classList.add("has-photo");
    let img=slot.querySelector(".food-photo");
    if(!img){img=document.createElement("img");img.className="food-photo";img.loading="lazy";slot.appendChild(img);}
    img.alt="Dish photo of "+dish;
    img.src=photo.thumb;
    img.onerror=()=>{slot.classList.remove("has-photo");img.remove();};
    let credit=slot.querySelector(".photo-credit");
    if(!credit){credit=document.createElement("a");credit.className="photo-credit";credit.target="_blank";credit.rel="noreferrer";slot.appendChild(credit);}
    credit.href=photo.page;credit.textContent="Photo: Wikimedia Commons · "+(photo.license||"see source");
  }
  async function findPhoto(recipe){
    if(Object.prototype.hasOwnProperty.call(photoCache,recipe.id))return photoCache[recipe.id];
    if(photoPending.has(recipe.id))return photoPending.get(recipe.id);
    const task=(async()=>{
      try{
        const curatedFiles={chole:"File:Chickpea Curry - Kolkata 2011-03-05 1910.JPG","sarson-saag":"File:Sarson da saag.JPG"};
        const curatedFile=curatedFiles[recipe.id];
        const query=encodeURIComponent('filetype:bitmap "'+recipe.title+'"');
        const endpoint=curatedFile
          ?'https://commons.wikimedia.org/w/api.php?action=query&titles='+encodeURIComponent(curatedFile)+'&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json&origin=*'
          :'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+query+'&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json&origin=*';
        const response=await fetch(endpoint);
        if(!response.ok)throw new Error("Photo search unavailable");
        const json=await response.json();
        const ignored=new Set("indian india north south east west central northeast punjabi assamese bengali odia odisha kerala kashmiri gujarati rajasthani maharashtrian mumbai goan tamil karnataka manipuri mizo naga nagaland bihar bihari andhra telangana telugu tripuri meghalaya meghalayan arunachal uttar pradesh madhya pradesh with from style food dish recipe traditional".split(" "));
        const placeNames=["jammu","kashmir","punjab","himachal","uttarakhand","haryana","delhi","uttar pradesh","rajasthan","gujarat","maharashtra","goa","madhya pradesh","chhattisgarh","bihar","jharkhand","odisha","west bengal","sikkim","assam","arunachal pradesh","nagaland","manipur","mizoram","tripura","meghalaya","telangana","andhra pradesh","tamil nadu","kerala","karnataka"];
        const wanted=norm(recipe.title).split(" ").filter(t=>t.length>2&&!ignored.has(t));
        const recipePlaces=norm(recipe.state+" "+recipe.region);
        const pages=Object.values(json.query?.pages||{});
        const match=pages.find(page=>{
          const filename=norm((page.title||"").replace(/^file\s/,""));
          if(!curatedFile&&(!wanted.length||!wanted.every(t=>filename.split(" ").includes(t))))return false;
          const imagePlaces=placeNames.filter(place=>filename.includes(place));
          if(imagePlaces.length&&!imagePlaces.some(place=>recipePlaces.includes(place)))return false;
          return !!page.imageinfo?.[0]?.thumburl;
        });
        const info=match?.imageinfo?.[0];
        if(!info?.thumburl){photoCache[recipe.id]=null;rememberPhotos();return null;}
        const license=(info.extmetadata?.LicenseShortName?.value||"").replace(/<[^>]*>/g,"").trim();
        const title=match.title||"";
        const photo={thumb:info.thumburl,page:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(title.replace(/ /g,"_")),license};
        photoCache[recipe.id]=photo;rememberPhotos();return photo;
      }catch{photoCache[recipe.id]=null;rememberPhotos();return null;}
    })();
    photoPending.set(recipe.id,task);
    const result=await task;photoPending.delete(recipe.id);return result;
  }
  function hydrateCardPhotos(list){
    const slots=[...grid.querySelectorAll("[data-image-slot]")];
    const observer=window.IntersectionObserver?new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      observer.unobserve(entry.target);
      const recipe=recipes.find(r=>r.id===entry.target.dataset.imageSlot);
      if(!recipe)return;
      if(photoCache[recipe.id])showPhoto(entry.target,photoCache[recipe.id],recipe.title);
      else findPhoto(recipe).then(photo=>showPhoto(entry.target,photo,recipe.title));
    }),{rootMargin:"240px"}):null;
    slots.forEach(slot=>{
      const recipe=recipes.find(r=>r.id===slot.dataset.imageSlot);
      if(!recipe)return;
      if(photoCache[recipe.id])showPhoto(slot,photoCache[recipe.id],recipe.title);
      else if(observer)observer.observe(slot);
      else findPhoto(recipe).then(photo=>showPhoto(slot,photo,recipe.title));
    });
  }
  function showRecipe(id) {
    const r=recipes.find(x=>x.id===id); if(!r)return; current=r; servings=r.serves; checks=new Set(); renderDetail(); dialog.showModal();
  }
  function renderDetail() {
    const r=current; if(!r)return;
    const prep=prepGuidance(r);
    const ingredientRows=r.ingredients.map((i,n)=>{
      const qty=i.qty*servings/r.serves;
      const amount=Number.isInteger(qty)?qty:(Math.round(qty*10)/10);
      const unit=i.unit||"";
      const alternatives=substitutions[norm(i.name)]||[];
      const opt=i.optional?" · optional":"";
      return '<li class="detail-ingredient"><label><input type="checkbox" data-check="'+n+'" '+(checks.has("i"+n)?"checked":"")+'> <span><strong>'+esc(amount+' '+unit+' '+i.name)+'</strong><small>'+esc(opt.trim()||"")+'</small></span></label>'+(alternatives.length?'<details class="swap"><summary>Swap options</summary><div>'+alternatives.map(a=>'<p><b>'+esc(a.name)+'</b> · '+esc(a.ratio)+' <span class="swap-level level-'+esc(a.level)+'">'+esc(a.level==="no-direct"?"NO DIRECT SWAP":a.level.toUpperCase())+'</span><br><small>'+esc(a.note)+'</small></p>').join("")+'</div></details>':'<details class="swap"><summary>No dependable swap reviewed</summary><div><p><b>No direct replacement listed</b> <span class="swap-level level-no-direct">NO DIRECT SWAP</span><br><small>For this recipe, leaving it out or choosing another dish may be more reliable. Omitting it can change the flavour or texture. Do not use an alternative for allergy-sensitive cooking without checking labels and cross-contact.</small></p></div></details>')+'</li>';
    }).join("");
    $("#recipe-detail").innerHTML='<div class="detail-photo-slot" data-image-slot="'+esc(r.id)+'"></div><div class="detail-hero"><p class="eyebrow">'+esc(r.region.toUpperCase())+' · '+esc(r.state.toUpperCase())+' · '+r.minutes+' MIN</p><h2>'+esc(r.title)+'</h2><p>'+esc(r.description)+'</p><div class="detail-tools"><label>Serves <button type="button" data-servings="-1" aria-label="Fewer servings">−</button> <b>'+servings+'</b> <button type="button" data-servings="1" aria-label="More servings">+</button></label><button type="button" class="button button-outline" id="print-recipe">Print recipe</button><button type="button" class="button button-outline" id="save-detail">'+(saved.has(r.id)?"♥ Saved":"♡ Save recipe")+'</button></div></div><aside class="prep-panel"><b>BEFORE YOU BEGIN</b><p>Read the full method first, measure the ingredients, and prepare the items mentioned in the steps.</p><p><strong>Useful equipment:</strong> '+esc(prep.tools)+'</p><p>'+esc(prep.extra)+'</p></aside><div class="detail-columns"><section><h3>Gather your ingredients</h3><ul class="ingredient-list">'+ingredientRows+'</ul><p class="allergy-note">Swap notes are cooking guidance, not allergy advice. Check labels and prevent cross-contact.</p></section><section><div class="steps-heading"><h3>Cook it, step by step</h3><span id="steps-progress">0 / '+r.steps.length+' done</span></div><ol class="step-list">'+r.steps.map((s,n)=>'<li><label><input type="checkbox" data-step="'+n+'" '+(checks.has("s"+n)?"checked":"")+'> <span>'+esc(s)+'</span></label></li>').join("")+'</ol>'+(r.tips?'<aside class="recipe-tip"><b>KITCHEN NOTE</b><p>'+esc(r.tips)+'</p></aside>':"")+'</section></div><div class="source-note"><b>About this version</b><p>Recipes in this growing atlas are practical home-kitchen interpretations. Methods and ingredient choices vary between families and regions; use the linked references as a starting point.</p><div>'+sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noreferrer">'+esc(s.label)+' ↗</a>').join("")+'</div></div>';
    const detailPhoto=$("#recipe-detail .detail-photo-slot");
    if(photoCache[r.id])showPhoto(detailPhoto,photoCache[r.id],r.title);
    else findPhoto(r).then(photo=>showPhoto(detailPhoto,photo,r.title));
    $("#recipe-detail").querySelectorAll("[data-servings]").forEach(b=>b.onclick=()=>{servings=Math.max(1,Math.min(20,servings+Number(b.dataset.servings)));renderDetail()});
    $("#recipe-detail").querySelectorAll("[data-check]").forEach(b=>b.onchange=()=>{b.checked?checks.add("i"+b.dataset.check):checks.delete("i"+b.dataset.check)});
    const stepBoxes=[...$("#recipe-detail").querySelectorAll("[data-step]")];
    const updateProgress=()=>{const done=stepBoxes.filter(x=>x.checked).length;$("#steps-progress").textContent=done+" / "+stepBoxes.length+" done";};
    stepBoxes.forEach(b=>b.onchange=()=>{b.checked?checks.add("s"+b.dataset.step):checks.delete("s"+b.dataset.step);updateProgress();});updateProgress();
    $("#print-recipe").onclick=()=>window.print();
    $("#save-detail").onclick=()=>toggleSaved(r.id);
  }
  function toggleSaved(id){if(saved.has(id))saved.delete(id);else saved.add(id);saved=[...saved];write("saved",saved);saved=new Set(saved);$("#saved-count").textContent=saved.size;draw();if(current?.id===id)$("#save-detail").textContent=saved.has(id)?"♥ Saved":"♡ Save recipe";}
  function runPantry(){activePantry=pantryTokens(pantryInput.value);write("pantry",activePantry);mode="pantry";updateChips();draw();$("#discover").scrollIntoView({behavior:"smooth"});if(!activePantry.length)toast("Add a few ingredients first.");}
  $("#find-pantry").onclick=runPantry;
  $("#pantry-clear").onclick=()=>{pantryInput.value="";activePantry=[];mode="all";write("pantry",[]);updateChips();draw();};
  pantryInput.value=pantry.join(", ");
  ["search","region-filter","diet-filter","time-filter","sort"].forEach(id=>$("#"+id).addEventListener(id==="search"?"input":"change",()=>{mode=mode==="saved"?"saved":"all";draw()}));
  $("#clear-filters").onclick=()=>{$("#search").value="";$("#region-filter").value="all";$("#diet-filter").value="all";$("#time-filter").value="all";$("#sort").value="featured";mode="all";activePantry=[];updateChips();draw()};
  $("#empty-reset").onclick=$("#clear-filters").onclick;
  $("#saved-link").onclick=()=>{mode=mode==="saved"?"all":"saved";$("#discover").scrollIntoView({behavior:"smooth"});draw();};
  grid.addEventListener("click",e=>{if(e.target.closest("a.photo-credit"))return;const fave=e.target.closest("[data-save]");if(fave){e.stopPropagation();toggleSaved(fave.dataset.save);return}const card=e.target.closest("[data-open]");if(card)showRecipe(card.dataset.open);});
  grid.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-open]")){e.preventDefault();showRecipe(e.target.dataset.open)}});
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  $("#saved-count").textContent=saved.size;
  const count=$(".hero-foot span"); if(count)count.textContent=recipes.length+" RECIPES TO BEGIN WITH";
  updateChips(); draw();
})();