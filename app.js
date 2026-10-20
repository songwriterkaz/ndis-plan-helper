(function(){
const K='cbPlanHelper',$=s=>document.querySelector(s),app=$('#app');
let editing=false,db=JSON.parse(localStorage.getItem(K)||'{"profiles":[],"prefs":{}}'),cur=null,tab='home',draft={};
const save=()=>localStorage.setItem(K,JSON.stringify(db));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>Math.random().toString(36).slice(2,10);
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function hash(pin,salt){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pin));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const money=n=>'$'+(+n||0).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);
const L=(href,label,cls='',hint='')=>`<a class="btn big ${cls}" href="${href}" ${href.startsWith('tel:')?'':'target="_blank" rel="noopener"'}>${label}${hint?`<small>${hint}</small>`:''}</a>`;
const NDISP='https://ciam.ndis.gov.au/am/XUI/?realm=/alpha&amp;iss=https%3A%2F%2Flogin.my.gov.au#/',MYGOV='https://my.gov.au/';
const official=()=>`<div class="tiles2">${L(NDISP,'Sign in to my NDIS portal','primary wide','Official NDIS sign-in through myGov')}
 ${L(MYGOV,'Open myGov','primary')}${L(MYGOV,'Sign in with Digital ID (myID)')}${L(MYGOV,'Sign in to myGov with a passkey')}${L('https://www.myid.gov.au/','Get a Digital ID (myID)')}
 ${L('https://www.ndis.gov.au/participants/using-your-funding/using-portal-and-app/how-use-my-ndis-app','Open NDIS app info')}</div>
 <p class="hint">These open the official websites in a new tab. This tool never asks for your myGov, myID or NDIS details.</p>`;
const SERVICES=[['NDIS',[[NDISP,'NDIS participant portal sign-in'],['https://www.ndis.gov.au/','NDIS website'],['https://www.ndis.gov.au/participants/using-your-funding/using-portal-and-app/how-use-my-ndis-app','my NDIS app info'],['https://www.ndis.gov.au/participants/using-your-funding/understanding-your-ndis-funding/guide-using-your-funding','Using your plan'],['https://www.ndis.gov.au/participants/using-your-funding/self-managed-funding/how-self-manage-your-funding','Making claims (self-managed)'],['https://www.ndis.gov.au/participants/working-providers/finding-providers/provider-finder','Find a registered provider']]],
 ['Contact and help',[['tel:1800800110','Call the NDIS','1800 800 110'],['https://www.ndis.gov.au/contact','Contact the NDIS online'],['https://www.accesshub.gov.au/about-the-nrs','National Relay Service','For people who are deaf or have trouble hearing or speaking']]],
 ['Changes, reviews and complaints',[['https://www.ndis.gov.au/participants/changing-your-plan/ways-change-your-plan','Change your plan or situation'],['https://www.ndis.gov.au/participants/changing-your-plan/types-plan-changes','Plan reassessments and plan changes'],['https://www.ndis.gov.au/participants/changing-your-plan/decision-reviews','Reviews and appeals'],['https://www.ndiscommission.gov.au/complaints','NDIS Commission complaints'],['tel:1800035544','Call the NDIS Commission','1800 035 544']]],
 ['Other government services',[[MYGOV,'myGov'],['https://www.servicesaustralia.gov.au/medicare','Medicare'],['https://www.servicesaustralia.gov.au/centrelink','Centrelink'],['https://www.carergateway.gov.au/','Carer Gateway','Support for carers'],['https://www.disabilitygateway.gov.au/','Disability Gateway']]]];
