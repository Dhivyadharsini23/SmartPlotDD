const API=(window.SMARTPLOT_API_URL||'/api').replace(/\\/$/,'');let token=localStorage.getItem('sp_token')||'',user=JSON.parse(localStorage.getItem('sp_user')||'null'),authMode='login',plots=[];
const $=id=>document.getElementById(id),money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500)}
function notice(s){$('notice').textContent=s;$('notice').classList.toggle('hidden',!s)}
async function api(path,opts={}){let r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})}});let d=await r.json().catch(()=>({message:'Unexpected server response'}));if(!r.ok)throw Error(d.message||'Request failed');return d}
function updateUser(){ $('userbox').textContent=user?`${user.name} · ${user.role}`:'Guest account';$('logout').classList.toggle('hidden',!user);$('list').classList.toggle('hidden',!user||user.role!=='seller');}
async function load(){try{let params=new URLSearchParams();if($('q').value)params.set('q',$('q').value);if($('status').value)params.set('status',$('status').value);let b=Number($('budget').value);if(b)params.set('maxPrice',b);let d=await api('/plots?'+params);plots=d.plots;render()}catch(e){notice(e.message+' — ensure the server and MongoDB are running.');}}
function render(){ $('total').textContent=plots.length;$('available').textContent=plots.filter(p=>p.status==='Available').length;$('booked').textContent=plots.filter(p=>p.status==='Booked').length;$('count').textContent=plots.length+' results';
let b=Number($('budget').value);$('budgetmsg').textContent=b?`${plots.length} plot(s) at or below ${money(b)}. Budget percentage is plot price ÷ budget × 100.`:'Enter your budget to compare plot prices.';
$('plots').innerHTML=plots.map(p=>{let own=!!(user&&user.role==='seller'&&user.id===(p.seller?._id||p.seller));let pct=b?Math.round(p.price/b*100):0;return `<article class="card"><div class="visual"><span class="badge ${p.status==='Booked'?'booked':''}">${p.status}</span>⌂</div><div class="cardbody"><h3>${esc(p.name)}</h3><div class="loc">⌖ ${esc(p.area)}, ${esc(p.city)}<br>${esc(p.state)}</div><div class="price">${money(p.price)} <span class="sub">total</span></div><div class="meta"><span>${Number(p.size).toLocaleString('en-IN')} sq.ft.</span><span>${money(p.rate)} / sq.ft.</span></div>${b?`<div class="sub">${pct}% of your budget ${p.price<=b?'· Within budget':'· Over budget'}</div>`:''}<div class="chips">${(p.amenities||[]).map(a=>`<span class="chip">${esc(a)}</span>`).join('')}</div><div class="sub">Seller: ${esc(p.sellerName||p.seller?.name||'Seller')}</div><div class="actions">${p.status==='Available'?`<button onclick="bookPlot('${p._id}')">Book plot</button>`:'<button disabled>Booked</button>'}${own?`<button class="secondary" onclick="editPlot('${p._id}')">Edit listing</button>`:''}${user&&user.role==='customer'&&p.status==='Booked'&&String(p.bookedBy)===String(user.id)?`<button class="secondary" onclick="cancelBooking('${p._id}')">Cancel my booking</button>`:''}</div></div></article>`}).join('')||'<div class="sub">No plots found. Sellers can add a listing after logging in.</div>'}
function showAuth(mode){authMode=mode;$('authmodal').classList.remove('hidden');$('authtitle').textContent=mode==='login'?'Welcome back':'Create your account';$('authsubmit').textContent=mode==='login'?'Log in':'Register';$('namewrap').classList.toggle('hidden',mode==='login');$('rolewrap').classList.toggle('hidden',mode==='login');$('switchauth').textContent=mode==='login'?'New here? Create an account':'Already registered? Log in'}
function hideAuth(){$('authmodal').classList.add('hidden')}function toggleAuth(){showAuth(authMode==='login'?'register':'login')}
$('authform').addEventListener('submit',async e=>{e.preventDefault();let f=new FormData(e.target),body=Object.fromEntries(f.entries());try{let d=await api('/auth/'+(authMode==='login'?'login':'register'),{method:'POST',body:JSON.stringify(body)});token=d.token;user=d.user;localStorage.setItem('sp_token',token);localStorage.setItem('sp_user',JSON.stringify(user));hideAuth();updateUser();notice('');await load();toast('Welcome, '+user.name)}catch(e){toast(e.message)}});
function logout(){token='';user=null;localStorage.removeItem('sp_token');localStorage.removeItem('sp_user');updateUser();load();toast('Logged out')}
$('plotform').addEventListener('submit',async e=>{e.preventDefault();let f=new FormData(e.target),body=Object.fromEntries(f.entries());body.size=Number(body.size);body.rate=Number(body.rate);body.price=Number(body.price);body.amenities=f.getAll('amenities');try{await api('/plots',{method:'POST',body:JSON.stringify(body)});e.target.reset();await load();toast('Plot published to database')}catch(e){toast(e.message)}});
async function bookPlot(id){if(!user){showAuth('login');return}if(!confirm('Confirm booking request for this plot?'))return;try{await api('/plots/'+id+'/book',{method:'POST',body:'{}'});await load();toast('Booking recorded')}catch(e){toast(e.message)}}

async function editPlot(id){const p=plots.find(x=>x._id===id);if(!p)return;
 const name=prompt('Plot name:',p.name);if(name===null)return;
 const state=prompt('State:',p.state);if(state===null)return;
 const city=prompt('City:',p.city);if(city===null)return;
 const area=prompt('Area/locality:',p.area);if(area===null)return;
 const size=prompt('Size (sq.ft.):',p.size);if(size===null)return;
 const rate=prompt('Rate per sq.ft. (₹):',p.rate);if(rate===null)return;
 const price=prompt('Total price (₹):',p.price);if(price===null)return;
 const description=prompt('Description:',p.description||'');if(description===null)return;
 try{await api('/plots/'+id,{method:'PATCH',body:JSON.stringify({name,state,city,area,size:Number(size),rate:Number(rate),price:Number(price),description})});await load();toast('Plot updated successfully')}catch(e){toast(e.message)}
}
async function cancelBooking(id){if(!confirm('Cancel your booking? The plot will become available again.'))return;try{await api('/plots/'+id+'/booking',{method:'DELETE'});await load();toast('Booking cancelled')}catch(e){toast(e.message)}}

let timer;['q','status','budget'].forEach(id=>$(id).addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(load,250)}));
updateUser();load();
