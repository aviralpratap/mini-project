// ===== DATA (edit this list, dates as YYYY-MM-DD) =====
const EXAMS=[
 {id:"ssc-cgl",name:"SSC CGL",cat:"Government jobs",events:[{label:"Applications open",date:"2026-10-10"},{label:"Last date to apply",date:"2026-11-05"},{label:"Tier 1 exam",date:"2026-12-15"}]},
 {id:"upsc-cse",name:"UPSC Civil Services",cat:"Government jobs",events:[{label:"Notification",date:"2027-02-10"},{label:"Prelims",date:"2027-05-23"}]},
 {id:"rrb-ntpc",name:"RRB NTPC",cat:"Government jobs",events:[{label:"Last date to apply",date:"2026-10-20"},{label:"CBT 1",date:"2027-01-12"}]},
 {id:"ibps-po",name:"IBPS PO",cat:"Government jobs",events:[{label:"Registration starts",date:"2026-10-15"},{label:"Prelims",date:"2026-12-05"}]},
 {id:"jee-main",name:"JEE Main",cat:"Entrance exams",events:[{label:"Registration starts",date:"2026-11-01"},{label:"Session 1",date:"2027-01-22"}]},
 {id:"neet-ug",name:"NEET UG",cat:"Entrance exams",events:[{label:"Registration starts",date:"2027-02-01"},{label:"Exam day",date:"2027-05-03"}]},
 {id:"cuet-ug",name:"CUET UG",cat:"Entrance exams",events:[{label:"Registration starts",date:"2027-02-15"},{label:"Exam window begins",date:"2027-05-15"}]},
 {id:"gate",name:"GATE",cat:"Entrance exams",events:[{label:"Exam begins",date:"2027-02-06"}]},
 {id:"cat",name:"CAT",cat:"Entrance exams",events:[{label:"Exam day",date:"2026-11-29"}]},
 {id:"cbse",name:"CBSE Class 10 and 12",cat:"Boards and eligibility",events:[{label:"Board exams begin",date:"2027-02-15"}]},
 {id:"ctet",name:"CTET",cat:"Boards and eligibility",events:[{label:"Exam day",date:"2026-12-20"}]},
 {id:"ugc-net",name:"UGC NET",cat:"Boards and eligibility",events:[{label:"Exam begins",date:"2026-12-10"}]}
];
const REMIND_DAYS=[7,3,1,0];

// ===== helpers =====
const $=s=>document.querySelector(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const dt=s=>new Date(s+"T00:00:00");
const daysLeft=s=>Math.round((dt(s)-today())/864e5);
const fmt=s=>dt(s).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
const when=n=>n<0?"Passed":n===0?"Today":n===1?"Tomorrow":n+" days left";
const badge=n=>`<span class="badge ${n<0?"past":n<=7?"soon":""}">${when(n)}</span>`;
const esc=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ===== demo auth (browser-only, see note) =====
let users=load("users",{}), session=load("session",null), filter="All", query="";
const me=()=>session&&users[session];
async function hash(pw,salt){
  if(!crypto.subtle) return btoa(salt+pw);
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+pw));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
let mode="login";
function setMode(m){
  mode=m;
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.mode===m));
  $("#nameRow").hidden=m!=="register";
  $("#submit").textContent=m==="login"?"Log in":"Create account";
  $("#pass").autocomplete=m==="login"?"current-password":"new-password";
  $("#msg").textContent="";
}
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$("#closeDlg").onclick=()=>$("#dlg").close();
$("#authBtn").onclick=()=>{ if(session){session=null;save("session",null);toast("Logged out");paint()} else {setMode("login");$("#dlg").showModal()} };

$("#form").onsubmit=async e=>{
  e.preventDefault();
  const email=$("#email").value.trim().toLowerCase(), pw=$("#pass").value, msg=$("#msg");
  if(mode==="register"){
    if(users[email]) return msg.textContent="An account with this email already exists. Log in instead.";
    const salt=crypto.getRandomValues(new Uint32Array(2)).join("-");
    users[email]={name:$("#name").value.trim()||email.split("@")[0],salt,hash:await hash(pw,salt),followed:[],sent:[]};
  }else{
    const u=users[email];
    if(!u||u.hash!==await hash(pw,u.salt)) return msg.textContent="Email or password is incorrect.";
  }
  session=email; save("users",users); save("session",session);
  $("#form").reset(); $("#dlg").close();
  toast("Welcome, "+users[email].name); paint(); checkReminders();
};

function toggleFollow(id){
  const u=me();
  if(!u){toast("Log in to follow exams");setMode("login");$("#dlg").showModal();return}
  u.followed=u.followed.includes(id)?u.followed.filter(x=>x!==id):[...u.followed,id];
  save("users",users); paint(); checkReminders();
}

