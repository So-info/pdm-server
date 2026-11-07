(() => {
  const $ = id => document.getElementById(id);
  const state = { catalog: [], currency: '$', payments: ['bank','money'], isAdmin: false, category: 'Toutes', selected: null, pending: null, inFiveM: false };
  const categories = ['Toutes','Compacts','Coupés','Berlines','Sportives','Sportives classiques','Super','Muscle','Tout-terrain','SUV','Vans','Motos'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cash = n => new Intl.NumberFormat('fr-FR').format(Number(n)||0) + ' ' + state.currency;
  const send = (type,payload={}) => window.parent.postMessage({ channel:'PDM_SITE', type, payload }, '*');
  const isFiveM = () => {
    try { return window.parent !== window; } catch(e) { return false; }
  };
  function toast(text) { $('toast').textContent=text; $('toast').classList.add('show'); setTimeout(()=>$('toast').classList.remove('show'),2600); }
  function closeModal(id) { $(id).classList.add('hidden'); }
  function imageFor(v) {
    // Les images officielles peuvent être fournies dans assets/ et reliées au champ image.
    // Les images distantes ne sont pas nécessaires au fonctionnement des achats.
    return v.image || `assets/vehicles/${encodeURIComponent(v.model)}.jpg`;
  }
  function renderCategories() {
    $('categories').innerHTML = categories.map(c=>`<button class="cat-btn ${state.category===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
    $('categories').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{state.category=btn.dataset.category;renderCategories();renderCatalog();}));
  }
  function renderCatalog() {
    const term=$('search').value.trim().toLocaleLowerCase('fr');
    let list=state.catalog.filter(v=>(state.category==='Toutes'||String(v.category||'Autres').toLocaleLowerCase('fr')===state.category.toLocaleLowerCase('fr'))&&(`${v.name} ${v.model} ${v.category}`.toLocaleLowerCase('fr').includes(term)));
    const sort=$('sort').value;
    if(sort==='asc')list.sort((a,b)=>a.price-b.price);
    if(sort==='desc')list.sort((a,b)=>b.price-a.price);
    if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    $('count').textContent=String(state.catalog.length).padStart(2,'0');
    $('grid').innerHTML=list.map((v,i)=>`<article class="car-card" data-model="${esc(v.model)}"><div class="car-image"><span class="car-number">${String(i+1).padStart(2,'0')}</span><span class="car-category">${esc(v.category||'AUTRES')}</span><img loading="lazy" src="${esc(imageFor(v))}" alt="${esc(v.name)}" onerror="this.style.display='none'"></div><div class="car-info"><h3>${esc(v.name)}</h3><div class="car-model">${esc(v.model)}</div><div class="car-bottom"><span class="car-price">${cash(v.price)}</span><span class="discover">DÉCOUVRIR ↗</span></div></div></article>`).join('');
    $('empty').classList.toggle('hidden',list.length>0);
    $('grid').querySelectorAll('.car-card').forEach(card=>card.addEventListener('click',()=>openVehicle(state.catalog.find(v=>v.model===card.dataset.model))));
  }
  function openVehicle(v) {
    if(!v)return;
    state.selected=v;
    $('modalCategory').textContent=(v.category||'COLLECTION').toUpperCase();
    $('modalName').textContent=v.name;
    $('modalModel').textContent=v.model;
    $('modalPrice').textContent=cash(v.price);
    $('modalPhoto').style.backgroundImage=`url("${imageFor(v)}")`;
    $('vehicleModal').classList.remove('hidden');
  }
  function openInvoice() {
    if(!state.selected)return;
    const v=state.selected;
    $('invoiceName').textContent=v.name;
    $('invoiceModel').textContent=v.model;
    $('invoicePrice').textContent=cash(v.price);
    $('invoicePhoto').style.backgroundImage=`url("${imageFor(v)}")`;
    $('buyMessage').textContent='';
    $('vehicleModal').classList.add('hidden');
    $('invoiceModal').classList.remove('hidden');
    document.querySelectorAll('input[name="payment"]').forEach(input=>{
      input.closest('label').classList.toggle('hidden',!state.payments.includes(input.value));
      input.disabled=!state.payments.includes(input.value);
    });
    const first=state.payments.includes('bank')?'bank':'money';
    const radio=document.querySelector(`input[name="payment"][value="${first}"]`);
    if(radio)radio.checked=true;
  }
  function applyCatalog(catalog) {
    state.catalog=Array.isArray(catalog)?catalog:[];
    renderCategories();renderCatalog();
  }
  function showAdmin() {
    if(!state.isAdmin)return;
    send('ADMIN_LIST');
    $('adminModal').classList.remove('hidden');
  }
  function renderAdminList(list) {
    $('adminList').innerHTML=(list||[]).map(v=>`<div class="admin-row"><span>${esc(v.name)} · ${cash(v.price)}</span><button data-delete="${esc(v.model)}">RETIRER</button></div>`).join('');
    $('adminList').querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{
      if(confirm(`Retirer ${btn.dataset.delete} du catalogue SQL ?`))send('ADMIN_DELETE',{model:btn.dataset.delete});
    }));
  }

  $('search').addEventListener('input',renderCatalog);
  $('sort').addEventListener('change',renderCatalog);
  $('orderBtn').addEventListener('click',openInvoice);
  $('payBtn').addEventListener('click',()=>{
    if(!state.selected)return;
    $('payBtn').disabled=true;$('buyMessage').textContent='Vérification de la transaction…';
    send('BUY',{model:state.selected.model,payment:document.querySelector('input[name="payment"]:checked')?.value||'bank'});
  });
  $('closeBtn').addEventListener('click',()=>send('CLOSE'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.inFiveM)send('CLOSE');});
  $('adminAccess').addEventListener('click',showAdmin);
  $('adminForm').addEventListener('submit',e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    send('ADMIN_SAVE',{name:f.get('name'),model:f.get('model'),price:Number(f.get('price')),category:f.get('category')});
    $('adminMessage').textContent='Enregistrement en cours…';
  });
  document.querySelectorAll('[data-dismiss]').forEach(el=>el.addEventListener('click',()=>{
    ['vehicleModal','invoiceModal','adminModal'].forEach(closeModal);
  }));

  window.addEventListener('message',event=>{
    const msg=event.data||{};
    if(msg.channel!=='PDM_FIVEM')return;
    const p=msg.payload||{};
    switch(msg.type){
      case 'BOOTSTRAP':
        state.inFiveM=true;state.currency=p.currency||'$';state.payments=p.payments||['bank','money'];state.isAdmin=p.isAdmin===true;
        applyCatalog(p.catalog||[]);
        $('adminAccess').classList.toggle('hidden',!state.isAdmin);
        break;
      case 'CATALOG_UPDATE':
        applyCatalog(p.catalog||[]);
        toast('Catalogue synchronisé avec le serveur.');
        break;
      case 'BUY_RESULT':
        $('payBtn').disabled=false;
        $('buyMessage').textContent=p.message||'Réponse reçue.';
        $('buyMessage').className='feedback '+(p.ok?'success':'');
        if(p.ok){toast(p.message||'Achat confirmé');setTimeout(()=>closeModal('invoiceModal'),1700);}
        break;
      case 'ADMIN_LIST_RESULT':
        if(p.ok)renderAdminList(p.vehicles);else $('adminMessage').textContent=p.message||'Accès refusé.';
        break;
      case 'ADMIN_ACTION_RESULT':
        $('adminMessage').textContent=p.message||'Action terminée.';
        if(p.ok&&p.vehicles)renderAdminList(p.vehicles);
        $('adminMessage').className='feedback '+(p.ok?'success':'');
        break;
      case 'ERROR':
        $('buyMessage').textContent=p.message||'Erreur de communication.';
        $('payBtn').disabled=false;
        break;
    }
  });

  renderCategories();
  renderCatalog();
  if(isFiveM())send('READY');
  else {
    // Aperçu autonome du site : données de démonstration uniquement.
    state.catalog=[
      {name:'Adder',model:'adder',price:1000000,category:'Super'},
      {name:'Elegy RH8',model:'elegy',price:95000,category:'Sportives'},
      {name:'Banshee',model:'banshee',price:105000,category:'Sportives'},
      {name:'Sultan',model:'sultan',price:85000,category:'Sportives'},
      {name:'Buffalo',model:'buffalo',price:45000,category:'Muscle'}
    ];
    renderCatalog();
  }
})();
