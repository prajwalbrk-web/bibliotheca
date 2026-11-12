(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER=matchMedia('(hover: hover)').matches;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const use=n=>(window.claude&&window.claude.use)?window.claude.use(n):Promise.resolve(null);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rand=a=>a[Math.floor(Math.random()*a.length)];
const plural=(n,a,b)=>n===1?a:b;

/* ---------- icons ---------- */
const IC={
 yet:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
 reading:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/></svg>',
 read:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
 heart:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
 pen:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/></svg>',
 bin:'<svg class="ic" viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>'
};
const STATUS={yet:'Yet to Start',reading:'Currently Reading',read:'Read'};
const KEYS=['yet','reading','read'];
const st=b=>STATUS[b.status]?b.status:'yet';

/* ---------- shelves: genre buckets. Tags are split on ";" and the first tag that matches a shelf decides. ---------- */
const SHELVES=[
 {key:'Romance',abbr:'ROM',pr:4,re:/romance|romantic|love/i},
 {key:'Contemporary Fiction',abbr:'CON',pr:11,re:/contemporary|fiction|drama|family|social|tragedy/i},
 {key:'Young Adult',abbr:'YAD',pr:8,re:/young adult/i},
 {key:'Crime, Mystery & Thriller',abbr:'CRM',pr:3,re:/crime|mystery|thriller|suspense/i},
 {key:'Horror & Supernatural',abbr:'HOR',pr:2,re:/horror|supernatural|ghost/i},
 {key:'Fantasy, Sci-Fi & Myth',abbr:'FSM',pr:9,re:/fantasy|science fiction|sci-fi|mytholog|space/i},
 {key:'Classics',abbr:'CLS',pr:5,re:/classic|allegory|satire/i},
 {key:'Historical & Literary',abbr:'HLT',pr:10,re:/historical|literary|memoir|short stor|anthology/i},
 {key:'Philosophy & Letters',abbr:'PHI',pr:6,re:/philosoph|existential|letters/i},
 {key:'Self-Help & Growth',abbr:'SLF',pr:7,re:/self-help|self help|personal|mindful|productiv|inspirational|psychology/i},
 {key:'Poetry',abbr:'POE',pr:1,re:/poetry|poems?\b/i},
 {key:'Unverified',abbr:'UNV',pr:0,re:/^unverified/i},
 {key:'Other Shelves',abbr:'OTH',pr:99,re:null}
];
const OTHER=SHELVES[SHELVES.length-1];
const tagsOf=g=>String(g||'').split(';').map(s=>s.trim()).filter(Boolean);
const shelfCache=new Map();
function shelfOf(b){
  const g=b.genre||''; if(shelfCache.has(g))return shelfCache.get(g);
  let res=OTHER;
  for(const t of tagsOf(g)){
    const m=SHELVES.filter(s=>s.re&&s.re.test(t)).sort((a,c)=>a.pr-c.pr)[0];
    if(m){res=m;break}
  }
  shelfCache.set(g,res);return res;
}
const needsCheck=b=>/^unverified/i.test(b.genre||'')||/not confidently|not legible/i.test(b.author||'')||/should be (checked|verified|confirmed)|please confirm|need confirmation|not clear enough|could not be established|check the edition|confirm (from|the)|before (adding|publishing)|against the edition/i.test(b.description||'');

/* ---------- designed covers ---------- */
const PAL=[
 {bg:'#5a1f26',bg2:'#35100f',ink:'#efdcb4',acc:'#d4ac58'},
 {bg:'#1f3d2b',bg2:'#10251a',ink:'#ecd9a0',acc:'#c9a24b'},
 {bg:'#1b2a44',bg2:'#0e1727',ink:'#e8d8ae',acc:'#c9a24b'},
 {bg:'#7a5230',bg2:'#4a2f18',ink:'#f2e4c0',acc:'#e3c06e'},
 {bg:'#2b2623',bg2:'#151210',ink:'#ecdfbb',acc:'#c9a24b'},
 {bg:'#8a6420',bg2:'#5a4012',ink:'#f6e8c0',acc:'#ecc873'},
 {bg:'#e6d8b8',bg2:'#c9b88f',ink:'#2b1d10',acc:'#8f6d2c'}
];
function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return Math.abs(h)}
function palOf(b){
  if(b.tone&&/^#[0-9a-f]{6}$/i.test(b.tone)){const c=[1,3,5].map(i=>parseInt(b.tone.slice(i,i+2),16)),L=(.299*c[0]+.587*c[1]+.114*c[2])/255;return{bg:b.tone,bg2:'#'+c.map(v=>Math.round(v*.6).toString(16).padStart(2,'0')).join(''),ink:L>.55?'#2b1d10':'#f3e6c2',acc:L>.55?'#6b4c1a':'#e0bb62'}}
  return PAL[hash((b.title||'')+'|'+(b.author||''))%PAL.length];
}
function coverHTML(b){
  if(b.cover)return `<div class="cover has-img"><img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" decoding="async"><i class="c-edge"></i></div>`;
  const h=hash((b.title||'')+'|'+(b.author||'')),p=PAL[h%PAL.length],pat=(h>>3)%5;
  const t=b.title||'Untitled',n=t.length,fs=n<=12?17:n<=22?14:n<=34?12:n<=46?10:8.8;
  return `<div class="cover p${pat}" style="--bg:${p.bg};--bg2:${p.bg2};--ink:${p.ink};--acc:${p.acc}"><i class="c-frame"></i><span class="c-code">${esc(shelfOf(b).abbr)}</span><span class="c-title" style="font-size:${fs}cqw">${esc(t)}</span><i class="c-rule"></i><span class="c-author">${esc(b.author||'')}</span><i class="c-edge"></i></div>`;
}

/* ---------- state ---------- */
const S={
  books:[],ready:false,col:null,dbState:'wait',canWrite:true,role:'',name:'',
  f:{status:'all',genre:'all',q:'',sort:'collection',view:store.get('rr-view','shelves')},
  light:Object.assign({on:true,b:.9,cursor:false},store.get('rr-light',{})),
  order:[],openId:null,confirmDel:false,pop:null,justAdded:null,animNext:false,heroKey:'',sug:[]
};
const get=id=>S.books.find(b=>b.id===id);
const counts=()=>{const c={yet:0,reading:0,read:0,fav:0};S.books.forEach(b=>{c[st(b)]++;if(b.fav)c.fav++});return c};

/* ---------- toast & modals ---------- */
let toastT=0;
function toast(msg,o={}){
  const box=$('#toastBox');clearTimeout(toastT);
  box.innerHTML=`<div class="toast"><span>${esc(msg)}</span>${o.action?`<button id="toastAct">${esc(o.action)}</button>`:''}</div>`;
  if(o.action)$('#toastAct').onclick=()=>{o.fn&&o.fn();box.innerHTML=''};
  toastT=setTimeout(()=>box.innerHTML='',o.ttl||6000);
}
const modals=[];
function openModal(el){
  el._ret=document.activeElement;el.hidden=false;modals.push(el);document.body.classList.add('modal-open');
  requestAnimationFrame(()=>el.classList.add('open'));
  setTimeout(()=>{const f=el.querySelector('[autofocus],input:not([type=file]):not(.sr),.xbtn,.pclose');f&&f.focus({preventScroll:true})},60);
}
function closeModal(el){
  if(!el||el.hidden)return;
  el.classList.remove('open');const i=modals.indexOf(el);if(i>-1)modals.splice(i,1);
  if(!modals.length)document.body.classList.remove('modal-open');
  setTimeout(()=>{if(!el.classList.contains('open'))el.hidden=true},RM?0:300);
  try{el._ret&&el._ret.focus&&el._ret.focus({preventScroll:true})}catch(e){}
  if(el.id==='m-profile'){S.openId=null;S.confirmDel=false}
  if(el.id==='m-read')rdCleanup();
  if(el.id==='m-scan')stopCam();
}
document.addEventListener('keydown',e=>{
  const top=modals[modals.length-1];
  if(e.key==='Escape'){
    if(top){closeModal(top);return}
    if(!$('#lights').hidden){toggleLights(false)}
    return;
  }
  if(!top)return;
  if(e.key==='Tab'){
    const f=$$('button,input,select,textarea,a[href]',top).filter(x=>!x.disabled&&x.offsetParent!==null&&!x.classList.contains('sr'));
    if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}
  }
  if(top.id==='m-profile'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){
    if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);
  }
});