function prefs(){document.body.classList.toggle('large',!!db.prefs.large);document.body.classList.toggle('contrast',!!db.prefs.contrast);$('#tLarge').setAttribute('aria-pressed',!!db.prefs.large);$('#tContrast').setAttribute('aria-pressed',!!db.prefs.contrast)}
$('#tLarge').onclick=()=>{db.prefs.large=!db.prefs.large;save();prefs()};
$('#tContrast').onclick=()=>{db.prefs.contrast=!db.prefs.contrast;save();prefs()};
$('#logout').onclick=()=>{delete db.prefs.stay;save();cur=null;start()};
const canPasskey=()=>!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);
function blank(name){return{id:id(),name,passkeys:[],plan:{ndis:'',start:'',end:'',manager:'Plan managed',goals:''},budgets:[{id:id(),cat:'Core',amt:0,spends:[]},{id:id(),cat:'Capacity Building',amt:0,spends:[]},{id:id(),cat:'Capital',amt:0,spends:[]}],providers:[],appts:[],notes:[],docs:[]}}
const render=h=>{app.innerHTML=h;window.scrollTo(0,0);const f=app.querySelector('[autofocus]');f&&f.focus()};
function start(){$('#logout').hidden=true;
 if(db.prefs.stay){cur=db.profiles.find(p=>p.id===db.prefs.stay);if(cur){tab='home';return dash()}}
 render(`<section class="card"><h1>Official NDIS sign-in</h1>${official()}</section>
 <section class="card"><h1>Coffeebreak Plan Helper</h1><p class="hint">Keep your plan, budgets and appointments in one place. Tap your name to start.</p>
 <div class="tiles">${db.profiles.map(p=>`<button class="tile" data-p="${p.id}"><span class="ico" aria-hidden="true">&#128100;</span>${esc(p.name)}</button>`).join('')}
 <button class="tile primary" id="newp"><span class="ico" aria-hidden="true">&#10133;</span>New profile</button></div>
 ${db.profiles.some(p=>p.passkeys&&p.passkeys.length)&&canPasskey()?`<button class="btn big wide" id="pk">Sign in with passkey<small>Face ID, fingerprint or phone</small></button><p class="msg" id="m" role="status"></p>`:''}</section>
 <section class="card"><h2>Moving to a new device</h2><label class="btn big">Restore from backup file<input type="file" id="imp" accept=".json,application/json" class="sr"></label></section>`);
 app.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>pinScreen(db.profiles.find(p=>p.id===b.dataset.p)));
 $('#newp').onclick=()=>{draft={};setup(1)};$('#imp').onchange=imp;const pk=$('#pk');if(pk)pk.onclick=()=>passkeyLogin()}
async function passkeyLogin(only){const m=$('#m');try{const ids=(only?[only]:db.profiles).flatMap(p=>p.passkeys||[]);
 const c=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),userVerification:'required',timeout:60000,allowCredentials:ids.map(i=>({type:'public-key',id:unb64(i)}))}});
 const cid=b64(c.rawId),p=db.profiles.find(p=>(p.passkeys||[]).includes(cid));if(!p)throw new Error('none');cur=p;tab='home';dash()}
 catch(e){if(m)m.textContent='Passkey sign-in did not finish. You can use your PIN instead.'}}
async function makePasskey(p){const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Coffeebreak Plan Helper'},
 user:{id:new TextEncoder().encode(p.id),name:p.name,displayName:p.name},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
 authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000}});
 p.passkeys=p.passkeys||[];p.passkeys.push(b64(c.rawId));save()}
const steps=n=>`<p class="step">Step ${n} of 3</p>`;
function setup(n){const back=`<button type="button" class="btn big" id="bk">Back</button>`;
 if(n===1){render(`<section class="card">${steps(1)}<h1>What is your name</h1><p class="hint">This is just so you can find your profile. A first name is fine. If you look after someone, use their name.</p>
  <form id="f"><input id="nm" class="huge" required autocomplete="off" autofocus value="${esc(draft.name||'')}" aria-label="Name"><p class="msg" id="m" role="status"></p><div class="actions">${back}<button class="btn big primary">Next</button></div></form></section>`);
  $('#bk').onclick=start;$('#f').onsubmit=e=>{e.preventDefault();draft.name=$('#nm').value.trim();if(!draft.name)return;setup(2)}}
 if(n===2){render(`<section class="card">${steps(2)}<h1>Choose a 4-number PIN</h1><p class="hint">Pick 4 numbers you will remember, like 2580. You will use them to open your profile.</p>
  <form id="f"><label>PIN<input id="pin" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required type="password" autofocus></label>
  <label>Type it again<input id="pin2" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required type="password"></label>
  <p class="msg" id="m" role="status"></p><div class="actions">${back}<button class="btn big primary">Next</button></div></form></section>`);
  $('#bk').onclick=()=>setup(1);$('#f').onsubmit=async e=>{e.preventDefault();const a=$('#pin').value,b=$('#pin2').value;
   if(!/^\d{4}$/.test(a))return $('#m').textContent='The PIN needs exactly 4 numbers.';if(a!==b)return $('#m').textContent='Those two PINs are different. Please type them again.';
   const p=blank(draft.name);p.salt=id()+id();p.pinHash=await hash(a,p.salt);db.profiles.push(p);save();cur=p;setup(3)}}
 if(n===3){render(`<section class="card">${steps(3)}<h1>Faster sign-in (optional)</h1><p class="hint">A passkey lets you open your profile with Face ID, a fingerprint or your phone lock instead of typing your PIN. Your PIN still works.</p>
  ${canPasskey()?`<div class="actions"><button class="btn big primary" id="mk">Set up passkey sign-in</button>`:'<p class="hint">This device or browser does not support passkeys. That is fine, your PIN works.</p><div class="actions">'}<button class="btn big" id="skip">${canPasskey()?'Skip for now':'Finish'}</button></div>
  <label class="check"><input type="checkbox" id="stay"> Stay signed in on this device</label><p class="msg" id="m" role="status"></p></section>`);
  const fin=()=>{if($('#stay').checked){db.prefs.stay=cur.id;save()}tab='home';dash()};
  $('#skip').onclick=fin;const mk=$('#mk');if(mk)mk.onclick=async()=>{try{await makePasskey(cur);fin()}catch(e){$('#m').textContent='The passkey was not set up. You can try again later from Home.'}}}}
function choosePin(p){render(`<section class="card"><h1>Hello ${esc(p.name)}</h1><h2>Choose your PIN</h2><p class="hint">This profile was restored from a backup and has no PIN yet. Pick 4 numbers you will remember.</p>
 <form id="f"><label>PIN<input id="pin" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required type="password" autofocus></label>
 <label>Type it again<input id="pin2" class="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required type="password"></label>
 <p class="msg" id="m" role="status"></p><div class="actions"><button type="button" class="btn big" id="bk">Back</button><button class="btn big primary">Save PIN and sign in</button></div></form></section>`);
 $('#bk').onclick=start;$('#f').onsubmit=async e=>{e.preventDefault();const a=$('#pin').value,b=$('#pin2').value;
  if(!/^\d{4}$/.test(a))return $('#m').textContent='The PIN needs exactly 4 numbers.';if(a!==b)return $('#m').textContent='Those two PINs are different. Please type them again.';
  p.salt=id()+id();p.pinHash=await hash(a,p.salt);save();cur=p;tab='home';dash()}}
function pinScreen(p){if(!p.pinHash)return choosePin(p);render(`<section class="card"><h1>Hello ${esc(p.name)}</h1>
 ${(p.passkeys||[]).length&&canPasskey()?`<button class="btn big primary wide" id="pk">Sign in with passkey<small>Face ID, fingerprint or phone</small></button><p class="hint center">or type your PIN</p>`:''}
 <form id="f"><label>Your 4-number PIN<input id="pin" class="pin" inputmode="numeric" maxlength="4" type="password" required autofocus></label>
 <label class="check"><input type="checkbox" id="stay"> Stay signed in on this device</label><p class="msg" id="m" role="status"></p>
 <div class="actions"><button type="button" class="btn big" id="bk">Back</button><button class="btn big primary">Sign in</button></div></form></section>`);
 $('#bk').onclick=start;const pk=$('#pk');if(pk)pk.onclick=()=>passkeyLogin(p);
 $('#f').onsubmit=async e=>{e.preventDefault();if(await hash($('#pin').value,p.salt)!==p.pinHash){$('#m').textContent='That PIN did not match. Please try again.';$('#pin').value='';return}
  if($('#stay').checked)db.prefs.stay=p.id;save();cur=p;tab='home';dash()}}
const TILES=[['ndis','&#128273;','Sign in to NDIS'],['services','&#127963;','NDIS Services'],['addspend','&#128176;','Add spend'],['plan','&#128203;','My Plan'],['budgets','&#128202;','Budgets'],['appts','&#128197;','Appointments'],['providers','&#128222;','Contacts'],['notes','&#128221;','Notes'],['docs','&#128193;','Documents'],['backup','&#128190;','Backup']];
const homeBtn=t=>`<div class="top"><button class="btn big" data-t="home">&#8592; Home</button><h1>${t}</h1></div>`;
function dash(){$('#logout').hidden=false;render(V[tab]());app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;dash()});bind[tab]&&bind[tab]()}
const spent=b=>b.spends.reduce((s,x)=>s+(+x.amt||0),0);
const bar=b=>{const pc=b.amt?Math.min(100,spent(b)/b.amt*100):0;return`<div class="bar" role="progressbar" aria-valuenow="${pc|0}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(b.cat)} used"><i class="${spent(b)>b.amt?'over':''}" style="width:${pc}%"></i></div><p class="small">${money(spent(b))} used of ${money(b.amt)}<br>${money(b.amt-spent(b))} left</p>`};
const V={
home:()=>{const up=cur.appts.filter(a=>a.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,3);
 return`<h1>Hi ${esc(cur.name)}</h1>
 ${!(cur.passkeys||[]).length&&canPasskey()&&!cur.pkDismissed?`<section class="card note"><p>Want to sign in with Face ID, fingerprint or phone next time</p><div class="actions"><button class="btn big primary" id="mk">Set up passkey sign-in</button><button class="btn big" id="nopk">No thanks</button></div><p class="msg" id="m" role="status"></p></section>`:''}
 <div class="tiles">${TILES.map(([k,i,l])=>k==='ndis'?`<a class="tile primary" href="${NDISP}" target="_blank" rel="noopener"><span class="ico" aria-hidden="true">${i}</span>${l}</a>`:`<button class="tile${k==='addspend'?' accent':''}" data-t="${k}"><span class="ico" aria-hidden="true">${i}</span>${l}</button>`).join('')}</div>
 <section class="card"><h2>Budgets</h2><div class="grid">${cur.budgets.map(b=>`<div><h3>${esc(b.cat)}</h3>${bar(b)}</div>`).join('')}</div></section>
 <section class="card"><h2>Coming up</h2>${up.length?'<ul class="list">'+up.map(a=>`<li>${esc(a.date)} ${esc(a.time)} - ${esc(a.title)}</li>`).join('')+'</ul>':'<p>No appointments yet.</p>'}</section>
 <section class="card"><h2>Official sign-in links</h2>${official()}</section>`},
services:()=>{const d=cur.details||{},F=[['fullName','Name',d.fullName||cur.name],['ndis','NDIS number',cur.plan.ndis],['dob','Date of birth',d.dob],['phone','Phone',d.phone],['email','Email',d.email],['planDates','Plan dates',cur.plan.start||cur.plan.end?`${cur.plan.start||'?'} to ${cur.plan.end||'?'}`:'',1],['manager','How the plan is managed',cur.plan.manager,1],['planManagerName','Plan manager',d.planManagerName],['ndisContact','My NDIS contact',d.ndisContact],['myidEmail','Digital ID (myID) email',d.myidEmail],['myidStrength','Digital ID strength',d.myidStrength]];
 return`${homeBtn('NDIS Services')}<section class="card note" id="details"><h2>My details</h2><p class="hint">Copy these when a form asks for them.</p>
 ${editing?`<form id="df"><p class="hint">Plan dates and how the plan is managed are changed on the My Plan page.</p>${F.filter(f=>!f[3]).map(([k,l,v])=>k==='myidStrength'?`<label>${l}<select name="${k}">${['','Basic','Standard','Strong'].map(o=>`<option ${o===(v||'')?'selected':''} value="${o}">${o||'Not set'}</option>`).join('')}</select></label>`:`<label>${l}<input name="${k}" value="${esc(v||'')}" type="${k.includes('mail')?'email':k==='phone'?'tel':'text'}" ${k==='ndis'?'inputmode="numeric"':''}></label>`).join('')}<div class="actions"><button type="button" class="btn big" id="dcancel">Cancel</button><button class="btn big primary">Save</button></div></form>`
 :`<ul class="list">${F.map(([k,l,v])=>`<li><span><span class="hint">${l}</span><b>${esc(v||'Not added')}</b></span>${v?`<button class="btn big" data-copy="${esc(v)}" aria-label="Copy ${l}">Copy</button>`:''}</li>`).join('')}</ul><button class="btn big wide" id="dedit">Edit my details</button>`}
 <p class="msg" id="m" role="status"></p><div class="tiles2" style="margin-top:12px">${L(NDISP,'Sign in to my NDIS portal','primary')}${L(MYGOV,'Sign in with Digital ID (myID)','primary')}</div>
 <p class="hint">Passwords and codes are never saved here.</p></section><p class="hint">Official services. Each one opens in a new tab. Phone buttons call straight away on a phone.</p>${SERVICES.map(([g,ls])=>`<section class="card"><h2>${g}</h2><div class="tiles2">${ls.map(([h,l,s])=>L(h,l,h.startsWith('tel:')?'primary':'',s||'')).join('')}</div></section>`).join('')}`},
plan:()=>`${homeBtn('My Plan')}<section class="card"><form id="f"><label>NDIS number<span class="hint">9 numbers, on your plan or NDIS letters</span><input id="ndis" inputmode="numeric" value="${esc(cur.plan.ndis)}"></label>
 <div class="grid"><label>Plan start date<input type="date" id="st" value="${esc(cur.plan.start)}"></label><label>Plan end date<input type="date" id="en" value="${esc(cur.plan.end)}"></label></div>
 <label>How the plan is managed<select id="mg">${['','Self managed','Plan managed','NDIA managed','A mix'].map(o=>`<option value="${o}" ${o===cur.plan.manager?'selected':''}>${o||'Not set'}</option>`).join('')}</select></label>
 <label>My goals<span class="hint">One goal per line is easiest</span><textarea id="gl" rows="5">${esc(cur.plan.goals)}</textarea></label><p class="msg" id="m" role="status"></p><button class="btn big primary wide">Save</button></form></section>`,
addspend:()=>`${homeBtn('Add spend')}<section class="card"><form id="f"><label>Which budget<select id="bg">${cur.budgets.map(b=>`<option value="${b.id}">${esc(b.cat)}</option>`).join('')}</select></label>
 <label>Date<input type="date" id="dt" value="${today}"></label><label>What it was for<input id="wh" required placeholder="For example, support worker"></label>
 <label>Amount in dollars<input id="am" type="number" inputmode="decimal" step="0.01" min="0" required placeholder="0.00"></label><button class="btn big primary wide">Save</button></form></section>`,
budgets:()=>`${homeBtn('Budgets')}<button class="btn big primary wide" data-t="addspend">Add spend</button>${cur.budgets.map(b=>`<section class="card"><h2>${esc(b.cat)}</h2>${bar(b)}<form data-amt="${b.id}"><label>Total budget in dollars<input type="number" inputmode="decimal" step="0.01" min="0" value="${b.amt}"></label><button class="btn big">Save total</button></form>
 <ul class="list">${b.spends.slice().reverse().map(s=>`<li><span>${esc(s.date)} ${esc(s.what)}<br><b>${money(s.amt)}</b></span><button class="btn" data-del="${b.id}:${s.id}">Remove</button></li>`).join('')||'<li>No spending yet.</li>'}</ul></section>`).join('')}`,
backup:()=>`${homeBtn('Backup')}<section class="card"><p class="hint">Everything is saved on this device only. Save a backup file now and then, and keep it somewhere safe like your email or cloud drive.</p><div class="actions"><button class="btn big primary" id="exp">Save backup file</button><label class="btn big">Restore backup<input type="file" id="imp" accept=".json,application/json" class="sr"></label></div></section>
 <section class="card"><h2>Passkey sign-in</h2><p class="hint">${(cur.passkeys||[]).length?`You have ${cur.passkeys.length} passkey set up.`:'No passkey yet.'}</p>${canPasskey()?`<button class="btn big" id="mk">Set up passkey sign-in</button>`:'<p class="hint">Not supported on this device.</p>'}<p class="msg" id="m" role="status"></p></section>`
};
const simple={providers:['Contacts and providers',[['name','Name'],['role','What they do'],['phone','Phone','tel'],['email','Email','email']]],
 appts:['Appointments',[['date','Date','date'],['time','Time','time'],['title','What it is'],['where','Where']]],
 notes:['Notes',[['date','Date','date'],['text','Note','area']]],
 docs:['Documents',[['name','Document name'],['link','Link (web address)','url']]]};