// ===== render =====
function paint(){
  const u=me(), fol=u?u.followed:[];
  $("#authBtn").textContent=u?"Log out":"Log in";
  $("#hello").textContent=u?"Hi, "+u.name:"";
  const rows=EXAMS.filter(e=>fol.includes(e.id)).flatMap(e=>e.events.map(v=>({exam:e.name,...v,n:daysLeft(v.date)}))).filter(r=>r.n>=0).sort((a,b)=>a.n-b.n);

  $("#heroTitle").textContent=u?"Your exam calendar":"Never miss an exam date";
  $("#heroText").textContent=u?(rows.length?"Here is what is coming up for the exams you follow.":"Follow an exam below to build your calendar."):"Log in, follow your exams and get reminders before every important date.";
  $("#next").innerHTML=rows.length?`<div class="next"><b>${rows[0].n}</b><span>${rows[0].n===1?"day":"days"} until<br><strong>${esc(rows[0].exam)}: ${esc(rows[0].label)}</strong></span></div>`:"";

  $("#myCount").textContent=rows.length?rows.length+" dates":"";
  $("#mine").innerHTML=rows.length?`<div class="timeline">${rows.map(r=>{const d=dt(r.date);
    return `<div class="tl ${r.n<=7?"soon":""}"><div class="date"><b>${d.getDate()}</b><span>${d.toLocaleString(undefined,{month:"short"})} ${d.getFullYear()}</span></div><div><strong>${esc(r.exam)}</strong><br>${esc(r.label)}</div>${badge(r.n)}</div>`}).join("")}</div>`
    :`<div class="empty">${u?"No followed exams yet. Tap Follow on any card below.":"Log in to follow exams and see your personal timeline here."}</div>`;

  const cats=[...new Set(EXAMS.map(e=>e.cat))];
  $("#chips").innerHTML=["All",...cats].map(c=>`<button class="chip" data-c="${c}" aria-pressed="${c===filter}">${c}</button>`).join("");
  const list=EXAMS.filter(e=>(filter==="All"||e.cat===filter)&&e.name.toLowerCase().includes(query));
  $("#sections").innerHTML=cats.map(c=>{
    const items=list.filter(e=>e.cat===c); if(!items.length) return "";
    return `<h2>${c}</h2><div class="grid">${items.map(e=>{const on=fol.includes(e.id);
      return `<article class="card ${on?"on":""}"><h3>${e.name}<button class="btn ${on?"":"ghost"}" data-id="${e.id}" aria-pressed="${on}">${on?"Following":"Follow"}</button></h3>${e.events.map(v=>`<div class="ev"><span>${v.label}<small>${fmt(v.date)}</small></span>${badge(daysLeft(v.date))}</div>`).join("")}</article>`}).join("")}</div>`;
  }).join("")||`<div class="empty">No exams match your search.</div>`;
}
$("#chips").onclick=e=>{if(e.target.dataset.c){filter=e.target.dataset.c;paint()}};
$("#sections").onclick=e=>{if(e.target.dataset.id)toggleFollow(e.target.dataset.id)};
$("#q").oninput=e=>{query=e.target.value.toLowerCase();paint()};

// ===== reminders =====
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;$("#toasts").appendChild(t);setTimeout(()=>t.remove(),7000)}
function checkReminders(){
  const u=me(); if(!u) return;
  EXAMS.filter(e=>u.followed.includes(e.id)).forEach(e=>e.events.forEach(v=>{
    const n=daysLeft(v.date); if(!REMIND_DAYS.includes(n)) return;
    const key=`${e.id}|${v.label}|${n}`; if(u.sent.includes(key)) return;
    u.sent.push(key); save("users",users);
    const m=`${e.name}: ${v.label}, ${when(n).toLowerCase()} (${fmt(v.date)})`;
    toast(m);
    if("Notification" in window&&Notification.permission==="granted") new Notification("Exam reminder",{body:m});
  }));
}
function notifyState(){
  const b=$("#notifyBtn");
  if(!("Notification" in window)){b.textContent="Reminders unsupported";b.disabled=true}
  else if(Notification.permission==="granted"){b.textContent="Reminders on";b.disabled=true}
  else if(Notification.permission==="denied"){b.textContent="Reminders blocked";b.disabled=true}
}
$("#notifyBtn").onclick=async()=>{await Notification.requestPermission();notifyState();checkReminders()};

paint(); notifyState(); checkReminders();
setInterval(()=>{paint();checkReminders()},30*60*1000);