/* ---------- local database (used when no shared database is available, e.g. a downloaded copy) ---------- */
const SEED=/*SEED*/[["Beyond Good and Evil", "Friedrich Nietzsche", "Philosophy; Critical Theory", "A provocative examination of morality, truth, religion and traditional philosophy, challenging readers to question accepted beliefs."], ["Ritualistic Murder", "Kumar Kinshuk", "Crime; Thriller", "A crime-focused thriller whose title suggests a murder investigation involving ritualistic clues. Synopsis should be checked against the edition."], ["One Night @ the Call Center", "Chetan Bhagat", "Contemporary Fiction; Romance; Social Commentary", "Six call-centre employees navigate one difficult night, personal crises and questions about ambition, relationships and identity."], ["Half Girlfriend", "Chetan Bhagat", "Romance; Contemporary Indian Fiction", "A young man from Bihar falls for an affluent Delhi woman, but their different backgrounds and expectations complicate the relationship."], ["Life Is What You Make It", "Preeti Shenoy", "Contemporary Fiction; Inspirational; Romance", "Ankita’s journey explores love, ambition, mental health and the possibility of rebuilding life after a personal crisis."], ["An Unexpected Gift", "Ajay K. Pandey", "Romance; Contemporary Fiction", "An emotional relationship-driven story about love, loss and unexpected turns in life. Exact plot details depend on the edition."], ["You Are the Best Wife", "Ajay K. Pandey", "Romance; Memoir-inspired Fiction; Drama", "A heartfelt story inspired by the author’s own love story, celebrating devotion and the impact of a profound relationship."], ["The Girl in the Red Lipstick", "Ajay K. Pandey", "Romance; Contemporary Fiction; Drama", "A relationship-centred story exploring love, choices and the complexities of human connection."], ["13 Chilling Ghost Stories", "Various authors / editor not legible", "Horror; Short Stories; Anthology", "A collection of thirteen supernatural and eerie tales designed to deliver short bursts of suspense and fright."], ["This Love That Feels Right", "Ravinder Singh", "Romance; Contemporary Fiction", "A modern love story that explores attraction, emotional choices and the idea of following the heart."], ["Too Had a Love Story", "Ravinder Singh", "Romance; Contemporary Fiction; Tragedy", "A moving love story inspired by the author’s life, about a relationship shaped by distance, hope and tragedy."], ["Can Love Happen Twice?", "Ravinder Singh", "Romance; Contemporary Fiction", "A sequel-like romantic journey that asks whether the heart can find love again after heartbreak."], ["Sorry, You're Not My Type", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A campus romance about friendship, attraction and the complications that arise when people do not fit each other’s expectations."], ["She Swiped Right into My Heart", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A contemporary romance shaped by online dating, unexpected connections and the search for genuine affection."], ["You're Trending in My Dreams", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A young-adult love story exploring relationships, dreams and the influence of modern social culture."], ["All Rights Reserved for You", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A relationship-focused novel about love, emotional commitment and the choices that shape a couple’s future."], ["It Started with a Friend Request", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A modern romance that begins with an online connection and follows the emotional complications that grow from it."], ["You're the Password to My Life", "Sudeep Nagarkar", "Romance; Contemporary Fiction", "A contemporary love story about connection, trust and finding someone who becomes central to your life."], ["That Kiss in the Rain", "Novoneel Chakraborty", "Romance; Contemporary Fiction", "A romantic drama about love, longing and the unexpected turns that can change relationships."], ["A Thousand Kisses Deep", "Novoneel Chakraborty", "Romance; Contemporary Fiction", "A passionate relationship story exploring desire, emotional intensity and the cost of love."], ["The Perfect Us", "Novoneel Chakraborty", "Romance; Contemporary Fiction", "A relationship-driven novel examining whether love can survive imperfections and the realities of commitment."], ["No Time to Bleed", "Author not confidently readable", "Unverified; likely Fiction / Thriller", "The title is visible only partially in the photograph. Author and synopsis need confirmation from the book cover or title page."], ["The Great Gatsby", "F. Scott Fitzgerald", "Classic Literature; Tragedy; Social Satire", "Jay Gatsby’s extravagant pursuit of Daisy Buchanan exposes the glamour, inequality and moral emptiness of the Jazz Age."], ["Hot Night", "Nidhi Upadhyay", "Horror; Thriller", "A suspenseful, dark story. The exact plot should be verified from the edition before publishing a detailed synopsis."], ["Ghosts of the Silent Hills", "Anita Krishan", "Horror; Supernatural; Short Stories", "A collection of ghost stories set in the Himalayan region, drawing on eerie locations, local legends and supernatural encounters."], ["Horrors Next Door", "Rajendra Prasad Roy", "Horror; Supernatural Fiction", "A horror collection built around unsettling events and supernatural encounters close to everyday life."], ["Something I Never Told You", "Shravya Bhinder", "Romance; Contemporary Fiction", "A young-adult romance about love, secrets and the things people struggle to express."], ["Something I'm Waiting to Tell You", "Shravya Bhinder", "Romance; Contemporary Fiction", "A romantic story about unspoken feelings, timing and the courage it takes to reveal the truth."], ["Wish I Could Tell You", "Durjoy Datta", "Romance; Contemporary Fiction; Drama", "A relationship-focused story about love, vulnerability and the difficulty of communicating what matters most."], ["You Are My Reason to Smile", "Arpit Vageria", "Romance; Contemporary Fiction", "A feel-good romantic story centred on affection, relationships and the small moments that make life meaningful."], ["Can We Be Strangers Again?", "Shrijeet Shandilya", "Romance; Contemporary Fiction", "A story about love and separation, asking whether two people can return to being strangers after sharing a deep connection."], ["Don't Believe Everything You Think", "Joseph Nguyen", "Self-help; Psychology; Personal Development", "A practical guide to reducing overthinking by understanding the role of thought in emotional suffering and well-being."], ["I Don't Love You Anymore", "Rithvik Singh", "Poetry; Romance; Contemporary Writing", "A collection of emotionally direct reflections on heartbreak, healing, love and letting go."], ["We Were Liars", "E. Lockhart", "Young Adult; Psychological Thriller; Mystery", "A wealthy family’s private-island summer hides a traumatic secret, revealed through an unreliable narrator and a twist-driven plot."], ["I'm an Average Looking Boy", "Author not confidently readable", "Young Adult; Romance / Contemporary Fiction (tentative)", "The title is only partly legible in the photograph. Please confirm the author and full title before adding a definitive description."], ["The Swiss Family Robinson", "Johann David Wyss", "Classic Literature; Adventure; Survival", "A family shipwrecked on a tropical island use ingenuity and teamwork to build a new life and survive in the wilderness."], ["The Hidden Hindu", "Akshat Gupta", "Mythological Fiction; Fantasy; Thriller", "A modern thriller follows a mysterious man connected to ancient Indian history, mythology and secrets spanning millennia."], ["Animal Farm", "George Orwell", "Political Satire; Allegory; Classic Literature", "Farm animals overthrow their human owner, but their new society gradually reproduces the corruption and oppression they fought against."], ["White Nights and Other Stories", "Fyodor Dostoevsky", "Classic Literature; Literary Fiction; Short Stories", "A collection of Dostoevsky’s stories, including a lyrical tale of loneliness, idealism and a brief romantic encounter in St Petersburg."], ["Project Hail Mary", "Andy Weir", "Science Fiction; Space Adventure; Thriller", "A lone astronaut wakes up far from Earth with no memory of his mission and must solve a scientific mystery to save humanity."], ["Spider's Web", "Agatha Christie", "Mystery; Crime; Thriller", "A woman discovers a body in her drawing room and must navigate a dangerous mystery before the police uncover the truth."], ["Letters to a Young Poet", "Rainer Maria Rilke", "Letters; Philosophy; Literary Nonfiction", "Rilke’s reflective letters offer advice on creativity, solitude, love and the inner life of an aspiring poet."], ["The Fall", "Albert Camus", "Existential Fiction; Philosophical Literature", "A former Parisian lawyer recounts his life and moral failings in a searching monologue about guilt, judgment and responsibility."], ["The Alchemist", "Paulo Coelho", "Philosophical Fiction; Adventure; Inspirational", "A young shepherd travels in search of treasure and discovers lessons about purpose, courage and listening to one’s heart."], ["Lallan Sweets", "Srishti Chaudhary", "Contemporary Fiction; Family Drama", "A family-centred novel associated with a beloved sweet shop, exploring relationships, memory and the stories that bind people together."], ["The Book of Everlasting Things", "Aanchal Malhotra", "Historical Fiction; Romance; Literary Fiction", "Set against the upheavals of Partition, the novel follows two young people whose love and lives are shaped by history, memory and loss."], ["The 5 AM Club", "Robin Sharma", "Self-help; Productivity; Personal Development", "A fable-style guide to building a purposeful morning routine and using focused time for personal growth."], ["Twisted Love", "Ana Huang", "Contemporary Romance; Dark Romance", "A guarded man and his best friend’s sister grow close in a romance shaped by secrets, emotional wounds and intense attraction."], ["Twisted Games", "Ana Huang", "Contemporary Romance; Romantic Suspense", "A princess and her disciplined bodyguard navigate forbidden attraction, duty and political pressures."], ["Twisted Hate", "Ana Huang", "Contemporary Romance; Enemies-to-Lovers", "Two people with a history of mutual dislike are drawn into a volatile relationship that challenges their assumptions."], ["Twisted Lies", "Ana Huang", "Contemporary Romance; Romantic Suspense", "A carefully constructed public relationship becomes complicated by secrets, ambition and genuine feelings."], ["A Thousand Years of Pain", "Author not confidently readable", "Unverified", "The title and author are not clear enough in the photograph to identify reliably; please confirm from the cover."], ["Ego Is the Enemy", "Ryan Holiday", "Self-help; Philosophy; Personal Development", "Using historical examples and Stoic ideas, Holiday explains how unchecked ego can undermine learning, achievement and resilience."], ["The Midnight Library", "Matt Haig", "Contemporary Fiction; Fantasy; Philosophical Fiction", "Between life and death, Nora explores alternate versions of her life and considers what makes a life worth living."], ["The Love Hypothesis", "Ali Hazelwood", "Contemporary Romance; Romantic Comedy; STEM Fiction", "A PhD student’s fake-dating arrangement with a demanding professor becomes unexpectedly real."], ["November 9", "Colleen Hoover", "Contemporary Romance; Drama", "Two aspiring writers meet on the same date each year, building a relationship shaped by distance, secrets and difficult revelations."], ["Reminders of Him", "Colleen Hoover", "Contemporary Romance; Drama", "After prison, a young mother tries to rebuild her life and reconnect with her daughter while seeking forgiveness."], ["Think Like a Monk", "Jay Shetty", "Self-help; Mindfulness; Personal Development", "Drawing on monastic practices, Shetty offers tools for purpose, focus, compassion and managing negative thought patterns."], ["All He'll Ever Be", "W. Winters", "Dark Romance; Contemporary Romance", "A dark, intense romance exploring obsession, power and complicated emotional attachment. Check the edition for series context."], ["Haunting Adeline", "H. D. Carlton", "Dark Romance; Romantic Suspense; Thriller", "A gothic, highly dark romantic thriller involving a writer, a stalker and disturbing secrets surrounding her family home."], ["The Invocations", "Krystal Sutherland", "Young Adult; Dark Fantasy; Horror", "Three young women become entangled in witchcraft, demons and dangerous bargains in a dark supernatural mystery."], ["I Fell in Love with Hope", "Lancali", "Young Adult; Contemporary Fiction; Romance", "A poignant story of young people facing illness, grief, friendship and the fragile hope found in human connection."], ["Closer to Love", "Vex King", "Self-help; Relationships; Personal Growth", "A guide to building healthier relationships through self-worth, emotional awareness and compassionate connection."], ["Men Without Women", "Haruki Murakami", "Literary Fiction; Short Stories; Magical Realism", "A collection of stories about men experiencing loneliness, loss and the complicated absence or presence of women in their lives."], ["Meet Me in the Middle", "Vani Mahesh", "Contemporary Fiction; Romance", "A contemporary relationship story; the exact synopsis should be confirmed from the edition before adding detailed marketing copy."], ["Rajmohan's Wife", "Bankim Chandra Chattopadhyay", "Classic Indian Literature; Social Fiction", "Often regarded as one of the earliest Indian novels in English, it explores marriage, domestic power and social constraints in nineteenth-century Bengal."], ["The Chase of Choices", "Dr. Hari Parameshwar", "Unverified; likely Inspirational / Fiction", "The title and author are visible, but a reliable synopsis could not be established from the photograph alone."], ["I Will Love Once Again", "Krishna Verma", "Romance; Contemporary Fiction", "A romantic story about separation, longing and the possibility of finding love again after heartbreak."], ["My Love Never Faked... Trust Me, I Still Love You", "Nikhil Mahajan", "Romance; Contemporary Fiction", "A relationship-driven story about devotion, emotional uncertainty and the desire to prove that love is genuine."]];
function localCollection(){
  const KEY='rr-books-v1',docs=new Map(),subs=new Set();let mem=false;
  const mkSeed=()=>{const base=Date.now()-SEED.length*1000;SEED.forEach((r,i)=>docs.set('b'+String(i+1).padStart(3,'0'),{id:'b'+String(i+1).padStart(3,'0'),title:r[0],author:r[1],genre:r[2],description:r[3],status:'yet',fav:false,cover:'',addedAt:base+i*1000}))};
  try{const raw=localStorage.getItem(KEY);if(raw==null)mkSeed();else JSON.parse(raw).forEach(d=>docs.set(d.id,d))}catch(e){mem=true;docs.clear();mkSeed()}
  const persist=()=>{if(mem)return;try{localStorage.setItem(KEY,JSON.stringify([...docs.values()]))}catch(e){throw{code:'quota_exceeded',message:'Storage full'}}};
  const snap=()=>({docs:[...docs.values()].map(d=>{const {id,...rest}=d;return{id,data:()=>({...rest})}})});
  const fire=()=>subs.forEach(f=>f(snap()));
  const write=(id,next)=>{const prev=docs.get(id);if(next)docs.set(id,{...next,id});else docs.delete(id);try{persist()}catch(e){prev?docs.set(id,prev):docs.delete(id);throw e}fire()};
  return{
    onSnapshot(next){subs.add(next);setTimeout(()=>next(snap()),0);return()=>subs.delete(next)},
    doc:id=>({set:async d=>write(id,d),update:async d=>write(id,{...(docs.get(id)||{}),...d}),delete:async()=>write(id,null)})
  };
}


/* ---------- local mode (used when no shared database is available, e.g. a downloaded copy) ---------- */

/* ---------- database ---------- */
function guard(){
  if(!S.canWrite){toast('You have read-only access to this library.');return false}
  return true;
}
async function initDb(){
  const db=await use('db');
  if(!db){
    S.local=true;S.col=localCollection();
    const w=$('#who');w.hidden=false;$('#whoTxt').textContent='Saved in this browser';
    $('#inviteNote').hidden=false;$('#inviteNote').textContent='Your shelves are saved in this browser. Use Export to keep a copy as an Excel file.';
  }else S.col=db.collection('books');
  const t=setTimeout(()=>{if(!S.ready){S.dbState='slow';renderAll()}},10000);
  S.col.onSnapshot(snap=>{
    clearTimeout(t);
    const first=!S.ready;
    S.books=snap.docs.map(d=>({...d.data(),id:d.id}));
    S.ready=true;S.dbState='ok';
    if(first)S.animNext=true;
    renderAll();
  },err=>{clearTimeout(t);S.dbState=(err&&err.code==='revoked')?'revoked':'error';renderAll()});
}
async function initUser(){
  const user=await use('user');
  if(user){
    try{
      const can=await user.can('data.write');S.canWrite=can!==false;
      const me=await user.me();S.name=((me&&me.name)||'').split(' ')[0];
      S.role=(await user.isOwner())?'Owner':(await user.canEdit())?'Editor':S.canWrite?'Contributor':'Reader';
    }catch(e){}
  }
  const w=$('#who');if(S.role){w.hidden=false;$('#whoTxt').textContent=S.role+(S.name?` · ${S.name}`:'')}
  if(!S.local)$('#inviteNote').hidden=S.role!=='Owner';
  renderAll();greet();
}
async function dbRetry(fn){
  for(let i=0;i<4;i++){
    try{return await fn()}catch(e){
      if(e&&(e.code==='resource_exhausted'||e.code==='unavailable')&&i<3){await sleep(500+Math.random()*600);continue}
      throw e;
    }
  }
}

/* ---------- derived ---------- */
function filtered(){
  const f=S.f,q=f.q.trim().toLowerCase();
  let l=S.books.filter(b=>{
    if(f.status==='fav'){if(!b.fav)return false}else if(f.status!=='all'&&st(b)!==f.status)return false;
    if(f.genre!=='all'&&shelfOf(b).key!==f.genre)return false;
    if(q&&!(b.title||'').toLowerCase().includes(q)&&!(b.author||'').toLowerCase().includes(q))return false;
    return true;
  });
  const cmp={collection:(a,b)=>(a.addedAt||0)-(b.addedAt||0),recent:(a,b)=>(b.addedAt||0)-(a.addedAt||0),
    title:(a,b)=>(a.title||'').localeCompare(b.title||'',undefined,{sensitivity:'base'}),author:(a,b)=>(a.author||'').localeCompare(b.author||'',undefined,{sensitivity:'base'})}[f.sort];
  return l.sort(cmp);
}
const seqMap=()=>{const m=new Map();[...S.books].sort((a,b)=>(a.addedAt||0)-(b.addedAt||0)).forEach((b,i)=>m.set(b.id,i+1));return m};
const authKey=b=>{
  if(/various/i.test(b.author||''))return'VAR';if(/not confidently|not legible/i.test(b.author||''))return'UNK';
  const w=String(b.author||'').replace(/\./g,' ').trim().split(/\s+/);return(w[w.length-1]||'XXX').slice(0,3).toUpperCase().padEnd(3,'X');
};
const fmtDate=ms=>ms?new Date(ms).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';

/* ---------- render ---------- */
let rq=0;
function renderAll(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;doRender()})}
function doRender(){
  document.body.classList.toggle('readonly',!S.canWrite);
  renderHero();renderDash();renderToolbar();renderLibrary();
  if(S.openId)refreshProfile();
}
function countTo(el,to){
  const from=+el.dataset.v||0;el.dataset.v=to;
  if(RM||from===to){el.textContent=to;return}
  const t0=performance.now(),d=700;
  (function f(t){const p=Math.min(1,(t-t0)/d);el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0);
}

/* hero shelves */
function renderHero(){
  const B=S.books,c=counts(),shelves=new Set(B.map(b=>shelfOf(b).key)).size;
  $('#heroLabel').textContent=B.length?`Private collection · ${B.length} ${plural(B.length,'volume','volumes')}`:'Private collection';
  $('#heroline').innerHTML=`<div><b>${B.length}</b><span>Volumes</span></div><div><b>${shelves}</b><span>Shelves</span></div><div><b>${c.reading}</b><span>Reading</span></div><div><b>${c.read}</b><span>Finished</span></div>`;
  const N=Math.min(64,Math.ceil(innerWidth/28)+3),key=B.map(b=>b.id).join(',')+'|'+N;
  if(key===S.heroKey)return;S.heroKey=key;
  let html='';
  for(let r=0;r<3;r++){
    html+='<div class="hshelf">';
    for(let i=0;i<N;i++){
      const k=r*N+i,real=k<B.length?B[k]:null,b=real||(B.length?B[k%B.length]:{title:'Volume '+k,author:'x'+k});
      const p=palOf(b),hh=hash(b.title+k),w=22+hh%14,h=88+(hh>>3)%46;
      const st_=`style="--h:${h}px;--w:${w}px;--c1:${p.bg};--c2:${p.bg2};--ac:${p.acc}"`;
      html+=real?`<button class="spine" data-open data-id="${esc(real.id)}" ${st_} aria-label="${esc(real.title)}"><span>${esc(real.title)}</span></button>`:`<i class="spine" ${st_} aria-hidden="true"></i>`;
    }
    html+='</div>';
  }
  $('#hshelves').innerHTML=html;
}

/* dashboard */
function renderDash(){
  const B=S.books,c=counts();
  ['total','read','reading','yet'].forEach(k=>countTo($(`[data-k="${k}"]`),k==='total'?B.length:c[k]));
  // ring
  const C=2*Math.PI*52,tot=B.length||1;let off=0;
  const seg=[['read',c.read,'var(--gold)'],['reading',c.reading,'var(--sage)'],['yet',c.yet,'#5a4a3a']];
  const circ=seg.map(([k,n,col])=>{const len=n/tot*C,s=`<circle cx="70" cy="70" r="52" fill="none" stroke="${col}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;off+=len;return s}).join('');
  const pct=B.length?Math.round(c.read/B.length*100):0;
  $('#ring').innerHTML=`<svg viewBox="0 0 140 140" role="img" aria-label="${pct}% of books read"><circle cx="70" cy="70" r="52" fill="none" stroke="#24352c" stroke-width="14"/>${B.length?circ:''}<text class="pct" x="70" y="72" text-anchor="middle">${pct}%</text><text class="sub" x="70" y="88" text-anchor="middle">READ</text></svg>
  <ul class="legend"><li><i style="background:var(--gold)"></i>Read<b>${c.read}</b></li><li><i style="background:var(--sage)"></i>Currently reading<b>${c.reading}</b></li><li><i style="background:#5a4a3a"></i>Yet to start<b>${c.yet}</b></li></ul>`;
  // genre bars
  const by={};B.forEach(b=>{const k=shelfOf(b).key;by[k]=(by[k]||0)+1});
  const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),max=rows.length?rows[0][1]:1;
  $('#bars').innerHTML=rows.length?rows.map(([k,n])=>`<button class="bar" data-genre="${esc(k)}" title="Show the ${esc(k)} shelf"><span class="bl">${esc(k)}</span><span class="bt"><i style="--w:${(n/max*100).toFixed(1)}%"></i></span><span class="bn">${n}</span></button>`).join(''):'<p class="empty-note">Shelves appear here as you add books.</p>';
  // currently reading
  const cur=B.filter(b=>st(b)==='reading').sort((a,b)=>(b.statusAt||0)-(a.statusAt||0)).slice(0,5);
  $('#nowread').innerHTML=cur.length?cur.map(b=>`<div class="nr" data-id="${esc(b.id)}"><button class="minibtn mini" data-open style="width:54px" aria-label="Open ${esc(b.title)}">${coverHTML(b)}</button><div><h4>${esc(b.title)}</h4><p>${esc(b.author)}</p></div><button class="btn w-only" data-st="read" title="Mark as read">Finished</button></div>`).join(''):'<p class="empty-note">Nothing open right now. Mark a book as Currently Reading and it will wait here.</p>';
  const strip=l=>l.map(b=>`<button class="minibtn" data-open data-id="${esc(b.id)}" aria-label="Open ${esc(b.title)}"><span class="mini">${coverHTML(b)}</span><small>${esc(b.title)}</small></button>`).join('');
  const rec=[...B].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).slice(0,10);
  $('#recent').innerHTML=rec.length?strip(rec):'<p class="empty-note">New books land here first.</p>';
  const fav=B.filter(b=>b.fav).slice(0,14);
  $('#favs').innerHTML=fav.length?strip(fav):'<p class="empty-note">Tap the heart on any book to keep it close.</p>';
}

/* toolbar */
function renderToolbar(){
  const c=counts(),T=[['all','All volumes',S.books.length],['yet','Yet to Start',c.yet],['reading','Currently Reading',c.reading],['read','Read',c.read],['fav','Favourites',c.fav]];
  $('#tabs').innerHTML=T.map(([k,l,n])=>`<button class="tab" data-tab="${k}" aria-pressed="${S.f.status===k}">${l}<em>${n}</em></button>`).join('');
  const by={};S.books.forEach(b=>{const k=shelfOf(b);by[k.key]=(by[k.key]||0)+1});
  const chips=[`<button class="chip" data-genre="all" aria-pressed="${S.f.genre==='all'}">All shelves</button>`];
  SHELVES.forEach(s=>{if(by[s.key])chips.push(`<button class="chip" data-genre="${esc(s.key)}" aria-pressed="${S.f.genre===s.key}">${esc(s.key)}<em>${by[s.key]}</em></button>`)});
  $('#chips').innerHTML=chips.join('');
  $('#vShelves').setAttribute('aria-pressed',S.f.view==='shelves');$('#vGrid').setAttribute('aria-pressed',S.f.view==='grid');
  if($('#sort').value!==S.f.sort)$('#sort').value=S.f.sort;
}

/* library */
function cardHTML(b,i){
  const s=st(b),tg=tagsOf(b.genre).slice(0,3).join(' · ');
  return `<article class="card${S.pop===b.id?' pop':''}${S.justAdded===b.id?' arrive':''}" data-id="${esc(b.id)}" data-st="${s}" style="--i:${i}">
  <div class="cover-wrap"><div class="tilt"><button class="cover-btn" data-open aria-label="Open ${esc(b.title)} by ${esc(b.author)}">${coverHTML(b)}<span class="ribbon" aria-hidden="true">${s==='read'?IC.read:IC.reading}</span><span class="info"><span class="it">${esc(b.title)}</span><span class="by">${esc(b.author)}</span><span class="tg">${esc(tg)}</span><span class="ds">${esc(b.description)}</span><span class="go">Open profile</span></span></button></div></div>
  <div class="meta"><h4 class="t">${esc(b.title)}</h4><p class="a">${esc(b.author)}</p>${needsCheck(b)?'<span class="flag">Verify details</span>':''}
  <div class="qs" role="group" aria-label="Reading status for ${esc(b.title)}">${KEYS.map(k=>`<button data-st="${k}" aria-pressed="${s===k}" title="${STATUS[k]}" aria-label="${STATUS[k]}">${IC[k]}</button>`).join('')}<button class="favbtn" data-fav aria-pressed="${!!b.fav}" title="Favourite" aria-label="Favourite">${IC.heart}</button></div></div></article>`;
}
function renderLibrary(){
  const lib=$('#lib'),list=filtered(),total=S.books.length;
  const sc={};$$('.shelf-row',lib).forEach(r=>sc[r.parentElement.dataset.shelf]=r.scrollLeft);
  lib.classList.toggle('anim',S.animNext);
  const f=S.f,active=f.status!=='all'||f.genre!=='all'||f.q.trim();
  $('#summary').innerHTML=S.ready&&total?`<span>Showing ${list.length} of ${total} ${plural(total,'volume','volumes')}</span>${active?'<button class="linkbtn" data-clear>Clear filters</button>':''}`:'';
  if(!S.ready){
    const m={error:['The shelves are out of reach','The library could not be loaded. Reload the page to try again.'],revoked:['Access changed','Your access to this library was withdrawn.'],slow:['Still dusting the shelves…','This is taking longer than usual. The library will appear as soon as it connects.']}[S.dbState];
    lib.innerHTML=m?`<div class="none"><h3>${m[0]}</h3><p>${m[1]}</p></div>`:'<div class="loading">Dusting the shelves…</div>';
    S.order=[];return;
  }
  if(!total){
    lib.innerHTML=`<div class="none"><h3>The shelves are empty</h3><p>Add your first book, or import a spreadsheet to fill the room in one go.</p><div class="row w-only"><button class="btn solid" data-add>Add a book</button><button class="btn" data-import>Import Excel</button></div></div>`;S.order=[];return;
  }
  if(!list.length){
    lib.innerHTML=`<div class="none"><h3>No volumes match</h3><p>Try a different spelling, or clear the filters.</p><div class="row"><button class="btn" data-clear>Clear filters</button></div></div>`;S.order=[];return;
  }
  let html='',i=0;S.order=[];
  if(f.view==='grid'){
    html=`<div class="grid">${list.map(b=>{S.order.push(b.id);return cardHTML(b,i++)}).join('')}</div>`;
  }else{
    html=renderShelves(list,f,lib);
  }
  lib.innerHTML=html;
  $$('.shelf-row',lib).forEach(r=>{const v=sc[r.parentElement.dataset.shelf];if(v)r.scrollLeft=v});
  S.animNext=false;S.pop=null;restoreHover();
  if(S.justAdded){
    const id=S.justAdded;S.justAdded=null;
    setTimeout(()=>{const el=$(`#lib [data-id="${CSS.escape(id)}"]`);if(el){el.scrollIntoView({block:'center',inline:'center',behavior:RM?'auto':'smooth'});setTimeout(()=>{const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/3,50)},500)}},80);
  }
}

/* ---------- filter helpers ---------- */
function setFilter(p,scroll){
  Object.assign(S.f,p);S.animNext=true;renderAll();
  if(scroll)$('#library').scrollIntoView({behavior:RM?'auto':'smooth'});
}

/* ---------- events (delegated) ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  const go=t.closest('[data-go]');if(go){const el=document.getElementById(go.dataset.go);el&&el.scrollIntoView({behavior:RM?'auto':'smooth'});return}
  const stBtn=t.closest('button[data-st]');
  if(stBtn&&!t.closest('#m-profile')){const id=stBtn.closest('[data-id]')?.dataset.id;if(id)setStatus(id,stBtn.dataset.st,stBtn);return}
  const fav=t.closest('[data-fav]');if(fav){const id=fav.closest('[data-id]')?.dataset.id;if(id)toggleFav(id,fav);return}
  const op=t.closest('[data-open]');if(op){const id=op.closest('[data-id]')?.dataset.id;if(id)openProfile(id);return}
  const tab=t.closest('[data-tab]');if(tab){setFilter({status:tab.dataset.tab});return}
  const gn=t.closest('[data-genre]');if(gn){setFilter({genre:gn.dataset.genre},!!gn.closest('#bars')||!!gn.closest('.shelfhead'));return}
  const fl=t.closest('.stat[data-filter]');if(fl){setFilter({status:fl.dataset.filter,genre:'all',q:''},true);$('#q').value='';return}
  if(t.closest('[data-clear]')){S.f.q='';$('#q').value='';setFilter({status:'all',genre:'all'});return}
  if(t.closest('#addTop,#addHero,#addLib,[data-add]')){openForm();return}
  if(t.closest('#importBtn,[data-import]')){openImport();return}
  const cl=t.closest('[data-close]');if(cl){closeModal(cl.closest('.modal'));return}
  if(t.closest('#lightsBtn')){toggleLights();return}
  if(!t.closest('#lights')&&!$('#lights').hidden)toggleLights(false);
});
$('#q').addEventListener('input',e=>{S.f.q=e.target.value;renderAll()});
$('#sort').addEventListener('change',e=>{S.f.sort=e.target.value;S.animNext=true;renderAll()});
$('#vShelves').onclick=()=>{store.set('rr-view','shelves');setFilter({view:'shelves'})};
$('#vGrid').onclick=()=>{store.set('rr-view','grid');setFilter({view:'grid'})};

/* 3D tilt */
document.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse')return;
  const t=e.target.closest&&e.target.closest('.tilt');if(!t)return;
  const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
  t.classList.add('moving');
  t.style.setProperty('--ry',((px-.5)*16).toFixed(1)+'deg');t.style.setProperty('--rx',((.5-py)*12).toFixed(1)+'deg');
  t.style.setProperty('--gx',(px*100).toFixed(0)+'%');t.style.setProperty('--gy',(py*100).toFixed(0)+'%');
},{passive:true});
document.addEventListener('pointerout',e=>{
  const t=e.target.closest&&e.target.closest('.tilt');
  if(t&&!t.contains(e.relatedTarget)){t.classList.remove('moving');t.style.removeProperty('--rx');t.style.removeProperty('--ry')}
});