const mkBind=()=>{const mk=$('#mk');if(mk)mk.onclick=async()=>{try{await makePasskey(cur);$('#m').textContent='Passkey sign-in is set up.';setTimeout(dash,900)}catch(e){$('#m').textContent='The passkey was not set up. Please try again.'}}};
const bind={services:()=>{app.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);$('#m').textContent='Copied.'}catch(e){$('#m').textContent='Could not copy. Press and hold the text to copy it.'}});
 const de=$('#dedit');if(de)de.onclick=()=>{editing=true;dash()};const dc=$('#dcancel');if(dc)dc.onclick=()=>{editing=false;dash()};
 const df=$('#df');if(df)df.onsubmit=e=>{e.preventDefault();const el=df.elements;cur.details=cur.details||{};['fullName','dob','phone','email','planManagerName','ndisContact','myidEmail','myidStrength'].forEach(k=>cur.details[k]=el[k].value.trim());cur.plan.ndis=el.ndis.value.trim();save();editing=false;dash();$('#m').textContent='Saved.'}},
home:()=>{mkBind();const n=$('#nopk');if(n)n.onclick=()=>{cur.pkDismissed=true;save();dash()}},
plan:()=>{$('#f').onsubmit=e=>{e.preventDefault();Object.assign(cur.plan,{ndis:$('#ndis').value.trim(),start:$('#st').value,end:$('#en').value,manager:$('#mg').value,goals:$('#gl').value});save();$('#m').textContent='Saved.'}},
addspend:()=>{$('#f').onsubmit=e=>{e.preventDefault();cur.budgets.find(b=>b.id===$('#bg').value).spends.push({id:id(),date:$('#dt').value,what:$('#wh').value.trim(),amt:+$('#am').value||0});save();tab='budgets';dash()}},
budgets:()=>{app.querySelectorAll('[data-amt]').forEach(f=>f.onsubmit=e=>{e.preventDefault();cur.budgets.find(b=>b.id===f.dataset.amt).amt=+f.querySelector('input').value||0;save();dash()});
 app.querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>{if(!confirm('Remove this spend'))return;const[b,s]=x.dataset.del.split(':');const B=cur.budgets.find(q=>q.id===b);B.spends=B.spends.filter(q=>q.id!==s);save();dash()})},