/* ---------- status & favourites ---------- */
async function setStatus(id,status,src){
  const b=get(id);if(!b||st(b)===status)return;
  if(!guard())return;
  const prev=b.status,prevAt=b.statusAt;b.status=status;b.statusAt=Date.now();S.pop=id;
  renderAll();reactStatus(b,status,src);
  try{await dbRetry(()=>S.col.doc(id).update({status,statusAt:b.statusAt}))}
  catch(e){b.status=prev;b.statusAt=prevAt;renderAll();toast('That change could not be saved. Please try again.')}
}
async function toggleFav(id,src){
  const b=get(id);if(!b||!guard())return;
  const v=!b.fav;b.fav=v;renderAll();
  if(v){const r=(src||document.body).getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,16);wSay(`“${b.title}” is now a favourite.`,5000)}
  try{await dbRetry(()=>S.col.doc(id).update({fav:v}))}catch(e){b.fav=!v;renderAll();toast('That change could not be saved.')}
}
function reactStatus(b,status,src){
  const c=counts();
  if(status==='read'){
    const r=src&&src.getBoundingClientRect?src.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
    burst(r.left+r.width/2,r.top+r.height/2,64);
    const msg=`Finished “${b.title}”. ${c.read} of ${S.books.length} read.`;
    wSay(msg,7000);owlSay(rand(['A volume well read.','Splendid. Another one closed with a satisfied sigh.','One more for the finished shelf.']));
  }else if(status==='reading')wSay(`Enjoy “${b.title}”. I will keep your place.`,6000);
  else wSay(`“${b.title}” goes back to wait its turn.`,5000);
}

/* ---------- profile (the open book) ---------- */
function openProfile(id,o={}){
  const b=get(id);if(!b)return;
  const m=$('#m-profile'),wasOpen=m.classList.contains('open')&&!m.hidden;
  S.openId=id;S.confirmDel=false;
  if(!wasOpen){
    $('#shutT').textContent=b.title;
    fillProfile(b);openModal(m);
    if(!RM){m.classList.add('opening');setTimeout(()=>m.classList.remove('opening'),1400)}
  }else if(o.dir&&!RM)turnPage(o.dir,()=>fillProfile(b));
  else fillProfile(b);
}
function turnPage(dir,fn){try{paper()}catch(e){}
  const p=$('#pfRight'),nx=dir>0?'next':'prev';
  p.classList.remove('in-next','in-prev','out-next','out-prev');void p.offsetWidth;
  p.classList.add('out-'+nx);
  setTimeout(()=>{fn();p.classList.remove('out-'+nx);void p.offsetWidth;p.classList.add('in-'+nx);setTimeout(()=>p.classList.remove('in-'+nx),450)},260);
}
function step(d){
  const o=S.order,i=o.indexOf(S.openId);if(i<0||o.length<2)return;
  openProfile(o[(i+d+o.length)%o.length],{dir:d});
}
$('#pPrev').onclick=()=>step(-1);$('#pNext').onclick=()=>step(1);
function fillProfile(b){
  const s=st(b),sh=shelfOf(b),seq=seqMap().get(b.id)||0;
  $('#pfLeft').innerHTML=`<div class="pf-cover"><div class="tilt">${coverHTML(b)}</div></div>
  <div class="seg" role="group" aria-label="Reading status">${KEYS.map(k=>`<button data-pst="${k}" aria-pressed="${s===k}">${IC[k]}<span>${STATUS[k]}</span></button>`).join('')}</div>
  <button class="favrow" data-pfav aria-pressed="${!!b.fav}">${IC.heart}<span>${b.fav?'In your favourites':'Add to favourites'}</span></button>`;
  const tags=tagsOf(b.genre);
  $('#pfRight').innerHTML=`<div class="catalog"><span>No. <b>${sh.abbr} · ${authKey(b)} · ${String(seq).padStart(3,'0')}</b></span><span>Shelf: <b>${esc(sh.key)}</b></span></div>
  <h2 class="pf-title" id="pfT">${esc(b.title)}</h2>
  <p class="pf-author">by <b>${esc(b.author)}</b></p>
  <div class="ptags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')||'<span>No genre</span>'}</div>
  <h3>About this volume</h3>
  <p class="pf-desc">${esc(b.description)||'<em>No description yet.</em>'}</p>
  ${needsCheck(b)?'<p class="verify">Some details here were marked for checking. Edit the book once you have confirmed them against the cover or title page.</p>':''}
  <dl class="pf-meta"><dt>Status</dt><dd>${STATUS[s]}${b.statusAt&&s!=='yet'?` since ${fmtDate(b.statusAt)}`:''}</dd><dt>Added</dt><dd>${fmtDate(b.addedAt)||'Unknown'}</dd></dl>
  ${hasPdf(b)||S.canWrite?`<div class="pfacts">${pdfButton(b)}${S.canWrite?`<button class="btn" data-pdfq="${esc(b.id)}">${hasPdf(b)?'Replace or remove PDF':'Add a PDF'}</button>`:''}</div>`:''}
  ${S.confirmDel?`<div class="confirm" role="alertdialog" aria-label="Confirm removal"><p>Remove <b>${esc(b.title)}</b> from the library? This cannot be undone from here.</p><div class="row"><button class="btn" data-delno>Keep it</button><button class="btn danger solid" data-delyes>Remove book</button></div></div>`
  :`<div class="pfacts w-only"><button class="btn solid" data-edit>${IC.pen}Edit</button><button class="btn danger" data-del>${IC.bin}Delete</button></div>`}`;
  const ids=S.order,multi=ids.length>1&&ids.includes(b.id);$('#pPrev').hidden=$('#pNext').hidden=!multi;
}
function refreshProfile(){const b=get(S.openId);if(!b){closeModal($('#m-profile'));return}fillProfile(b)}
$('#m-profile').addEventListener('click',e=>{
  const t=e.target,id=S.openId;if(!id)return;
  const ps=t.closest('[data-pst]');if(ps){setStatus(id,ps.dataset.pst,ps);return}
  if(t.closest('[data-pfav]')){toggleFav(id,t.closest('[data-pfav]'));return}
  if(t.closest('[data-edit]')){closeModal($('#m-profile'));openForm(id);return}
  if(t.closest('[data-del]')){S.confirmDel=true;refreshProfile();return}
  if(t.closest('[data-delno]')){S.confirmDel=false;refreshProfile();return}
  if(t.closest('[data-delyes]')){deleteBook(id)}
});
async function deleteBook(id){
  const b=get(id);if(!b||!guard())return;
  const copy={...b};delete copy.id;
  S.books=S.books.filter(x=>x.id!==id);closeModal($('#m-profile'));renderAll();
  try{
    await dbRetry(()=>S.col.doc(id).delete());
    toast(`Removed “${b.title}”.`,{action:'Undo',ttl:9000,fn:async()=>{try{await S.col.doc(id).set(copy);toast('Restored.')}catch(e){toast('Could not restore the book.')}}});
  }catch(e){S.books.push(b);renderAll();toast('The book could not be removed. Please try again.')}
}

/* ---------- add / edit form ---------- */
const F={id:null,cover:'',status:'yet'};
function openForm(id){
  if(!S.canWrite||!S.col){toast('You have read-only access to this library.');return}
  const b=id?get(id):null;
  F.id=b?b.id:null;F.cover=b?b.cover||'':'';F.status=b?st(b):'yet';F.tone=b?b.tone||'':'';F.old=b||null;F.pdf={mode:'keep',url:'',file:null};
  $('#formH').textContent=b?'Edit book':'Add a book';
  $('#formSub').textContent=b?'Changes are saved to the library straight away.':'It will appear on the right shelf automatically.';
  $('#fTitle').value=b?b.title:'';$('#fAuthor').value=b?b.author:'';$('#fGenre').value=b?b.genre:'';$('#fDesc').value=b?b.description:'';
  $('#fCover').value='';$('#fSave').textContent=b?'Save changes':'Add to library';
  ['#fTitle','#fAuthor'].forEach(s=>$(s).removeAttribute('aria-invalid'));
  drawFormBits();drawPdf();
  const tc={};S.books.forEach(x=>tagsOf(x.genre).forEach(t=>{if(!/^unverified|^likely/i.test(t))tc[t]=(tc[t]||0)+1}));
  $('#tagpick').innerHTML=Object.entries(tc).sort((a,c)=>c[1]-a[1]).slice(0,14).map(([t])=>`<button type="button" data-tag="${esc(t)}">+ ${esc(t)}</button>`).join('');
  openModal($('#m-form'));
}
function drawFormBits(){
  $('#fStatus').innerHTML=KEYS.map(k=>`<label><input type="radio" name="fs" value="${k}" ${F.status===k?'checked':''}>${STATUS[k]}</label>`).join('');
  $('#fCoverPrev').innerHTML=coverHTML({title:$('#fTitle').value||'Your title',author:$('#fAuthor').value||'Author',genre:$('#fGenre').value,cover:F.cover});
  $('#fCoverReset').hidden=!F.cover;
  updShelf();
}
function updShelf(){
  const g=$('#fGenre').value;$('#fShelf').innerHTML=g.trim()?`Shelf: <b>${esc(shelfOf({genre:g}).key)}</b>. Separate genres with semicolons. The first one that fits decides the shelf.`:'Separate genres with semicolons. The first one that fits decides the shelf.';
  const t=$('#fTitle').value.trim().toLowerCase(),a=$('#fAuthor').value.trim().toLowerCase(),d=$('#fDupe');
  const dup=t&&S.books.some(b=>b.id!==F.id&&(b.title||'').toLowerCase()===t&&(b.author||'').toLowerCase()===a);
  d.hidden=!dup;if(dup)d.textContent='This title by this author is already in your library.';
}
['#fTitle','#fAuthor'].forEach(s=>$(s).addEventListener('input',()=>{$(s).removeAttribute('aria-invalid');$('#fCoverPrev').innerHTML=coverHTML({title:$('#fTitle').value||'Your title',author:$('#fAuthor').value||'Author',genre:$('#fGenre').value,cover:F.cover});updShelf()}));
$('#fGenre').addEventListener('input',()=>{updShelf();$('#fCoverPrev').innerHTML=coverHTML({title:$('#fTitle').value||'Your title',author:$('#fAuthor').value||'Author',genre:$('#fGenre').value,cover:F.cover})});
$('#tagpick').addEventListener('click',e=>{
  const b=e.target.closest('[data-tag]');if(!b)return;
  const cur=tagsOf($('#fGenre').value);if(!cur.includes(b.dataset.tag))cur.push(b.dataset.tag);
  $('#fGenre').value=cur.join('; ');updShelf();
});
$('#fStatus').addEventListener('change',e=>{if(e.target.name==='fs')F.status=e.target.value});
$('#fCoverReset').onclick=()=>{F.cover='';F.tone='';$('#fCover').value='';drawFormBits()};
$('#fCover').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{F.cover=await fileToCover(f);F.tone=await toneOf(F.cover);drawFormBits()}catch(err){toast('That image could not be read. Try a JPG or PNG.')}
});
function fileToCover(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{
      const W=360,H=540,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
      const r=Math.max(W/im.width,H/im.height),w=im.width*r,h=im.height*r;x.fillStyle='#1c1510';x.fillRect(0,0,W,H);x.drawImage(im,(W-w)/2,(H-h)/2,w,h);
      URL.revokeObjectURL(url);let q=.84,d=c.toDataURL('image/jpeg',q);
      while(d.length>180000&&q>.4){q-=.12;d=c.toDataURL('image/jpeg',q)}
      res(d);
    };
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'))};im.src=url;
  });
}
const newId=()=>'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
$('#bookForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const title=$('#fTitle').value.trim(),author=$('#fAuthor').value.trim();
  if(!title||!author){const el=$(!title?'#fTitle':'#fAuthor');el.setAttribute('aria-invalid','true');el.focus();return}
  if(!guard())return;
  const data={title,author,genre:$('#fGenre').value.trim(),description:$('#fDesc').value.trim(),status:F.status,cover:F.cover||'',tone:F.cover?(F.tone||''):''};
  const btn=$('#fSave');btn.disabled=true;
  try{
    if(F.id){
      const b=get(F.id),changed=b&&st(b)!==data.status;
      if(changed)data.statusAt=Date.now();
      await applyPdf(data,F.id);
      await dbRetry(()=>S.col.doc(F.id).update(data));
      if(b)Object.assign(b,data);
      closeModal($('#m-form'));S.pop=F.id;renderAll();toast('Changes saved.',{ttl:2500});
    }else{
      const id=newId();Object.assign(data,{fav:false,addedAt:Date.now()});if(data.status!=='yet')data.statusAt=Date.now();
      await applyPdf(data,id);
      await dbRetry(()=>S.col.doc(id).set(data));
      if(!get(id))S.books.push({...data,id});
      const nb={...data,id};
      if(S.f.status!=='all'&&!(S.f.status==='fav'?nb.fav:st(nb)===S.f.status))S.f.status='all';
      if(S.f.genre!=='all'&&shelfOf(nb).key!==S.f.genre)S.f.genre='all';
      if(S.f.q.trim()&&!(title+author).toLowerCase().includes(S.f.q.trim().toLowerCase())){S.f.q='';$('#q').value=''}
      closeModal($('#m-form'));S.justAdded=id;renderAll();
      wSay(`A fine addition: “${title}”. Shelved under ${shelfOf(nb).key}.`,8000);
    }
  }catch(err){toast(err&&err.code==='bad_link'?'Enter a PDF link that starts with https://':err&&err.code==='quota_exceeded'?'The library is full. Remove a book or ask the owner to free space.':'That could not be saved. Please try again.')}
  btn.disabled=false;
});

/* ---------- Excel import / export ---------- */
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const COLS={title:['book title','book name','title','name'],author:['author','author name','authors'],genre:['genre','genres','category'],desc:['about the book','book description','description','about','synopsis','summary'],status:['reading status','status'],fav:['favourite','favorite','favourites']};
let importItems=[];
function openImport(){
  if(!S.canWrite||!S.col){toast('You have read-only access to this library.');return}
  $('#impOut').innerHTML='';$('#impFile').value='';$('#drop').hidden=false;openModal($('#m-import'));
}
function mapStatus(v){
  const s=norm(v);if(!s)return'yet';
  if(/yet|not started|unread|to read|want/.test(s))return'yet';
  if(/current|progress|reading/.test(s))return'reading';
  if(/read|finish|complete|done/.test(s))return'read';
  return'yet';
}
async function parseFile(file){
  if(!window.XLSX)throw new Error('The spreadsheet reader did not load. Check your connection and reload.');
  const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  if(!rows.length)throw new Error('That file has no rows.');
  const keys=Object.keys(rows[0]),find=n=>keys.find(k=>COLS[n].includes(norm(k)));
  const K={title:find('title'),author:find('author'),genre:find('genre'),desc:find('desc'),status:find('status'),fav:find('fav')};
  if(!K.title)throw new Error('No "Book Title" column found. Check the header row.');
  const have=new Set(S.books.map(b=>norm(b.title)+'|'+norm(b.author))),seen=new Set(),items=[];let dup=0,blank=0;
  rows.forEach(r=>{
    const title=String(r[K.title]||'').trim();if(!title){blank++;return}
    const author=K.author?String(r[K.author]||'').trim():'',key=norm(title)+'|'+norm(author);
    if(have.has(key)||seen.has(key)){dup++;return}seen.add(key);
    items.push({title,author,genre:K.genre?String(r[K.genre]||'').trim():'',description:K.desc?String(r[K.desc]||'').trim():'',status:K.status?mapStatus(r[K.status]):'yet',fav:K.fav?/^(y|yes|true|1|x|★)/i.test(String(r[K.fav]).trim()):false});
  });
  return{items,dup,blank,total:rows.length};
}
async function handleImport(file){
  const out=$('#impOut');out.innerHTML='<p class="muted" style="margin-top:14px">Reading the spreadsheet…</p>';
  try{
    const r=await parseFile(file);importItems=r.items;
    if(!r.items.length){out.innerHTML=`<p style="margin-top:16px">Nothing new to import. ${r.dup} ${plural(r.dup,'book is','books are')} already in the library.</p><div class="formbtns"><button class="btn" data-close>Close</button></div>`;return}
    $('#drop').hidden=true;
    out.innerHTML=`<p style="margin-top:16px"><b style="color:var(--gold-hi)">${r.items.length}</b> new ${plural(r.items.length,'book','books')} found${r.dup?`, ${r.dup} already in the library will be skipped`:''}${r.blank?`, ${r.blank} blank ${plural(r.blank,'row','rows')} ignored`:''}.</p>
    <div class="prev">${r.items.slice(0,8).map(i=>`<div><span>${esc(i.title)}</span><span class="muted">${esc(shelfOf(i).key)}</span></div>`).join('')}${r.items.length>8?`<div><span class="muted">and ${r.items.length-8} more</span><span></span></div>`:''}</div>
    <div class="prog" id="impProg" hidden><i></i></div>
    <div class="formbtns"><button class="btn" data-close id="impCancel">Cancel</button><button class="btn solid" id="impGo">Import ${r.items.length} ${plural(r.items.length,'book','books')}</button></div>`;
    $('#impGo').onclick=runImport;
  }catch(err){out.innerHTML=`<p style="margin-top:16px;color:#f0b1a9">${esc(err.message||'That file could not be read.')}</p>`}
}
async function runImport(){
  if(!guard())return;
  const items=importItems,prog=$('#impProg');prog.hidden=false;$('#impGo').disabled=true;$('#impCancel').disabled=true;
  const base=Date.now();let done=0,fail=0;
  for(let i=0;i<items.length;i+=6){
    await Promise.all(items.slice(i,i+6).map(async(it,j)=>{
      const id=newId(),data={...it,cover:'',addedAt:base+i+j};if(data.status!=='yet')data.statusAt=base;
      try{await dbRetry(()=>S.col.doc(id).set(data));if(!get(id))S.books.push({...data,id})}catch(e){fail++}
    }));
    done=Math.min(items.length,i+6);prog.firstElementChild.style.width=(done/items.length*100)+'%';
  }
  S.f.status='all';S.f.genre='all';S.f.q='';$('#q').value='';S.animNext=true;renderAll();
  closeModal($('#m-import'));
  toast(fail?`Imported ${items.length-fail} books. ${fail} could not be saved.`:`Imported ${items.length} ${plural(items.length,'book','books')}.`);
  if(items.length-fail>0){burst(innerWidth/2,innerHeight/3,70);wSay(`${items.length-fail} new volumes shelved. What a collection.`,8000)}
}
const drop=$('#drop');
$('#impFile').addEventListener('change',e=>{const f=e.target.files[0];f&&handleImport(f)});
['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files[0];f&&handleImport(f)});

async function initExport(){
  const dl=await use('downloads');
  if(!dl&&!S.local){await sleep(1500);if(!S.local)return}
  const btn=$('#exportBtn');btn.hidden=false;
  btn.onclick=async()=>{
    if(!window.XLSX){toast('The spreadsheet writer did not load. Reload and try again.');return}
    if(!S.books.length){toast('There is nothing to export yet.');return}
    const rows=[...S.books].sort((a,b)=>(a.addedAt||0)-(b.addedAt||0)).map(b=>({'Book Title':b.title,'Author':b.author,'Genre':b.genre,'About the Book':b.description,'Reading Status':STATUS[st(b)],'Favourite':b.fav?'Yes':'No','Date Added':fmtDate(b.addedAt)}));
    const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:34},{wch:26},{wch:34},{wch:80},{wch:18},{wch:10},{wch:14}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Book Catalogue');
    const data=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    try{
      if(dl)await dl.save({filename:'bibliotheca-catalogue.xlsx',data:new Uint8Array(data)});
      else XLSX.writeFile(wb,'bibliotheca-catalogue.xlsx');
    }catch(e){if(e&&e.code!=='declined')toast('The file could not be saved here.')}
  };
}

/* ---------- lights ---------- */
const dim=$('#dim');
function applyLights(){
  const L=S.light,a=L.on?(1-L.b)*.85:.82;
  dim.style.setProperty('--dimA',a.toFixed(3));dim.classList.toggle('cursor',!!L.cursor&&HOVER);
  document.documentElement.style.setProperty('--glow',L.on?1:0);
  $('#lamp').setAttribute('aria-pressed',String(L.on));$('#lOn').checked=L.on;$('#lB').value=Math.round(L.b*100);$('#lBv').textContent=Math.round(L.b*100)+'%';$('#lC').checked=!!L.cursor;
  const bulb=$('.bulb');bulb&&bulb.setAttribute('fill',L.on?'#ffe3a2':'#6b5a33');
  store.set('rr-light',L);
}
function toggleLights(show){
  const p=$('#lights'),v=show===undefined?p.hidden:show;p.hidden=!v;$('#lightsBtn').setAttribute('aria-expanded',String(v));
}
$('#lamp').onclick=()=>{S.light.on=!S.light.on;applyLights();owlSay(S.light.on?'Lamp on. Lovely.':'Lamp off. Mind the steps.')};
$('#lOn').onchange=e=>{S.light.on=e.target.checked;applyLights()};
$('#lB').oninput=e=>{S.light.b=e.target.value/100;if(!S.light.on)S.light.on=true;applyLights()};
$('#lC').onchange=e=>{S.light.cursor=e.target.checked;applyLights()};
if(!HOVER)$('#candleRow').hidden=true;
let px=innerWidth/2,py=innerHeight/3,pq=0;
addEventListener('pointermove',e=>{
  px=e.clientX;py=e.clientY;
  if(!pq)pq=requestAnimationFrame(()=>{pq=0;dim.style.setProperty('--mx',px+'px');dim.style.setProperty('--my',py+'px');owlEyes()});
},{passive:true});

/* ---------- sparkles ---------- */
const fx=$('#fx'),fctx=fx.getContext('2d');let parts=[],fraf=0;
function burst(x,y,n){
  if(RM)return;
  const d=Math.min(2,devicePixelRatio||1);fx.width=innerWidth*d;fx.height=innerHeight*d;fctx.setTransform(d,0,0,d,0,0);
  const cols=['#e6cc85','#c9a24b','#f4e3ad','#fff6d6','#9bb07c'];
  for(let i=0;i<n;i++){const a=Math.random()*6.283,v=2+Math.random()*7;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,r:2+Math.random()*3.6,l:1,c:rand(cols),s:Math.random()<.55,rot:Math.random()*6})}
  if(!fraf)fraf=requestAnimationFrame(fxFrame);
}
function fxFrame(){
  fctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.l>0);
  for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.vx*=.985;p.l-=.014;p.rot+=.12;
    fctx.globalAlpha=Math.max(0,p.l);fctx.fillStyle=p.c;fctx.save();fctx.translate(p.x,p.y);fctx.rotate(p.rot);
    if(p.s){fctx.beginPath();const r=p.r*1.6;fctx.moveTo(0,-r);fctx.quadraticCurveTo(0,0,r,0);fctx.quadraticCurveTo(0,0,0,r);fctx.quadraticCurveTo(0,0,-r,0);fctx.quadraticCurveTo(0,0,0,-r);fctx.fill()}
    else{fctx.beginPath();fctx.arc(0,0,p.r*.6,0,6.283);fctx.fill()}
    fctx.restore();
  }
  fctx.globalAlpha=1;
  if(parts.length)fraf=requestAnimationFrame(fxFrame);else{fraf=0;fctx.clearRect(0,0,innerWidth,innerHeight)}
}