backup:()=>{mkBind();$('#exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,1)],{type:'application/json'}));a.download='coffeebreak-plan-backup-'+today+'.json';a.click()};$('#imp').onchange=imp}};
Object.entries(simple).forEach(([k,[title,fields]])=>{
 V[k]=()=>{const items=[...cur[k]].sort((a,b)=>String(b.date||'').localeCompare(a.date||''));return`${homeBtn(title)}<section class="card"><h2>Add new</h2><form id="f">${fields.map(([f,l,t],i)=>`<label>${l}${t==='area'?`<textarea name="${f}" rows="4"></textarea>`:`<input name="${f}" type="${t||'text'}" ${t==='tel'?'inputmode="tel"':''} ${f==='date'?`value="${today}"`:''} ${i===0&&f!=='date'||f==='title'||f==='text'?'required':''}>`}</label>`).join('')}<button class="btn big primary wide">Save</button></form></section>
 <section class="card"><h2>Saved</h2><ul class="list">${items.map(it=>`<li><span>${fields.map(([f,,t])=>!it[f]?'':t==='url'?`<a href="${esc(it[f])}" target="_blank" rel="noopener">Open document</a>`:t==='tel'?`<a href="tel:${esc(it[f].replace(/[^0-9+]/g,''))}">${esc(it[f])}</a>`:esc(it[f])).filter(Boolean).join('<br>')}</span><button class="btn" data-rm="${it.id}">Remove</button></li>`).join('')||'<li>Nothing here yet.</li>'}</ul></section>`};
 bind[k]=()=>{$('#f').onsubmit=e=>{e.preventDefault();const o={id:id()};fields.forEach(([f])=>o[f]=e.target.elements[f].value.trim());if(o.link&&!/^https?:\/\//i.test(o.link))o.link='https://'+o.link;cur[k].push(o);save();dash()};
  app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{if(!confirm('Remove this'))return;cur[k]=cur[k].filter(x=>x.id!==b.dataset.rm);save();dash()})}});
function imp(e){const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!Array.isArray(d.profiles))throw 0;
 d.profiles.forEach(p=>{const i=db.profiles.findIndex(q=>q.id===p.id);i>=0?db.profiles[i]=p:db.profiles.push(p)});save();alert('Backup restored.');cur=null;start()}catch(_){alert('That file is not a Coffeebreak backup.')}})}
prefs();start();
})();