/* ---------- floating dust ---------- */
function initDust(){
  const c=$('#dust'),ctx=c.getContext('2d');let w=0,h=0,ps=[],vis=true,raf=0;
  const spr=document.createElement('canvas');spr.width=spr.height=32;
  const sx=spr.getContext('2d'),g=sx.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,230,170,1)');g.addColorStop(.4,'rgba(255,220,150,.35)');g.addColorStop(1,'rgba(255,220,150,0)');sx.fillStyle=g;sx.fillRect(0,0,32,32);
  const mk=init=>({x:Math.random()*w,y:init?Math.random()*h:h+10,r:1+Math.random()*3.2,vx:(Math.random()-.5)*.16,vy:-(.05+Math.random()*.2),ph:Math.random()*6.28,a:.25+Math.random()*.6});
  function size(){const r=c.parentElement.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);w=r.width;h=r.height;c.width=w*d;c.height=h*d;ctx.setTransform(d,0,0,d,0,0);ps=Array.from({length:Math.min(90,Math.round(w*h/12000))},()=>mk(true))}
  function draw(t){
    ctx.clearRect(0,0,w,h);
    for(const p of ps){
      p.x+=p.vx+Math.sin(t/2400+p.ph)*.07;p.y+=p.vy;if(p.y<-12)Object.assign(p,mk(false));
      ctx.globalAlpha=p.a*(.5+.5*Math.sin(t/950+p.ph));ctx.drawImage(spr,p.x-p.r*2,p.y-p.r*2,p.r*4,p.r*4);
    }
  }
  function frame(t){if(!vis||document.hidden){raf=0;return}draw(t);raf=requestAnimationFrame(frame)}
  size();
  if(RM){draw(1000);}
  else{
    new IntersectionObserver(es=>{vis=es[0].isIntersecting;S.heroVis=vis;if(vis&&!raf)raf=requestAnimationFrame(frame)}).observe($('#lobby'));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&vis&&!raf)raf=requestAnimationFrame(frame)});
  }
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{size();S.heroKey='';renderHero()},250)});
}

/* ---------- Mr. Hoot the owl ---------- */
let owlLines=[],owlI=0;
function owlSay(t){
  const b=$('#owlBubble'),x=$('#owlText');
  if(RM){x.textContent=t;return}
  b.classList.add('swap');setTimeout(()=>{x.textContent=t;b.classList.remove('swap')},260);
}
function facts(){
  const B=S.books,by=t=>B.find(b=>norm(b.title)===t),f=[],add=(t,s)=>{if(by(t))f.push(s)};
  add('animal farm','Animal Farm, on your shelves, was first published in 1945.');
  add('the great gatsby','The Great Gatsby appeared in 1925 and is set in the summer of 1922.');
  add('the swiss family robinson','The Swiss Family Robinson first appeared in 1812.');
  add('the alchemist','The Alchemist was first published in Portuguese in 1988.');
  add('white nights and other stories','Dostoevsky’s White Nights first appeared in 1848.');
  add('letters to a young poet','Rilke wrote those letters between 1903 and 1908.');
  add('the fall','Camus published The Fall in 1956.');
  add('project hail mary','Project Hail Mary was published in 2021.');
  add("rajmohan's wife",'Rajmohan’s Wife appeared in 1864 and is often called one of the first Indian novels in English.');
  add('beyond good and evil','Nietzsche published Beyond Good and Evil in 1886.');
  const c=counts();
  if(c.yet)f.push(`${c.yet} ${plural(c.yet,'volume is','volumes are')} still waiting to be opened.`);
  if(c.reading)f.push(`You are in the middle of ${c.reading} ${plural(c.reading,'book','books')}. Do not let them gather dust.`);
  if(c.read)f.push(`${c.read} finished so far. That is ${Math.round(c.read/Math.max(1,B.length)*100)}% of the room.`);
  f.push('The Dewey Decimal system was first published in 1876.','Many 1980s libraries searched by card catalogue: one drawer, one card per book.','Twenty pages a day adds up to about two dozen novels in a year.','A good bookmark saves more time than a good memory.');
  return f;
}
function greet(){
  const h=new Date().getHours(),g=h<5?'Good evening':h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const n=S.books.length;
  $('#owlText').textContent=`${g}${S.name?', '+S.name:''}. ${n?`Bibliotheca is open, with ${n} ${plural(n,'volume','volumes')} on the shelves.`:'Bibliotheca is open. Shall we fill the shelves?'}`;
}
function nextFact(){
  if(!owlLines.length||owlI>=owlLines.length){owlLines=facts().sort(()=>Math.random()-.5);owlI=0}
  owlSay(owlLines[owlI++]);
}
function owlEyes(){
  const o=$('#owl');if(!o)return;const r=o.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
  const dx=px-(r.left+r.width/2),dy=py-(r.top+r.height*.4),d=Math.hypot(dx,dy)||1,m=Math.min(1,d/220)*3.6;
  const tx=(dx/d*m).toFixed(2),ty=(dy/d*m).toFixed(2);
  $('#pupL').style.transform=$('#pupR').style.transform=`translate(${tx}px,${ty}px)`;
}
$('#owl').onclick=()=>{const o=$('#owl');o.classList.add('tilt');setTimeout(()=>o.classList.remove('tilt'),900);nextFact()};
setInterval(()=>{if(S.heroVis&&!document.hidden&&!modals.length)nextFact()},16000);

/* pull a book off the hero shelf now and then */
if(!RM)setInterval(()=>{
  if(!S.heroVis)return;const sp=$$('#hshelves button.spine');if(!sp.length)return;
  const el=rand(sp);el.classList.add('pulled');setTimeout(()=>el.classList.remove('pulled'),2200);
},4200);

/* ---------- Wendell the bookworm ---------- */
let wT=0;
function wShow(html,ttl){
  const bx=$('#wbubble');$('#wcontent').innerHTML=html;bx.hidden=false;bx.classList.remove('show');void bx.offsetWidth;bx.classList.add('show');
  clearTimeout(wT);if(ttl)wT=setTimeout(wHide,ttl);
}
function wHide(){clearTimeout(wT);$('#wbubble').hidden=true}
function wSay(msg,ttl=6000){wShow(`<p>${esc(msg)}</p>`,ttl)}
function pickSuggestion(){
  const yet=S.books.filter(b=>st(b)==='yet');if(!yet.length)return null;
  const liked={};S.books.filter(b=>st(b)==='read'||b.fav).forEach(b=>{const k=shelfOf(b).key;liked[k]=(liked[k]||0)+(b.fav?2:1)});
  const top=Object.entries(liked).sort((a,b)=>b[1]-a[1])[0];
  let pool=yet.filter(b=>!S.sug.includes(b.id)),reason='This one has been waiting patiently.';
  if(!pool.length){S.sug=[];pool=yet}
  if(top){const ins=pool.filter(b=>shelfOf(b).key===top[0]);if(ins.length){pool=ins;reason=`You enjoy ${top[0].toLowerCase()}, so this may suit you.`}}
  const b=rand(pool);S.sug.push(b.id);return{b,reason};
}
function wSuggest(){
  const s=pickSuggestion();
  if(!s){wShow(`<p>${S.books.length?'You have opened every book. Time to add more?':'The shelves are bare. Shall we add a book?'}</p><div class="acts w-only"><button data-w="add">Add a book</button></div>`,12000);return}
  wShow(`<p>${esc(s.reason)}</p><div class="wb"><span class="mini">${coverHTML(s.b)}</span><div><b>${esc(s.b.title)}</b><small>${esc(s.b.author)}</small></div></div><div class="acts"><button data-w="start" data-id="${esc(s.b.id)}" class="w-only">Start reading</button><button data-w="view" data-id="${esc(s.b.id)}" class="alt">Details</button><button data-w="other" class="alt">Another</button></div>`,0);
}
$('#wormBtn').onclick=()=>{$('#wbubble').hidden?wSuggest():wHide()};
$('#wx').onclick=wHide;
$('#wbubble').addEventListener('click',e=>{
  const b=e.target.closest('[data-w]');if(!b)return;
  const a=b.dataset.w,id=b.dataset.id;
  if(a==='start'){setStatus(id,'reading',b)}else if(a==='view'){openProfile(id)}else if(a==='other'){wSuggest()}else if(a==='add'){openForm()}
});
setTimeout(()=>{if(S.ready&&S.books.length&&!modals.length&&$('#wbubble').hidden){wSay('Psst. Shall I suggest your next read? Tap me.',9000)}},14000);

/* ---------- the door ---------- */
let AC;
function thump(){
  try{
    AC=AC||new(window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;
    const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(52,t+.13);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.6,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+.32);
    const n=AC.createBuffer(1,Math.floor(AC.sampleRate*.04),AC.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const s=AC.createBufferSource(),ng=AC.createGain();s.buffer=n;ng.gain.value=.22;s.connect(ng);ng.connect(AC.destination);s.start(t);
  }catch(e){}
}
const door=$('#door'),gateEls=[$('header.top'),$('main'),$('#worm')];
let entering=false;
document.body.classList.add('gated');gateEls.forEach(e=>e.inert=true);
function knockAnim(){
  const k=$('#knocker'),l=$('#dLeaf');
  k.classList.remove('hit');l.classList.remove('shake');void k.offsetWidth;k.classList.add('hit');l.classList.add('shake');
}
function enterRoom(){
  if(entering)return;entering=true;
  const done=()=>{
    door.classList.add('gone');document.body.classList.remove('gated');gateEls.forEach(e=>e.inert=false);
    scrollTo(0,0);setTimeout(()=>door.remove(),RM?0:950);
  };
  if(RM){thump();done();return}
  [0,380,760].forEach(t=>setTimeout(()=>{thump();knockAnim()},t));
  setTimeout(()=>door.classList.add('open'),1250);
  setTimeout(()=>door.classList.add('entering'),1900);
  setTimeout(done,2700);
}
door.addEventListener('click',enterRoom);
document.addEventListener('keydown',e=>{if(!entering&&document.body.classList.contains('gated')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();enterRoom()}});
setTimeout(()=>{const k=$('#knocker');k&&k.focus({preventScroll:true})},50);


/* ================= old library additions ================= */
const hex2rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const shade=(h,f)=>'#'+hex2rgb(h).map(v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0')).join('');
function toneOf(src){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{try{const c=document.createElement('canvas');c.width=6;c.height=9;const x=c.getContext('2d');x.drawImage(im,0,0,6,9);const d=x.getImageData(0,0,6,9).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++}res('#'+[r,g,b].map(v=>Math.round(v/n*.85).toString(16).padStart(2,'0')).join(''))}catch(e){res('')}};
    im.onerror=()=>res('');im.src=src;
  });
}

/* ---------- standing books on bookcases ---------- */
function dims(b){
  const h=hash((b.title||'')+'|'+(b.author||'')),n=(b.title||'').length;
  const T=34+h%12+(n>22?10:0)+(n>34?10:0),D=132+((h>>6)%17)*2;
  return{T,D,H:Math.round(D*1.5)};
}
function bkHTML(b,i){
  const d=dims(b),p=palOf(b),s=st(b),sh=shelfOf(b),n=(b.title||'').length;
  const fs=n<=12?17:n<=20?15:n<=30?13:n<=42?11.5:10;
  const css=`--T:${d.T}px;--D:${d.D}px;--H:${d.H}px;--c1:${p.bg};--c2:${p.bg2};--ink:${p.ink};--acc:${p.acc};--i:${i}`;
  return `<button class="bk${S.justAdded===b.id?' arrive':''}${S.pop===b.id?' pop':''}" data-open data-id="${esc(b.id)}" data-st="${s}" style="${css}" aria-label="${esc(b.title)} by ${esc(b.author)}. ${STATUS[s]}"><span class="box"><span class="f f-spine"><i class="rb"></i><i class="sb t"></i><i class="sb b"></i><span class="s-title" style="font-size:${fs}px">${esc(b.title)}</span><span class="s-author">${esc(b.author)}</span><span class="s-emb">${sh.abbr}</span>${b.fav?`<span class="s-fav">${IC.heart}</span>`:''}</span><span class="f f-cover">${coverHTML(b)}</span><span class="f f-back"></span><span class="f f-edge"></span></span></button>`;
}
function chunkRows(books,avail){
  const rows=[];let cur=[],w=0;
  books.forEach(b=>{const t=dims(b).T+3;if(cur.length&&w+t>avail){rows.push(cur);cur=[];w=0}cur.push(b);w+=t});
  if(cur.length)rows.push(cur);return rows;
}
function renderShelves(list,f,lib){
  const avail=Math.max(260,(lib.clientWidth||innerWidth-32)-26-28-34);
  let html='<div class="libflow">',i=0;
  SHELVES.forEach(s=>{
    const g=list.filter(b=>shelfOf(b).key===s.key);if(!g.length)return;
    html+=`<div class="shelfblock" data-shelf="${esc(s.key)}"><div class="shelfhead"><h3>${esc(s.key)}</h3><span class="label">${g.length} ${plural(g.length,'volume','volumes')} · ${s.abbr}</span>${f.genre==='all'?`<button class="linkbtn" data-genre="${esc(s.key)}">Show only this shelf</button>`:''}</div><div class="case">`;
    chunkRows(g,avail).forEach((row,ri,all)=>{
      html+=`<div class="shelfrow">${row.map(b=>{S.order.push(b.id);return bkHTML(b,i++)}).join('')}${ri===all.length-1?'<i class="bookend" aria-hidden="true"></i>':''}</div>`;
    });
    html+='</div></div>';
  });
  return html+'</div>';
}

/* ---------- hover panel: pull a book out, show its story ---------- */
const hinfo=$('#hinfo');let hoverId=null,hideT=0,enterT=0;
function buildInfo(){
  const b=get(hoverId);if(!b)return;
  const s=st(b),sh=shelfOf(b),seq=seqMap().get(b.id)||0;
  hinfo.innerHTML=`<div class="hi-top"><span>${sh.abbr} · ${authKey(b)} · ${String(seq).padStart(3,'0')}</span><span>${esc(sh.key)}</span></div><h4>${esc(b.title)}</h4><p class="by">${esc(b.author)}</p><div class="tg">${tagsOf(b.genre).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="ds">${esc(b.description)||'No description yet.'}</p>
  <div class="hs" role="group" aria-label="Reading status">${KEYS.map(k=>`<button data-hst="${k}" aria-pressed="${s===k}">${IC[k]}<span>${STATUS[k]}</span></button>`).join('')}<button class="fv" data-hfav aria-pressed="${!!b.fav}" aria-label="Favourite">${IC.heart}</button></div>
  <button class="btn solid go" data-hopen>Open the book</button>${hasPdf(b)?`<button class="btn go" data-readpdf="${esc(b.id)}">Read PDF</button>`:S.canWrite?`<button class="btn go" data-pdfq="${esc(b.id)}">Add a PDF</button>`:''}`;
}
function positionInfo(el){
  const r=el.getBoundingClientRect(),d=dims(get(hoverId)||{title:'',author:''}),cx=r.left+r.width/2,W=290;
  let left=cx+d.D/2+12,right=true;
  if(left+W>innerWidth-8){left=cx-d.D/2-12-W;right=false}
  left=Math.max(8,left);
  hinfo.style.setProperty('--dx',right?'-14px':'14px');hinfo.style.setProperty('--ox',right?'left':'right');
  hinfo.style.left=left+'px';hinfo.style.top='0px';
  const h=hinfo.offsetHeight;let top=Math.max(8,Math.min(r.top-10,innerHeight-h-8));
  hinfo.style.top=top+'px';
}
function showInfo(el){
  clearTimeout(hideT);
  const id=el.dataset.id;
  $$('#lib .bk.pulled').forEach(x=>{if(x!==el)x.classList.remove('pulled')});
  hoverId=id;el.classList.add('pulled');buildInfo();hinfo.hidden=false;positionInfo(el);
  requestAnimationFrame(()=>hinfo.classList.add('on'));
}
function hideInfo(now){
  clearTimeout(enterT);clearTimeout(hideT);
  hideT=setTimeout(()=>{
    hoverId=null;hinfo.classList.remove('on');
    $$('#lib .bk.pulled').forEach(x=>x.classList.remove('pulled'));
    setTimeout(()=>{if(!hoverId)hinfo.hidden=true},300);
  },now?0:280);
}
function restoreHover(){
  if(!hoverId)return;
  const el=$(`#lib .bk[data-id="${CSS.escape(hoverId)}"]`);
  if(!el){hideInfo(true);return}
  el.classList.add('instant','pulled');buildInfo();positionInfo(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('instant')));
}
const libEl=$('#lib');
libEl.addEventListener('pointerover',e=>{
  if(e.pointerType==='touch')return;const bk=e.target.closest('.bk');if(!bk)return;
  clearTimeout(hideT);clearTimeout(enterT);
  if(bk.classList.contains('pulled'))return;
  enterT=setTimeout(()=>showInfo(bk),hoverId?30:110);
});
libEl.addEventListener('pointerout',e=>{
  const bk=e.target.closest('.bk');if(!bk)return;
  const to=e.relatedTarget;if(to&&(bk.contains(to)||(to.closest&&to.closest('#hinfo'))))return;
  clearTimeout(enterT);if(bk.classList.contains('pulled'))hideInfo();
});
libEl.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse')return;const bk=e.target.closest('.bk.pulled');if(!bk)return;
  const r=bk.getBoundingClientRect(),dx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/90)),dy=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/120));
  bk.style.setProperty('--ry',(dx*9).toFixed(1)+'deg');bk.style.setProperty('--rx',(-dy*7).toFixed(1)+'deg');
},{passive:true});
libEl.addEventListener('focusin',e=>{const bk=e.target.closest&&e.target.closest('.bk');if(bk&&e.target.matches(':focus-visible'))showInfo(bk)});
libEl.addEventListener('focusout',e=>{const bk=e.target.closest&&e.target.closest('.bk');if(bk&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('#hinfo')))hideInfo()});
hinfo.addEventListener('pointerenter',()=>clearTimeout(hideT));
hinfo.addEventListener('pointerleave',()=>hideInfo());
hinfo.addEventListener('click',e=>{
  const id=hoverId;if(!id)return;
  const s=e.target.closest('[data-hst]');if(s){setStatus(id,s.dataset.hst,s);return}
  const f=e.target.closest('[data-hfav]');if(f){toggleFav(id,f);return}
  if(e.target.closest('[data-hopen]')){hideInfo(true);openProfile(id)}
});
addEventListener('scroll',()=>{if(hoverId)hideInfo(true)},{passive:true});
let lastW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-lastW)>40){lastW=innerWidth;hideInfo(true);S.heroKey='';renderAll()}});

/* ---------- PDFs ---------- */
const hasPdf=b=>!!(b.pdf||b.pdfKind==='local');
const safeUrl=u=>/^https?:\/\//i.test(u||'')||/^\/[^/]/.test(u||'');
function idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('rr-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('pdf');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
async function idbPut(k,v){const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('pdf','readwrite');t.objectStore('pdf').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('pdf').objectStore('pdf').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbDel(k){try{const db=await idb();db.transaction('pdf','readwrite').objectStore('pdf').delete(k)}catch(e){}}
async function openLocalPdf(id){
  try{const blob=await idbGet(id);if(!blob){toast('That PDF is not stored in this browser.');return}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
  }catch(e){toast('The PDF could not be opened.')}
}
function pdfButton(b){
  if(!hasPdf(b))return'';
  if(b.pdfKind!=='local'&&!safeUrl(b.pdf))return'';
  return`<button class="btn solid pdfbtn" data-readpdf="${esc(b.id)}">${IC.read}Read as a book</button>`;
}
document.addEventListener('click',e=>{const l=e.target.closest('[data-pdflocal]');if(l)openLocalPdf(l.dataset.pdflocal)});
let ASSETS=null;
async function storePdf(file,id){
  if(ASSETS){const r=await ASSETS.upload(file);return{pdf:r.url,pdfAsset:r.id,pdfKind:'asset',pdfName:file.name}}
  await idbPut(id,file);return{pdf:'',pdfAsset:'',pdfKind:'local',pdfName:file.name};
}
async function dropOldPdf(b){
  if(!b)return;
  if(b.pdfKind==='asset'&&b.pdfAsset&&ASSETS){try{await ASSETS.delete(b.pdfAsset)}catch(e){}}
  if(b.pdfKind==='local')idbDel(b.id);
}
function drawPdf(){
  const b=F.old,has=b&&hasPdf(b),canUp=true;
  const modes=[['keep',has?'Keep current':'None'],...(has?[['none','Remove']]:[]),...(canUp?[['upload','Upload a PDF']]:[]),['link','Paste a link']];
  if(!has)modes.splice(0,1,['none','None']);
  if(!modes.some(m=>m[0]===F.pdf.mode))F.pdf.mode=has?'keep':'none';
  $('#fPdfMode').innerHTML=modes.map(([k,l])=>`<label><input type="radio" name="fp" value="${k}" ${F.pdf.mode===k?'checked':''}>${l}</label>`).join('');
  let body='';
  if(F.pdf.mode==='keep'&&has)body=`<div class="pdfcur">${IC.read}<span>${esc(b.pdfName||'PDF attached')}</span></div>`;
  if(F.pdf.mode==='upload')body=`<input type="file" id="fPdfFile" accept="application/pdf,.pdf" aria-label="Choose a PDF file"><div class="pdfcur">${F.pdf.file?esc(F.pdf.file.name):''}</div>`;
  if(F.pdf.mode==='link')body=`<input type="url" id="fPdfUrl" placeholder="https://example.com/book.pdf" aria-label="PDF link" value="${esc(F.pdf.url)}">`;
  $('#fPdfBody').innerHTML=body;
  $('#fPdfHint').textContent=F.pdf.mode==='upload'?(ASSETS?'Up to 20 MB. The PDF is stored with the library, so everyone you share it with can read it.':'Stored in this browser only. Use a link if you share this library.'):F.pdf.mode==='link'?'Links must start with https://. The PDF opens in a new tab.':'';
}
document.addEventListener('change',e=>{
  if(e.target.name==='fp'){F.pdf.mode=e.target.value;drawPdf()}
  if(e.target.id==='fPdfFile'){const f=e.target.files[0];if(f&&f.size>20*1048576){toast('That PDF is over 20 MB.');e.target.value='';return}F.pdf.file=f||null;drawPdf()}
});
document.addEventListener('input',e=>{if(e.target.id==='fPdfUrl')F.pdf.url=e.target.value.trim()});
async function applyPdf(data,id){
  const m=F.pdf.mode,old=F.old;
  if(m==='keep')return;
  if(m==='none'){await dropOldPdf(old);Object.assign(data,{pdf:'',pdfAsset:'',pdfKind:'',pdfName:''});return}
  if(m==='link'){
    if(!/^https?:\/\//i.test(F.pdf.url))throw Object.assign(new Error('link'),{code:'bad_link'});
    await dropOldPdf(old);let host='';try{host=new URL(F.pdf.url).hostname}catch(e){}
    Object.assign(data,{pdf:F.pdf.url,pdfAsset:'',pdfKind:'link',pdfName:host||'PDF link'});return;
  }
  if(m==='upload'){
    if(!F.pdf.file)return;
    await dropOldPdf(old);Object.assign(data,await storePdf(F.pdf.file,id));
  }
}

/* ---------- card catalogue ---------- */
function surname(a){const w=String(a||'').replace(/\./g,' ').trim().split(/\s+/);return(w[w.length-1]||'#')}
let catLetter='A';
function openCatalogue(){
  if(!S.books.length){toast('Add some books first.');return}
  const L=[...new Set(S.books.map(b=>surname(b.author).charAt(0).toUpperCase()))].sort();
  if(!L.includes(catLetter))catLetter=L[0];
  drawCat(L);openModal($('#m-cat'));
}
function drawCat(L){
  L=L||[...new Set(S.books.map(b=>surname(b.author).charAt(0).toUpperCase()))].sort();
  $('#catTabs').innerHTML=L.map(l=>`<button data-cl="${esc(l)}" aria-pressed="${l===catLetter}">${esc(/[A-Z]/.test(l)?l:'#')}</button>`).join('');
  const seq=seqMap(),list=S.books.filter(b=>surname(b.author).charAt(0).toUpperCase()===catLetter).sort((a,b)=>surname(a.author).localeCompare(surname(b.author))||(a.title||'').localeCompare(b.title||''));
  $('#catGrid').innerHTML=list.map(b=>{const sh=shelfOf(b),s=st(b);return`<button class="icard" data-open data-id="${esc(b.id)}"><span class="cn"><span>${sh.abbr} · ${authKey(b)} · ${String(seq.get(b.id)||0).padStart(3,'0')}</span><span>${esc(sh.key)}</span></span><b>${esc(b.author)}</b><span class="tt">${esc(b.title)}</span><i>${esc(tagsOf(b.genre).slice(0,2).join(' · '))}</i>${s!=='yet'?`<span class="stp ${s==='read'?'rd':''}">${s==='read'?'Returned':'On loan'}</span>`:''}</button>`}).join('');
}
$('#catTabs').addEventListener('click',e=>{const t=e.target.closest('[data-cl]');if(t){catLetter=t.dataset.cl;drawCat()}});
$('#m-cat').addEventListener('click',e=>{if(e.target.closest('.icard'))closeModal($('#m-cat'))});

/* ---------- archive ---------- */
function openArchive(){
  const l=S.books.filter(hasPdf).sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  $('#archList').innerHTML=l.length?l.map(b=>`<div class="arow" data-id="${esc(b.id)}"><span class="mini">${coverHTML(b)}</span><div><b>${esc(b.title)}</b><small>${esc(b.author)} · ${esc(b.pdfName||'PDF')}</small></div>${pdfButton(b)}<button class="btn" data-open data-aclose>Details</button></div>`).join(''):'<p class="empty-note">No PDFs yet. Open any book, choose Edit, and attach one, or use Covers &amp; PDFs to add many at once.</p>';
  openModal($('#m-arch'));
}
$('#m-arch').addEventListener('click',e=>{if(e.target.closest('[data-aclose]'))closeModal($('#m-arch'))});

/* ---------- bulk covers & PDFs ---------- */
let bulk=[];
const alnum=s=>norm(s).replace(/[^a-z0-9]/g,'');
function matchBook(name){
  const s=alnum(name.replace(/\.[^.]+$/,''));let best=null,bl=0;
  S.books.forEach(b=>{const t=alnum(b.title);if(t.length<3)return;if(s===t||s.includes(t)||(s.length>=5&&t.includes(s))){if(t.length>bl){best=b;bl=t.length}}});
  return best;
}
function openBulk(){
  if(!S.canWrite||!S.col){toast('You have read-only access to this library.');return}
  $('#bulkOut').innerHTML='';$('#bulkFiles').value='';$('#bdrop').hidden=false;bulk=[];openModal($('#m-bulk'));
}
function handleBulk(files){
  bulk=[...files].filter(f=>f.type.startsWith('image/')||/\.pdf$/i.test(f.name)).map(f=>({file:f,pdf:/\.pdf$/i.test(f.name)||f.type==='application/pdf',id:(matchBook(f.name)||{}).id||''}));
  if(!bulk.length){$('#bulkOut').innerHTML='<p style="margin-top:14px;color:#f0b1a9">Choose image files (JPG, PNG, WebP) or PDFs.</p>';return}
  const opts=[...S.books].sort((a,b)=>(a.title||'').localeCompare(b.title||'')).map(b=>`<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('');
  $('#bdrop').hidden=true;
  $('#bulkOut').innerHTML=`<p style="margin:16px 0 6px">${bulk.filter(x=>x.id).length} of ${bulk.length} files matched a book. Check the matches below.</p><div style="max-height:320px;overflow:auto">${bulk.map((x,i)=>`<div class="brow"><span title="${esc(x.file.name)}">${x.pdf?'PDF':'Cover'} · ${esc(x.file.name)}</span><select data-bi="${i}" aria-label="Book for ${esc(x.file.name)}"><option value="">Skip this file</option>${opts}</select></div>`).join('')}</div><div class="prog" id="bprog" hidden><i></i></div><div class="formbtns"><button class="btn" data-close>Cancel</button><button class="btn solid" id="bulkGo">Apply</button></div>`;
  $$('#bulkOut select').forEach((s,i)=>{s.value=bulk[i].id});
  $('#bulkGo').onclick=runBulk;
}
$('#bulkOut').addEventListener('change',e=>{const s=e.target.closest('[data-bi]');if(s)bulk[+s.dataset.bi].id=s.value});
async function runBulk(){
  if(!guard())return;
  const todo=bulk.filter(x=>x.id);if(!todo.length){toast('No files are matched to books yet.');return}
  $('#bulkGo').disabled=true;const prog=$('#bprog');prog.hidden=false;let ok=0,fail=0;
  for(let i=0;i<todo.length;i++){
    const x=todo[i],b=get(x.id);
    try{
      if(x.pdf){const data=await(async()=>{await dropOldPdf(b);return storePdf(x.file,x.id)})();await dbRetry(()=>S.col.doc(x.id).update(data));Object.assign(b,data)}
      else{const cover=await fileToCover(x.file),tone=await toneOf(cover);await dbRetry(()=>S.col.doc(x.id).update({cover,tone}));Object.assign(b,{cover,tone})}
      ok++;
    }catch(e){fail++}
    prog.firstElementChild.style.width=((i+1)/todo.length*100)+'%';
  }
  closeModal($('#m-bulk'));S.animNext=true;renderAll();
  toast(fail?`${ok} files added, ${fail} failed.`:`${ok} ${plural(ok,'file','files')} added to your books.`);
  if(ok){burst(innerWidth/2,innerHeight/3,60);wSay('The shelves look better already.',6000)}
}
const bd=$('#bdrop');
$('#bulkFiles').addEventListener('change',e=>handleBulk(e.target.files));
['dragenter','dragover'].forEach(n=>bd.addEventListener(n,e=>{e.preventDefault();bd.classList.add('over')}));
['dragleave','drop'].forEach(n=>bd.addEventListener(n,e=>{e.preventDefault();bd.classList.remove('over')}));
bd.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files.length)handleBulk(e.dataTransfer.files)});
$('#bulkBtn').onclick=openBulk;

/* ---------- props in the nook ---------- */
$('#pCat').onclick=openCatalogue;
$('#pArchive').onclick=openArchive;
$('#pQuill').onclick=()=>openForm();
$('#pGlobe').onclick=()=>{
  const g=$('#pGlobe');if(!S.books.length){toast('Add some books first.');return}
  g.classList.add('spinning');
  const yet=S.books.filter(b=>st(b)==='yet'),pool=yet.length?yet:S.books,b=rand(pool);
  setTimeout(()=>{g.classList.remove('spinning');const r=g.getBoundingClientRect();burst(r.left+r.width/2,r.top+30,26);owlSay(`The globe stops on “${b.title}”.`);openProfile(b.id)},RM?0:1500);
};
$('#pCandle').onclick=()=>{
  if(HOVER){S.light.cursor=!S.light.cursor;if(S.light.cursor){S.light.on=true;S.light.b=Math.min(S.light.b,.4)}applyLights();owlSay(S.light.cursor?'Candlelight. Move the flame where you like.':'Back to the house lights.')}
  else{S.light.on=!S.light.on;applyLights()}
};
function tick(){
  const d=new Date(),s=d.getSeconds(),m=d.getMinutes()+s/60,h=(d.getHours()%12)+m/60;
  const set=(id,deg)=>{const e=$(id);e&&(e.style.transform=`rotate(${deg}deg)`)};
  set('#hH',h*30);set('#hM',m*6);set('#hS',s*6);
  const t=$('#clockTxt');if(t)t.textContent=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}
tick();setInterval(tick,1000);
use('assets').then(a=>{ASSETS=a});


/* ---------- script loader (local vendor first, then CDN) ---------- */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=()=>res();s.onerror=()=>{s.remove();rej(new Error('load'))};document.head.appendChild(s)})}
const libs={};
function loadLib(name,test,srcs,after){
  if(test())return Promise.resolve();
  return libs[name]||(libs[name]=(async()=>{
    for(const s of srcs){try{await loadScript(s);if(test()){after&&after(s);return}}catch(e){}}
    delete libs[name];throw new Error(name);
  })());
}
const PDFV='3.11.174';
const loadPdfjs=()=>loadLib('pdfjs',()=>!!window.pdfjsLib,['vendor/pdf.min.js',`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFV}/pdf.min.js`],s=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=s.startsWith('vendor/')?'vendor/pdf.worker.min.js':`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFV}/pdf.worker.min.js`});
const loadZx=()=>loadLib('zx',()=>!!window.ZXing,['vendor/zxing.min.js','https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js']);
const loadJsPdf=()=>loadLib('jspdf',()=>!!(window.jspdf&&window.jspdf.jsPDF),['vendor/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']);

/* ---------- page-turning reader ---------- */
const R={pdf:null,n:0,mode:'spread',pw:0,ph:0,cur:0,leaves:[],N:0,done:new Set(),tok:0,busy:false,book:null,snd:store.get('rr-snd',true)!==false};
function paper(kind){
  try{
    if(!R.snd)return;
    AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
    const t=AC.currentTime,dur=kind==='open'?.75:.6,len=Math.floor(AC.sampleRate*dur);
    const buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);let lp=0;
    for(let i=0;i<len;i++){
      const x=i/len,env=Math.pow(Math.sin(Math.PI*Math.min(1,x*1.1)),1.3);
      lp=lp*.55+(Math.random()*2-1)*.45;
      const crack=Math.random()<.02?(Math.random()*2-1)*2:0;
      d[i]=(lp*1.4+crack)*env*(.55+.45*Math.sin(x*70+Math.sin(x*17)*4));
    }
    const s=AC.createBufferSource(),hp=AC.createBiquadFilter(),bp=AC.createBiquadFilter(),g=AC.createGain();
    s.buffer=buf;hp.type='highpass';hp.frequency.value=500;bp.type='bandpass';bp.frequency.setValueAtTime(1100,t);bp.frequency.exponentialRampToValueAtTime(4200,t+dur*.7);bp.Q.value=.55;
    g.gain.value=.9;s.connect(hp);hp.connect(bp);bp.connect(g);g.connect(AC.destination);s.start(t);
    const o=AC.createOscillator(),og=AC.createGain(),at=t+dur*.62;
    o.type='sine';o.frequency.setValueAtTime(150,at);o.frequency.exponentialRampToValueAtTime(55,at+.12);
    og.gain.setValueAtTime(0,at);og.gain.linearRampToValueAtTime(.32,at+.012);og.gain.exponentialRampToValueAtTime(.001,at+.16);
    o.connect(og);og.connect(AC.destination);o.start(at);o.stop(at+.2);
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate([14,40,10])}catch(e){}
}
function rdSetSound(){const b=$('#rdSound');b.setAttribute('aria-pressed',R.snd);b.style.opacity=R.snd?1:.45;store.set('rr-snd',R.snd)}
$('#rdSound').onclick=()=>{R.snd=!R.snd;rdSetSound()};
const rdOpen=()=>!$('#m-read').hidden;
function rdFace(cls,inner,p){return`<div class="rd-face ${cls}" ${p?`data-p="${p}"`:''}>${inner||''}</div>`}
function buildBook(b){
  const bk=$('#rdBook'),sp=R.mode==='spread',n=R.n;
  R.N=1+(sp?Math.ceil(n/2):n);
  bk.className='rd-book nt';bk.style.width=(sp?R.pw*2:R.pw)+'px';bk.style.height=R.ph+'px';
  let h='';
  for(let k=0;k<R.N;k++){
    let fr,bkf;
    if(k===0){fr=rdFace('cv',coverHTML(b));bkf=rdFace('b endp','')}
    else if(sp){const a=2*k-1,c=2*k;fr=rdFace('f',a<=n?'':'',a<=n?a:0);bkf=rdFace('b',c<=n?'':'',c<=n?c:0);if(a>n)fr=rdFace('paper','');if(c>n)bkf=rdFace('b paper','')}
    else{fr=rdFace('f','',k);bkf=rdFace('b paper','')}
    h+=`<div class="rd-leaf" data-k="${k}" style="${sp?'left:50%;':'left:0;'}width:${R.pw}px">${fr}${bkf}</div>`;
  }
  bk.innerHTML=h;R.leaves=$$('.rd-leaf',bk);R.done=new Set();
  place();requestAnimationFrame(()=>requestAnimationFrame(()=>bk.classList.remove('nt')));
}
function place(){
  const sp=R.mode==='spread',bk=$('#rdBook');
  R.leaves.forEach((l,i)=>{const on=i<R.cur;l.classList.toggle('on',on);l.style.zIndex=on?i:R.N-i});
  const shift=sp?(R.cur===0?-R.pw/2:R.cur>=R.N?R.pw/2:0):0;
  bk.style.transform=`translateX(${shift}px)`;
  $('#rdStage').dataset.end=R.cur>=R.N?1:0;
  label();ensure();
}
function label(){
  const sp=R.mode==='spread',n=R.n,c=R.cur;let t;
  if(c===0)t='Front cover';
  else if(sp){const a=c-1>=1?2*(c-1):0,bb=2*c-1;t=c>=R.N?`Page ${Math.min(n,2*(R.N-1))} · The end`:(a?`Pages ${a}–${Math.min(bb,n)} of ${n}`:`Page 1 of ${n}`)}
  else t=c>=R.N?`Page ${n} · The end`:`Page ${c} of ${n}`;
  $('#rdPos').textContent=t;$('#rdRange').max=R.N;$('#rdRange').value=c;
  $('#rdPrev').disabled=c<=0;$('#rdNext').disabled=c>=R.N;
  const h=$('#rdHint');h.textContent=c===0?(R.mode==='spread'?'Click the cover to open':'Tap the cover to open'):'';
}
function pagesNear(){
  const sp=R.mode==='spread',s=new Set();
  for(let k=R.cur-2;k<=R.cur+2;k++){
    if(k<1||k>=R.N)continue;
    if(sp){s.add(2*k-1);s.add(2*k)}else s.add(k);
  }
  return s;
}
function ensure(){
  const want=pagesNear();
  for(const p of [...R.done])if(!want.has(p)){const f=$$(`.rd-face[data-p="${p}"]`);f.forEach(x=>x.innerHTML='');R.done.delete(p)}
  [...want].sort((a,b)=>a-b).forEach(p=>{if(p>=1&&p<=R.n&&!R.done.has(p)){R.done.add(p);drawPage(p,R.tok)}});
}
async function drawPage(p,tok){
  try{
    const page=await R.pdf.getPage(p);if(tok!==R.tok)return;
    const vp0=page.getViewport({scale:1}),dpr=Math.min(2,window.devicePixelRatio||1),sc=R.pw/vp0.width*dpr,vp=page.getViewport({scale:sc});
    const cv=document.createElement('canvas');cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
    await page.render({canvasContext:cv.getContext('2d'),viewport:vp,background:'#f6ecd0'}).promise;
    if(tok!==R.tok||!R.done.has(p))return;
    $$(`.rd-face[data-p="${p}"]`).forEach(f=>{f.innerHTML='';f.appendChild(cv.cloneNode(false));f.firstChild.getContext('2d').drawImage(cv,0,0);const s=document.createElement('span');s.className='rd-pn';s.textContent=p;f.appendChild(s)});
  }catch(e){R.done.delete(p)}
}
function turn(dir){
  if(R.busy||!R.pdf)return;
  const to=R.cur+dir;if(to<0||to>R.N)return;
  const l=R.leaves[dir>0?R.cur:R.cur-1];R.busy=true;
  l.style.zIndex=R.N+5;l.classList.add('turn');paper(R.cur===0&&dir>0?'open':'');
  R.cur=to;
  const sp=R.mode==='spread';
  $('#rdBook').style.transform=`translateX(${sp?(R.cur===0?-R.pw/2:R.cur>=R.N?R.pw/2:0):0}px)`;
  l.classList.toggle('on',dir>0);label();ensure();
  setTimeout(()=>{l.classList.remove('turn');place();R.busy=false},RM?20:960);
}
function jump(c){
  if(!R.pdf)return;c=Math.max(0,Math.min(R.N,c));if(c===R.cur)return;
  const bk=$('#rdBook');bk.classList.add('nt');R.cur=c;place();void bk.offsetWidth;requestAnimationFrame(()=>bk.classList.remove('nt'));
}
$('#rdNext').onclick=()=>turn(1);$('#rdPrev').onclick=()=>turn(-1);
$('#rdRange').oninput=e=>jump(+e.target.value);
(function(){
  const st=$('#rdStage');let sx=null,sy=0,moved=false;
  st.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;moved=false});
  st.addEventListener('pointerup',e=>{
    if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
    if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)){turn(dx<0?1:-1);return}
    if(Math.abs(dx)<8&&Math.abs(dy)<8){
      const r=$('#rdBook').getBoundingClientRect();if(!r.width)return;
      const fx=(e.clientX-r.left)/r.width;
      if(R.mode==='spread'){if(R.cur===0){if(fx>.5)turn(1)}else if(R.cur>=R.N){if(fx<.5)turn(-1)}else turn(fx<.5?-1:1)}
      else turn(fx<.3?-1:1);
    }
  });
})();
document.addEventListener('keydown',e=>{
  if(!rdOpen()||e.target.matches('input[type=text],input[type=search],textarea'))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();turn(1)}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();turn(-1)}
  else if(e.key==='Home'){e.preventDefault();jump(0)}
  else if(e.key==='End'){e.preventDefault();jump(R.N)}
},true);
function sizeBook(aspect){
  const st=$('#rdStage'),W=st.clientWidth,H=st.clientHeight;
  R.mode=W>=760&&W>H*1.05?'spread':'single';
  let ph=Math.min(H-26,1400),pw=ph*aspect;
  const maxW=R.mode==='spread'?(W-24)/2:W-20;
  if(pw>maxW){pw=maxW;ph=pw/aspect}
  R.pw=Math.floor(pw);R.ph=Math.floor(ph);
}
let rdAspect=.7,rdBook=null,rdW=0;
async function openReader(b){
  if(!b||!hasPdf(b))return;
  const tok=++R.tok;R.cur=0;R.pdf=null;rdBook=b;
  $('#rdTitle').innerHTML=`${esc(b.title)}<small>${esc(b.author)}</small>`;
  const ol=$('#rdOpen');if(b.pdfKind!=='local'&&safeUrl(b.pdf)){ol.href=b.pdf;ol.hidden=false}else ol.hidden=true;
  $('#rdBook').innerHTML='';$('#rdLoad').hidden=false;$('#rdHint').textContent='';
  rdSetSound();openModal($('#m-read'));
  try{
    await loadPdfjs();const lib=window.pdfjsLib;
    let task;
    if(b.pdfKind==='local'){const blob=await idbGet(b.id);if(!blob)throw Object.assign(new Error('missing'),{code:'missing'});task=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())})}
    else task=lib.getDocument({url:b.pdf});
    const pdf=await task.promise;if(tok!==R.tok){try{pdf.destroy()}catch(e){}return}
    const p1=await pdf.getPage(1),v=p1.getViewport({scale:1});
    R.pdf=pdf;R.n=pdf.numPages;rdAspect=v.width/v.height;
    $('#rdLoad').hidden=true;
    await new Promise(r=>requestAnimationFrame(r));
    sizeBook(rdAspect);rdW=$('#rdStage').clientWidth;buildBook(b);
  }catch(err){
    console.warn('reader',err&&err.message);$('#rdLoad').hidden=true;closeModal($('#m-read'));
    if(err&&err.code==='missing')toast('That PDF is not stored on this device. Open Edit and attach it again.');
    else if(b.pdfKind!=='local'&&safeUrl(b.pdf)){toast('That PDF could not be shown here, so it is opening in a new tab.');window.open(b.pdf,'_blank','noopener')}
    else toast('The PDF could not be opened. It may be damaged or password protected.');
  }
}
function rdCleanup(){R.tok++;try{R.pdf&&R.pdf.destroy()}catch(e){}R.pdf=null;R.done=new Set();$('#rdBook').innerHTML=''}
let rdT;addEventListener('resize',()=>{
  if(!rdOpen()||!R.pdf)return;clearTimeout(rdT);
  rdT=setTimeout(()=>{const w=$('#rdStage').clientWidth;if(Math.abs(w-rdW)<30&&R.mode===(w>=760?'spread':'single'))return;rdW=w;const c=R.cur;R.tok++;const tok=R.tok;sizeBook(rdAspect);R.cur=0;buildBook(rdBook);jump(Math.min(c,R.N))},220);
});
document.addEventListener('click',e=>{const l=e.target.closest('[data-readpdf]');if(!l)return;e.preventDefault();const b=get(l.dataset.readpdf);if(b)openReader(b)});

/* ---------- scanner ---------- */
const SC={stream:null,mode:'isbn',timer:0,det:null,zx:null,pages:[],busy:false,last:'',n:0};
const scMsg=t=>{$('#scMsg').textContent=t||''};
function isbnOK(s){
  s=String(s||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(s.length===13&&/^97[89]/.test(s)){let t=0;for(let i=0;i<12;i++)t+=(+s[i])*(i%2?3:1);return(10-t%10)%10===+s[12]?s:''}
  if(s.length===10){let t=0;for(let i=0;i<9;i++){if(!/\d/.test(s[i]))return'';t+=(+s[i])*(10-i)}const c=(11-t%11)%11;return(c===10?'X':String(c))===s[9]?s:''}
  return'';
}
function stopCam(){
  clearInterval(SC.timer);SC.timer=0;
  if(SC.stream){SC.stream.getTracks().forEach(t=>t.stop());SC.stream=null}
  const v=$('#scVid');if(v){v.srcObject=null;v.hidden=true}
  const w=$('#scView');if(w)w.dataset.live='0';
  const b=$('#scStart');if(b)b.hidden=false;const sn=$('#scSnap');if(sn)sn.hidden=true;
}
async function startCam(){
  scMsg('');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){scMsg('This browser cannot open a camera. Use Choose a photo instead.');return}
  try{
    SC.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},audio:false});
    const v=$('#scVid');v.srcObject=SC.stream;v.hidden=false;await v.play().catch(()=>{});
    $('#scView').dataset.live='1';$('#scStart').hidden=true;$('#scSnap').hidden=SC.mode==='isbn';
    if(SC.mode==='isbn')beginDetect();else scMsg(SC.mode==='cover'?'Fill the frame with the front cover, then press Capture.':'Press Capture for each page.');
  }catch(e){
    $('#scView').dataset.live='0';
    scMsg(e&&e.name==='NotAllowedError'?'Camera permission was refused. Allow it in your settings, or use Choose a photo.':'The camera could not be started here. Use Choose a photo instead.');
  }
}
async function detector(){
  if(SC.det)return SC.det;
  if('BarcodeDetector' in window){try{SC.det={native:new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']})};return SC.det}catch(e){}}
  await loadZx();SC.det={zx:true};return SC.det;
}
function zxDecode(canvas){
  const Z=window.ZXing;
  if(!SC.zx){const h=new Map();h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]);h.set(Z.DecodeHintType.TRY_HARDER,true);SC.zx=new Z.MultiFormatReader();SC.zx.setHints(h)}
  try{return SC.zx.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)))).getText()}catch(e){return''}
}
async function readCode(src,w,h){
  const d=await detector();
  if(d.native){try{const r=await d.native.detect(src);return r&&r[0]?r[0].rawValue:''}catch(e){return''}}
  const c=document.createElement('canvas'),k=Math.min(1,1280/Math.max(w,h));c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return zxDecode(c);
}
function beginDetect(){
  scMsg('Hold the barcode on the back of the book inside the frame.');
  clearInterval(SC.timer);
  SC.timer=setInterval(async()=>{
    const v=$('#scVid');if(SC.busy||!v.videoWidth||SC.mode!=='isbn')return;SC.busy=true;
    try{const raw=await readCode(v,v.videoWidth,v.videoHeight),i=isbnOK(raw);if(i&&i!==SC.last){SC.last=i;found(i)}}catch(e){}
    SC.busy=false;
  },280);
}
async function found(isbn){
  stopCam();scMsg('Found ISBN '+isbn+'. Looking it up…');$('#scIsbn').value=isbn;
  try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
  await finishIsbn(isbn,null);
}
function getJson(url,ms=8000){
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
  return fetch(url,{signal:ac.signal}).then(r=>{if(!r.ok)throw new Error('http');return r.json()}).finally(()=>clearTimeout(t));
}
async function lookupIsbn(isbn){
  const out={title:'',author:'',genre:'',description:'',coverUrl:''};
  try{
    const j=await getJson('https://www.googleapis.com/books/v1/volumes?q=isbn:'+isbn+'&maxResults=1'),v=j.items&&j.items[0]&&j.items[0].volumeInfo;
    if(v){out.title=[v.title,v.subtitle].filter(Boolean).join(': ');out.author=(v.authors||[]).join(', ');out.genre=(v.categories||[]).join('; ');out.description=v.description||'';
      const im=v.imageLinks&&(v.imageLinks.large||v.imageLinks.medium||v.imageLinks.thumbnail);if(im)out.coverUrl=im.replace(/^http:/,'https:').replace('&edge=curl','')}
  }catch(e){}
  if(!out.title||!out.author||!out.description){
    try{
      const j=await getJson('https://openlibrary.org/api/books?bibkeys=ISBN:'+isbn+'&format=json&jscmd=data'),d=j['ISBN:'+isbn];
      if(d){out.title=out.title||[d.title,d.subtitle].filter(Boolean).join(': ');out.author=out.author||(d.authors||[]).map(a=>a.name).join(', ');
        out.genre=out.genre||(d.subjects||[]).slice(0,3).map(s=>s.name).join('; ');
        const n=d.notes&&(d.notes.value||d.notes);out.description=out.description||(typeof n==='string'?n:'')||(d.excerpts&&d.excerpts[0]&&d.excerpts[0].text)||'';
        out.coverUrl=out.coverUrl||(d.cover&&(d.cover.large||d.cover.medium))||''}
    }catch(e){}
  }
  return out;
}
async function fetchCover(isbn,url){
  const urls=[url,'https://covers.openlibrary.org/b/isbn/'+isbn+'-L.jpg?default=false'].filter(Boolean);
  for(const u of urls){
    try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),9000);const r=await fetch(u,{signal:ac.signal});clearTimeout(t);if(!r.ok)continue;const bl=await r.blob();if(!bl.type.startsWith('image/')||bl.size<2500)continue;return await fileToCover(bl)}catch(e){}
  }
  return'';
}
function fillForm(o){
  openForm();
  if(o.title){$('#fTitle').value=o.title;$('#fTitle').dispatchEvent(new Event('input',{bubbles:true}))}
  if(o.author){$('#fAuthor').value=o.author;$('#fAuthor').dispatchEvent(new Event('input',{bubbles:true}))}
  if(o.genre){$('#fGenre').value=o.genre.split(/\s*[;,\/]\s*/).filter(Boolean).slice(0,3).join('; ');$('#fGenre').dispatchEvent(new Event('input',{bubbles:true}))}
  if(o.description)$('#fDesc').value=String(o.description).replace(/<[^>]+>/g,'').slice(0,900);
  if(o.cover){F.cover=o.cover;F.tone=o.tone||''}
  drawFormBits();
}
async function finishIsbn(isbn,photo){
  const info=await lookupIsbn(isbn);
  let cover='',tone='';
  if(photo){cover=photo.cover;tone=photo.tone}
  else{cover=await fetchCover(isbn,info.coverUrl);if(cover)tone=await toneOf(cover).catch(()=>'')}
  closeModal($('#m-scan'));
  fillForm({...info,cover,tone});
  if(info.title)toast('Found “'+info.title+'”. Check the details and save.');
  else toast('No details were found for ISBN '+isbn+' (you may be offline). Fill them in below.');
}
async function scanFiles(files){
  files=[...files].filter(f=>f.type.startsWith('image/'));if(!files.length)return;
  if(SC.mode==='pages'){for(const f of files)SC.pages.push(await imgToPage(f));drawPages();return}
  const f=files[0];
  if(SC.mode==='cover'){
    try{const cover=await fileToCover(f),tone=await toneOf(cover).catch(()=>'');closeModal($('#m-scan'));fillForm({cover,tone});toast('Cover captured. Add the title and author.')}catch(e){scMsg('That image could not be read.')}
    return;
  }
  scMsg('Reading the barcode…');
  try{
    const bm=await createImageBitmap(f);let raw=await readCode(bm,bm.width,bm.height);let i=isbnOK(raw);
    if(!i){
      const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);
      for(const [x,y,w,h] of [[0,.45,1,.55],[0,0,1,.5],[.15,.3,.7,.5]]){const cc=document.createElement('canvas');cc.width=Math.round(bm.width*w);cc.height=Math.round(bm.height*h);cc.getContext('2d').drawImage(c,bm.width*x,bm.height*y,bm.width*w,bm.height*h,0,0,cc.width,cc.height);const d=await detector();let r2='';if(d.native){try{const r=await d.native.detect(cc);r2=r&&r[0]?r[0].rawValue:''}catch(e){}}else r2=zxDecode(cc);i=isbnOK(r2);if(i)break}
    }
    if(!i){scMsg('No barcode could be read in that photo. Try a closer, brighter shot, or type the ISBN.');return}
    $('#scIsbn').value=i;scMsg('Found ISBN '+i+'. Looking it up…');
    await finishIsbn(i,null);
  }catch(e){scMsg('That photo could not be read.')}
}
function imgToPage(file){
  return new Promise((res,rej)=>{
    const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res({url:c.toDataURL('image/jpeg',.8),w:c.width,h:c.height})};
    im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};im.src=u;
  });
}
function drawPages(){
  $('#scPages').innerHTML=SC.pages.map((p,i)=>`<figure><img src="${p.url}" alt="Page ${i+1}"><button type="button" data-rmpage="${i}" aria-label="Remove page ${i+1}">×</button></figure>`).join('');
  $('#scMake').hidden=SC.mode!=='pages'||!SC.pages.length;
  scMsg(SC.pages.length?SC.pages.length+(SC.pages.length===1?' page':' pages')+' ready.':'');
}
async function snapFrame(){
  const v=$('#scVid');if(!v.videoWidth)return;
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
  const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));if(!bl)return;
  try{navigator.vibrate&&navigator.vibrate(25)}catch(e){}
  await scanFiles([new File([bl],'scan.jpg',{type:'image/jpeg'})]);
}
async function makePdf(){
  if(!SC.pages.length)return;
  scMsg('Building the PDF…');
  try{
    await loadJsPdf();const {jsPDF}=window.jspdf;let doc=null;
    SC.pages.forEach((p,i)=>{const o=p.w>=p.h?'l':'p';if(!doc)doc=new jsPDF({orientation:o,unit:'pt',format:[p.w*.75,p.h*.75]});else doc.addPage([p.w*.75,p.h*.75],o);doc.addImage(p.url,'JPEG',0,0,p.w*.75,p.h*.75)});
    const blob=doc.output('blob'),file=new File([blob],'scanned-book.pdf',{type:'application/pdf'});
    if(file.size>20*1048576){scMsg('That PDF is over 20 MB. Remove a few pages or scan fewer at a time.');return}
    SC.pages=[];drawPages();closeModal($('#m-scan'));
    fillForm({});F.pdf={mode:'upload',url:'',file};drawPdf();
    if(F.pdf.mode!=='upload')toast('Attaching a scanned PDF needs Editor access to this library. Use the downloaded app, or ask the owner.');
    else toast('Scanned PDF ready. Add the title and author, then save.');
  }catch(e){scMsg('The PDF tool did not load. Check your connection and try again.')}
}
function setScanMode(m){
  SC.mode=m;SC.last='';clearInterval(SC.timer);
  $$('#m-scan [data-sc]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sc===m));
  $('#scView').dataset.mode=m;
  $('#scManual').hidden=m!=='isbn';
  $('#scSnap').hidden=!SC.stream||m==='isbn';
  $('#scFile').multiple=m==='pages';
  $('#scFileL').textContent=m==='pages'?'Choose photos':'Choose a photo';
  $('#scTip').textContent=m==='isbn'?'Works with the ISBN barcode on the back cover. Details come from public book databases, so they need an internet connection.':m==='cover'?'Photograph the front cover and it becomes this book’s cover.':'Photograph each page in turn. They are joined into one PDF you can read with page-turning.';
  if(m!=='pages'){SC.pages=[];}drawPages();if(m==='pages')scMsg('');
  if(SC.stream){if(m==='isbn')beginDetect();else scMsg(m==='cover'?'Fill the frame with the front cover, then press Capture.':'Press Capture for each page.')}
  else scMsg('');
}
function openScan(){
  if(!S.canWrite||!S.col){toast('You have read-only access to this library.');return}
  openModal($('#m-scan'));setScanMode('isbn');$('#scIsbn').value='';
}
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest('#scanTop,#scanHero,[data-scan]')){openScan();return}
  const m=t.closest('[data-sc]');if(m&&m.closest('#m-scan')){setScanMode(m.dataset.sc);return}
  const rm=t.closest('[data-rmpage]');if(rm){SC.pages.splice(+rm.dataset.rmpage,1);drawPages()}
});
$('#scStart').onclick=startCam;
$('#scSnap').onclick=snapFrame;
$('#scPdf').onclick=makePdf;
$('#scFile').onchange=async e=>{const fl=e.target.files;await scanFiles(fl);e.target.value=''};
$('#scLook').onclick=async()=>{const i=isbnOK($('#scIsbn').value);if(!i){scMsg('That does not look like a valid ISBN. Check the digits.');return}scMsg('Looking it up…');await finishIsbn(i,null)};
$('#scIsbn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#scLook').click()}});

/* ---------- add / replace / remove a PDF on any book ---------- */
const Q={id:null,mode:'upload',file:null,url:''};
function openPdfq(id){
  const b=get(id);if(!b||!guard())return;
  Q.id=id;Q.file=null;Q.url='';Q.mode=hasPdf(b)?'keep':'upload';
  $('#pqT').textContent=b.title;drawPq();openModal($('#m-pdfq'));
}
function drawPq(){
  const b=get(Q.id);if(!b)return;const has=hasPdf(b);
  const modes=[...(has?[['keep','Keep current']]:[]),['upload','Upload a PDF'],['link','Paste a link'],...(has?[['none','Remove PDF']]:[])];
  $('#pqMode').innerHTML=modes.map(([k,l])=>`<label><input type="radio" name="pq" value="${k}" ${Q.mode===k?'checked':''}>${l}</label>`).join('');
  let body='';
  if(Q.mode==='keep')body=`<div class="pdfcur">${IC.read}<span>${esc(b.pdfName||'PDF attached')}</span></div>`;
  if(Q.mode==='upload')body=`<input type="file" id="pqFile" accept="application/pdf,.pdf" aria-label="Choose a PDF file"><div class="pdfcur">${Q.file?esc(Q.file.name):''}</div>`;
  if(Q.mode==='link')body=`<input type="url" id="pqUrl" placeholder="https://example.com/book.pdf" aria-label="PDF link" value="${esc(Q.url)}">`;
  if(Q.mode==='none')body='<p class="hint">The PDF will be detached from this book. The book itself stays.</p>';
  $('#pqBody').innerHTML=body;
  $('#pqHint').textContent=Q.mode==='upload'?(ASSETS?'Up to 20 MB. Stored with the library, so everyone you share it with can read it.':'Saved on this device only. To share a PDF with others, paste a link instead.'):Q.mode==='link'?'Links must start with https://. The page-turning reader tries the link first, then opens it in a new tab if the site does not allow it.':'';
  $('#pqSave').hidden=Q.mode==='keep';
}
document.addEventListener('change',e=>{
  if(e.target.name==='pq'){Q.mode=e.target.value;drawPq()}
  if(e.target.id==='pqFile'){const f=e.target.files[0];if(f&&f.size>(ASSETS?20:80)*1048576){toast('That PDF is too large ('+(ASSETS?'20':'80')+' MB limit).');e.target.value='';return}Q.file=f||null;drawPq()}
});
document.addEventListener('input',e=>{if(e.target.id==='pqUrl')Q.url=e.target.value.trim()});
document.addEventListener('click',e=>{const t=e.target.closest('[data-pdfq]');if(t){e.preventDefault();openPdfq(t.dataset.pdfq)}});
$('#pqSave').onclick=async()=>{
  const b=get(Q.id);if(!b)return;
  if(Q.mode==='upload'&&!Q.file){toast('Choose a PDF file first.');return}
  if(Q.mode==='link'&&!/^https?:\/\//i.test(Q.url)){toast('The link must start with https://');return}
  const btn=$('#pqSave');btn.disabled=true;const sp=F.pdf,so=F.old;
  F.pdf={mode:Q.mode,url:Q.url,file:Q.file};F.old=b;
  try{
    const data={};await applyPdf(data,b.id);
    await dbRetry(()=>S.col.doc(b.id).update(data));Object.assign(b,data);
    closeModal($('#m-pdfq'));renderAll();if(S.openId===b.id)fillProfile(b);
    toast(Q.mode==='none'?'PDF removed.':'PDF saved. You can now read it as a book.');
  }catch(e){toast('The PDF could not be saved. Please try again.')}
  finally{F.pdf=sp;F.old=so;btn.disabled=false}
};

/* ---------- boot ---------- */
applyLights();
initDust();
renderAll();
greet();
initDb();
initUser();
initExport();
$('#owl').addEventListener('focus',()=>{});
setTimeout(()=>{if(S.books.length&&!S.name)greet()},1800);
window.__rr={S,renderAll};
})();
