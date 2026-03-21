"use client";

import { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   THEME — Planning = Bleu
   ═══════════════════════════════════════════════════════════ */
const V = {
  bg:"#f2f5f8",card:"rgba(255,255,255,0.92)",border:"rgba(226,232,240,0.5)",line:"#dbe3eb",
  text:"#0f172a",body:"#1e293b",muted:"#64748b",light:"#94a3b8",
  shadow:"0 1px 2px rgba(0,0,0,0.03),0 4px 16px rgba(0,0,0,0.04),0 12px 32px rgba(0,0,0,0.02)",
  mc:"#1d5fa0",mL:"#eff6ff",mM:"#dbeafe",mD:"#143f6b",
  mG:"linear-gradient(135deg,#eff6ff 0%,#f8fbff 50%,#fcfdff 100%)",
  mIG:"linear-gradient(135deg,#dbeafe,#bdd5f7)",
  green:"#16a34a",amber:"#d97706",red:"#dc2626",purple:"#5635b8",orange:"#ea580c",pink:"#db2777",cyan:"#0891b2",
};

const ST = {
  PRESENT:{c:V.green,bg:"#ecfdf5",l:"Présent",short:"P"},
  RH:{c:V.purple,bg:"#f5f3ff",l:"Repos hebdo",short:"RH"},
  CP:{c:V.amber,bg:"#fffbeb",l:"Congé payé",short:"CP"},
  MAL:{c:V.red,bg:"#fef2f2",l:"Maladie",short:"MAL"},
  ABS:{c:V.pink,bg:"#fdf2f8",l:"Absence",short:"ABS"},
  FORM:{c:"#2563eb",bg:"#eff6ff",l:"Formation",short:"FOR"},
  X:{c:"#9ca3af",bg:"#f9fafb",l:"Non travaillé",short:"X"},
  CONGE_MAT:{c:V.orange,bg:"#fff7ed",l:"Congé mat.",short:"C.M"},
};

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */
const EMPS=[
  {n:"ABDOU",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Coordo",actif:true},
  {n:"CECILE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"KAMAR",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Congé mat.",actif:false},
  {n:"YASSINE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"WASIM",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"JEREMY",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"KAMEL",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"PASCALE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"MOHCINE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"LIYAKATH",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"KHANH",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"ROSALIE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"JAMAA",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"EL HASSANE",t:"M",hs:"3h50-11h20",hm:"3h00-10h30",obs:"Employé",actif:true},
  {n:"MASSIMO",t:"S",hs:"14h-21h30",hm:"12h-19h30",obs:"Employé",actif:true},
  {n:"DILAXSHAN",t:"S",hs:"14h-21h30",hm:"12h-19h30",obs:"Employé",actif:true},
  {n:"YLEANA",t:"E",hs:null,hm:null,obs:"Étudiant",actif:true},
  {n:"MOUNIR",t:"E",hs:null,hm:null,obs:"Étudiant",actif:true},
  {n:"MAHIN",t:"E",hs:null,hm:null,obs:"Étudiant",actif:true},
  {n:"MOHAMED",t:"E",hs:null,hm:null,obs:"Étudiant",actif:true},
  {n:"ACHRAF",t:"E",hs:null,hm:null,obs:"Étudiant",actif:true},
];

const ALL_EMP_NAMES = EMPS.filter(e=>e.t!=="E").map(e=>e.n);

const CYCLE={ABDOU:["VEN","VEN","VEN","VEN","VEN"],CECILE:["MER","MER","MER","MER","SAM"],MASSIMO:["JEU","JEU","JEU","JEU","JEU"],DILAXSHAN:["SAM","MER","MER","MER","MER"],KAMAR:["MAR","MAR","MAR","MAR","MAR"],YASSINE:["JEU","JEU","JEU","JEU","SAM"],WASIM:["VEN","VEN","SAM","VEN","VEN"],JEREMY:["VEN","VEN","VEN","SAM","VEN"],KAMEL:["SAM","MAR","MAR","MAR","MAR"],PASCALE:["SAM","LUN","LUN","LUN","LUN"],MOHCINE:["MER","MER","MER","SAM","MER"],LIYAKATH:["LUN","LUN","SAM","LUN","LUN"],KHANH:["JEU","JEU","JEU","JEU","SAM"],ROSALIE:["JEU","SAM","JEU","JEU","JEU"],JAMAA:["MER","MER","SAM","MER","MER"],"EL HASSANE":["VEN","SAM","VEN","VEN","VEN"]};

const JL=["","LUN","MAR","MER","JEU","VEN","SAM","DIM"];
const JL_FULL=["","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const MOIS_FR=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JC=["D","L","M","M","J","V","S"];

function getISOWeek(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-(t.getDay()+6)%7);const w=new Date(t.getFullYear(),0,4);return 1+Math.round(((t-w)/864e5-3+(w.getDay()+6)%7)/7);}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}

function getDefaultHoraire(emp,date){
  const dow=date.getDay();
  if(dow===2) return emp.hm;
  if(dow===6&&emp.t==="E") return "14h-21h30";
  return emp.hs;
}

function getStatus(emp,date,overrides){
  const key=`${emp.n}_${date.toISOString().slice(0,10)}`;
  if(overrides[key]) return overrides[key].s;
  const dow=date.getDay();
  if(dow===0) return "X";
  if(emp.t==="E") return dow===6?"PRESENT":"X";
  if(!emp.actif) return "CONGE_MAT";
  const c=CYCLE[emp.n];
  if(c){const cw=(getISOWeek(date)-1)%5;if(c[cw]===JL[dow].substring(0,3))return "RH";}
  return "PRESENT";
}

function getHoraire(emp,date,overrides){
  const key=`${emp.n}_${date.toISOString().slice(0,10)}`;
  if(overrides[key]?.h) return overrides[key].h;
  return getDefaultHoraire(emp,date);
}

function isTriCaddie(name,dow,triData){const p=triData[dow];return p&&p.includes(name);}

/* ═══════════════════════════════════════════════════════════
   UI PRIMITIVES
   ═══════════════════════════════════════════════════════════ */
const Card=({children,style})=>(<div style={{background:V.card,backdropFilter:"blur(12px)",border:`1px solid ${V.border}`,borderRadius:20,boxShadow:V.shadow,padding:22,...style}}>{children}</div>);
const Kicker=({label,icon})=>(<div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:10,background:V.mM,color:V.mD,fontSize:11,fontWeight:700,letterSpacing:"0.04em"}}>{icon}<span>{label}</span></div>);
const H2=({children})=>(<h2 style={{margin:"10px 0 6px",fontSize:20,fontWeight:700,letterSpacing:"-0.02em",color:V.text}}>{children}</h2>);
const KPI=({value,label,color,gradient})=>(<div style={{borderRadius:16,padding:"16px 12px",textAlign:"center",background:gradient}}><strong style={{display:"block",fontSize:28,lineHeight:1,marginBottom:4,fontWeight:800,color}}>{value}</strong><span style={{fontSize:11,fontWeight:600,color:color+"99"}}>{label}</span></div>);
const Chev=({dir,onClick})=>(<button onClick={onClick} style={{width:36,height:36,borderRadius:10,background:V.mL,border:`1px solid ${V.mc}15`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={dir==="l"?"15 18 9 12 15 6":"9 18 15 12 9 6"}/></svg></button>);
const CalIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const CartIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
const LinkIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const EditIcon=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

const Legend=()=>(<div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 0"}}>{Object.entries(ST).filter(([k])=>k!=="X").map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}><div style={{width:10,height:10,borderRadius:3,background:v.c,opacity:0.8}}/>{v.l}</div>))}<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}><div style={{width:10,height:10,borderRadius:50,background:V.amber,opacity:0.8}}/>Tri caddie</div></div>);

/* ═══════════════════════════════════════════════════════════
   EDIT CELL MODAL — statut + horaire ponctuel
   ═══════════════════════════════════════════════════════════ */
const EditCellModal=({empName,date,currentStatut,currentHoraire,defaultHoraire,monthLabel,onSave,onClose})=>{
  const [s,setS]=useState(currentStatut);
  const [h,setH]=useState(currentHoraire||"");
  const [scope,setScope]=useState("default"); // "default" | "jour" | "mois"
  const dn=date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

  const RadioOpt=({value,label,desc,accent})=>(
    <label onClick={()=>setScope(value)} style={{
      display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,cursor:"pointer",
      background:scope===value?(accent?`${V.mc}08`:"#f8fafc"):"transparent",
      border:scope===value?`2px solid ${V.mc}`:`1px solid ${V.line}`,transition:"all 0.15s",
    }}>
      <input type="radio" name="scope" checked={scope===value} onChange={()=>setScope(value)}
        style={{accentColor:V.mc,marginTop:2}}/>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:scope===value?V.mc:V.body}}>{label}</div>
        <div style={{fontSize:11,color:V.muted,lineHeight:1.3,marginTop:1}}>{desc}</div>
      </div>
    </label>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.mc,padding:"18px 24px",color:"#fff"}}>
          <div style={{fontSize:18,fontWeight:700}}>{empName}</div>
          <div style={{fontSize:13,opacity:0.8}}>{dn}</div>
        </div>
        <div style={{padding:24}}>
          {/* Statut */}
          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:6}}>Statut</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:18}}>
            {Object.entries(ST).map(([k,v])=>(
              <button key={k} onClick={()=>setS(k)} style={{
                padding:"10px 6px",borderRadius:10,border:s===k?`2px solid ${v.c}`:`1px solid ${V.line}`,
                background:s===k?v.bg:"#fafafa",cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:700,color:v.c,
              }}>{v.l}</button>
            ))}
          </div>

          {/* Horaire */}
          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:6}}>Horaire</div>
          <div style={{padding:"14px 16px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.line}`}}>
            <div style={{fontSize:13,color:V.body,marginBottom:12}}>
              Horaire par défaut (RH) : <strong style={{color:V.mc}}>{defaultHoraire||"—"}</strong>
            </div>

            <div style={{display:"grid",gap:6}}>
              <RadioOpt value="default"
                label="Garder l'horaire par défaut"
                desc="L'horaire RH s'applique normalement"/>
              <RadioOpt value="jour"
                label="Modifier pour ce jour uniquement"
                desc={`Exception ponctuelle le ${dn}`}/>
              <RadioOpt value="mois"
                label={`Modifier pour tout ${monthLabel}`}
                desc="Applique le nouvel horaire sur tous les jours présent du mois"/>
            </div>

            {(scope==="jour"||scope==="mois")&&(
              <div style={{marginTop:10}}>
                <input value={h} onChange={e=>setH(e.target.value)} placeholder="Ex: 6h-13h30, 5h-12h..."
                  style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`2px solid ${V.mc}30`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",background:"#fff"}}/>
                <div style={{fontSize:10,color:V.light,marginTop:4}}>
                  {scope==="jour"?"Cet horaire remplacera l'horaire par défaut uniquement pour cette journée."
                    :`Cet horaire sera appliqué à tous les jours de ${monthLabel} où ${empName} est présent.`}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Annuler</button>
          <button onClick={()=>onSave(s,scope!=="default"?h:null,scope)} style={{padding:"10px 24px",borderRadius:10,border:"none",background:V.mc,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   EDIT TRI CADDIE MODAL
   ═══════════════════════════════════════════════════════════ */
const EditTriModal=({dow,pair,allNames,onSave,onClose})=>{
  const [a,setA]=useState(pair[0]);
  const [b,setB]=useState(pair[1]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:380,boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.amber,padding:"16px 24px",color:"#fff"}}><div style={{fontSize:16,fontWeight:700}}>Tri caddie — {JL_FULL[dow]}</div></div>
        <div style={{padding:24}}>
          <div style={{display:"grid",gap:12}}>
            {[{v:a,set:setA,l:"Employé 1"},{v:b,set:setB,l:"Employé 2"}].map(({v,set,l})=>(
              <div key={l}>
                <label style={{fontSize:12,color:V.muted,fontWeight:600,display:"block",marginBottom:4}}>{l}</label>
                <select value={v} onChange={e=>set(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",color:V.purple}}>
                  {allNames.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Annuler</button>
          <button onClick={()=>onSave([a,b])} style={{padding:"10px 24px",borderRadius:10,border:"none",background:V.amber,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   EDIT BINOME MODAL
   ═══════════════════════════════════════════════════════════ */
const EditBinomeModal=({index,pair,allNames,onSave,onClose})=>{
  const [a,setA]=useState(pair[0]);
  const [b,setB]=useState(pair[1]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:380,boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.mc,padding:"16px 24px",color:"#fff"}}><div style={{fontSize:16,fontWeight:700}}>Binôme repos #{index+1}</div></div>
        <div style={{padding:24}}>
          <div style={{display:"grid",gap:12}}>
            {[{v:a,set:setA,l:"Employé 1"},{v:b,set:setB,l:"Employé 2"}].map(({v,set,l})=>(
              <div key={l}>
                <label style={{fontSize:12,color:V.muted,fontWeight:600,display:"block",marginBottom:4}}>{l}</label>
                <select value={v} onChange={e=>set(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",color:V.purple}}>
                  {allNames.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Annuler</button>
          <button onClick={()=>onSave([a,b])} style={{padding:"10px 24px",borderRadius:10,border:"none",background:V.mc,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VUE MOIS — with hours displayed
   ═══════════════════════════════════════════════════════════ */
const VueMois=({year,month,filter,overrides,triData,onEdit})=>{
  const days=daysInMonth(year,month);
  const dates=Array.from({length:days},(_,i)=>new Date(year,month,i+1));
  const filtered=filter==="ALL"?EMPS:EMPS.filter(e=>e.t===(filter==="M"?"M":filter==="S"?"S":"E"));
  const todayS=new Date().toISOString().slice(0,10);

  return(
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse",width:"100%",minWidth:1200}}>
        <thead>
          <tr style={{background:"#f8fafc"}}>
            <th style={{padding:"8px 8px",fontSize:11,fontWeight:700,color:V.light,textAlign:"left",borderBottom:`2px solid ${V.line}`,position:"sticky",left:0,background:"#f8fafc",zIndex:3,minWidth:85}}>Employé</th>
            {dates.map(d=>{
              const dow=d.getDay();if(dow===0)return null;
              const isW=dow===6;const isT=d.toISOString().slice(0,10)===todayS;
              return(<th key={d.getDate()} style={{padding:"4px 1px",fontSize:9,fontWeight:isT?800:600,textAlign:"center",borderBottom:`2px solid ${V.line}`,minWidth:62,color:isT?V.mc:isW?V.mc+"80":V.light,background:isT?V.mL:"transparent"}}>
                <div style={{fontSize:8,color:isW?V.mc+"50":V.light}}>{JC[dow]}</div>{d.getDate()}
              </th>);
            })}
            <th style={{padding:"8px 4px",fontSize:10,fontWeight:700,color:V.mc,textAlign:"center",borderBottom:`2px solid ${V.line}`,position:"sticky",right:0,background:"#f8fafc",zIndex:3,minWidth:30}}>Jrs</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(emp=>{
            let presCount=0;
            return(
              <tr key={emp.n} style={{opacity:emp.actif?1:0.45}}>
                <td style={{padding:"4px 8px",fontSize:11,fontWeight:700,borderBottom:`1px solid ${V.line}`,position:"sticky",left:0,background:"#fff",zIndex:2,whiteSpace:"nowrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:3,background:emp.t==="M"?V.mc:emp.t==="S"?V.purple:"#9ca3af",flexShrink:0}}/>{emp.n}
                  </div>
                </td>
                {dates.map(date=>{
                  const dow=date.getDay();if(dow===0)return null;
                  const s=getStatus(emp,date,overrides);
                  const sc=ST[s]||ST.X;
                  const h=s==="PRESENT"?getHoraire(emp,date,overrides):null;
                  const isCustomH=overrides[`${emp.n}_${date.toISOString().slice(0,10)}`]?.h;
                  const triC=isTriCaddie(emp.n,dow,triData);
                  const isT=date.toISOString().slice(0,10)===todayS;
                  if(s==="PRESENT") presCount++;

                  return(
                    <td key={date.getDate()} onClick={()=>onEdit(emp,date)} style={{
                      padding:"2px 1px",textAlign:"center",borderBottom:`1px solid ${V.line}`,cursor:"pointer",
                      background:isT?`${V.mc}04`:"transparent",position:"relative",
                    }}>
                      {s==="PRESENT"?(
                        <div style={{
                          fontSize:8,fontWeight:600,color:isCustomH?V.mc:V.body,
                          background:isCustomH?V.mL:"transparent",
                          borderRadius:4,padding:"3px 2px",lineHeight:1.2,
                          border:triC?`1px solid ${V.amber}40`:"1px solid transparent",
                        }}>
                          {h||"P"}
                          {triC&&<div style={{width:4,height:4,borderRadius:2,background:V.amber,margin:"1px auto 0"}}/>}
                        </div>
                      ):(
                        <div style={{
                          fontSize:8,fontWeight:700,color:sc.c,
                          background:sc.bg,borderRadius:4,padding:"3px 2px",
                          border:`1px solid ${sc.c}15`,lineHeight:1.2,
                        }}>
                          {sc.short}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{padding:"4px 4px",fontSize:11,fontWeight:800,textAlign:"center",borderBottom:`1px solid ${V.line}`,color:V.mc,position:"sticky",right:0,background:"#fff",zIndex:2}}>
                  {presCount||""}
                </td>
              </tr>
            );
          })}
          {/* Effectif row */}
          <tr style={{background:"#f8fafc"}}>
            <td style={{padding:"6px 8px",fontSize:10,fontWeight:800,borderTop:`2px solid ${V.line}`,position:"sticky",left:0,background:"#f8fafc",zIndex:2,color:V.mc}}>EFFECTIF</td>
            {dates.map(date=>{
              const dow=date.getDay();if(dow===0)return null;
              const m=EMPS.filter(e=>e.t==="M"&&getStatus(e,date,overrides)==="PRESENT").length;
              const s=EMPS.filter(e=>e.t==="S"&&getStatus(e,date,overrides)==="PRESENT").length;
              const alert=m<8;
              return(<td key={date.getDate()} style={{textAlign:"center",padding:"4px 0",borderTop:`2px solid ${V.line}`,background:alert?"#fef2f2":"#f8fafc"}}>
                <div style={{fontSize:11,fontWeight:800,color:alert?V.red:V.mc}}>{m}</div>
                <div style={{fontSize:9,fontWeight:600,color:V.purple}}>{s}</div>
              </td>);
            })}
            <td style={{borderTop:`2px solid ${V.line}`,position:"sticky",right:0,background:"#f8fafc"}}/>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VUE SEMAINE
   ═══════════════════════════════════════════════════════════ */
const VueSemaine=({weekStart,overrides,triData,onEdit})=>{
  const days=Array.from({length:6},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const todayS=new Date().toISOString().slice(0,10);

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10}}>
      {days.map(date=>{
        const dow=date.getDay();const isT=date.toISOString().slice(0,10)===todayS;
        const matP=EMPS.filter(e=>e.t==="M"&&getStatus(e,date,overrides)==="PRESENT");
        const soirP=EMPS.filter(e=>e.t==="S"&&getStatus(e,date,overrides)==="PRESENT");
        const etuP=EMPS.filter(e=>e.t==="E"&&getStatus(e,date,overrides)==="PRESENT");
        const absents=EMPS.filter(e=>e.actif&&!["PRESENT","X"].includes(getStatus(e,date,overrides)));
        const triPair=triData[dow];const alert=matP.length<8;

        return(
          <Card key={date.getDate()} style={{padding:12,borderTop:isT?`3px solid ${V.mc}`:alert?`3px solid ${V.red}`:`3px solid transparent`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:isT?V.mc:V.body}}>{JL_FULL[dow]}</div>
                <div style={{fontSize:20,fontWeight:800,color:isT?V.mc:V.body}}>{date.getDate()}</div>
              </div>
              {isT&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:V.mc,padding:"2px 8px",borderRadius:6}}>Auj.</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:8}}>
              <div style={{borderRadius:6,padding:"5px",background:V.mG,textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:alert?V.red:V.mc}}>{matP.length}</div>
                <div style={{fontSize:8,fontWeight:700,color:V.light}}>MATIN</div>
              </div>
              <div style={{borderRadius:6,padding:"5px",background:"linear-gradient(135deg,#f5f2fe,#faf8ff)",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:V.purple}}>{soirP.length}</div>
                <div style={{fontSize:8,fontWeight:700,color:V.light}}>SOIR</div>
              </div>
            </div>
            {/* Présents */}
            <div style={{fontSize:9,fontWeight:700,color:V.light,marginBottom:3}}>PRÉSENTS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:6}}>
              {matP.map(e=>(
                <span key={e.n} onClick={()=>onEdit(e,date)} style={{
                  fontSize:8,fontWeight:600,color:V.body,background:"#f0f4f8",padding:"2px 5px",borderRadius:4,cursor:"pointer",
                  border:isTriCaddie(e.n,dow,triData)?`1px solid ${V.amber}`:"1px solid transparent",
                }}>{e.n}</span>
              ))}
            </div>
            {absents.length>0&&(<>
              <div style={{fontSize:9,fontWeight:700,color:V.red,marginBottom:3}}>ABSENTS</div>
              <div style={{display:"flex",flexDirection:"column",gap:1,marginBottom:6}}>
                {absents.slice(0,4).map(e=>{const s=getStatus(e,date,overrides);const sc=ST[s];return(
                  <div key={e.n} style={{fontSize:8,padding:"2px 5px",borderRadius:4,background:sc.bg,color:sc.c,fontWeight:700,display:"flex",justifyContent:"space-between"}}>
                    <span>{e.n}</span><span>{sc.short}</span>
                  </div>
                );})}
                {absents.length>4&&<div style={{fontSize:8,color:V.light}}>+{absents.length-4} autres</div>}
              </div>
            </>)}
            {triPair&&(<div style={{padding:"3px 6px",borderRadius:6,background:`${V.amber}08`,border:`1px solid ${V.amber}15`,fontSize:8}}>
              <span style={{fontWeight:700,color:V.amber}}>Tri :</span> <span style={{color:V.body}}>{triPair.join(" + ")}</span>
            </div>)}
          </Card>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VUE JOUR
   ═══════════════════════════════════════════════════════════ */
const VueJour=({date,overrides,triData,binomes,onEdit})=>{
  const dow=date.getDay();const dayLabel=date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const todayS=new Date().toISOString().slice(0,10);const isT=date.toISOString().slice(0,10)===todayS;

  const grouped={matin:[],soir:[],etu:[],absRH:[],absCP:[],absMAL:[],absOther:[]};
  EMPS.forEach(e=>{
    const s=getStatus(e,date,overrides);
    if(s==="PRESENT"){if(e.t==="M")grouped.matin.push(e);else if(e.t==="S")grouped.soir.push(e);else grouped.etu.push(e);}
    else if(s==="RH")grouped.absRH.push(e);else if(s==="CP")grouped.absCP.push(e);else if(s==="MAL")grouped.absMAL.push(e);
    else if(s!=="X")grouped.absOther.push({...e,statut:s});
  });
  const triPair=triData[dow];const alert=grouped.matin.length<8;

  const EmpCard=({e,horaire,tri})=>(
    <div onClick={()=>onEdit(e,date)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`,cursor:"pointer",borderLeft:tri?`3px solid ${V.amber}`:"3px solid transparent"}}
      onMouseEnter={ev=>ev.currentTarget.style.background=V.mL} onMouseLeave={ev=>ev.currentTarget.style.background="rgba(248,250,252,0.6)"}>
      <div style={{width:32,height:32,borderRadius:10,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:V.mc}}>{e.n.substring(0,2)}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:V.body}}>{e.n}</div>
        <div style={{fontSize:11,color:V.muted}}>{e.obs}{tri?" — Tri caddie":""}</div>
      </div>
      {horaire&&<span style={{fontSize:12,fontWeight:700,color:V.mc,background:V.mL,padding:"4px 10px",borderRadius:8}}>{horaire}</span>}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
        <div style={{fontSize:22,fontWeight:800,color:isT?V.mc:V.body}}>{dayLabel}</div>
        {isT&&<span style={{fontSize:11,fontWeight:700,color:"#fff",background:V.mc,padding:"4px 12px",borderRadius:8}}>Aujourd'hui</span>}
        {alert&&<span style={{fontSize:11,fontWeight:700,color:V.red,background:"#fef2f2",padding:"4px 12px",borderRadius:8}}>Sous-effectif</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <KPI value={grouped.matin.length} label="Matin" color={alert?V.red:V.mc} gradient={alert?"linear-gradient(135deg,#fef1f2,#fff8f8)":V.mG}/>
        <KPI value={grouped.soir.length} label="Après-midi" color={V.purple} gradient="linear-gradient(135deg,#f5f2fe,#faf8ff)"/>
        <KPI value={grouped.etu.length} label="Étudiants" color={grouped.etu.length>0?V.cyan:"#9ca3af"} gradient={grouped.etu.length>0?"linear-gradient(135deg,#effcfd,#f7feff)":"linear-gradient(135deg,#f5f7fa,#fafbfc)"}/>
        <KPI value={grouped.absRH.length+grouped.absCP.length+grouped.absMAL.length+grouped.absOther.length} label="Absents" color={V.red} gradient="linear-gradient(135deg,#fef1f2,#fff8f8)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <div>
          <Card><Kicker label="ÉQUIPE MATIN" icon={CalIcon}/><div style={{display:"grid",gap:6,marginTop:12}}>{grouped.matin.map(e=><EmpCard key={e.n} e={e} horaire={getHoraire(e,date,overrides)} tri={isTriCaddie(e.n,dow,triData)}/>)}</div></Card>
          {(grouped.soir.length>0||grouped.etu.length>0)&&(<Card style={{marginTop:14}}><Kicker label="APRÈS-MIDI & ÉTUDIANTS" icon={CalIcon}/><div style={{display:"grid",gap:6,marginTop:12}}>{[...grouped.soir,...grouped.etu].map(e=><EmpCard key={e.n} e={e} horaire={getHoraire(e,date,overrides)}/>)}</div></Card>)}
        </div>
        <div>
          <Card><Kicker label="ABSENTS DU JOUR" icon={CalIcon}/>
            <div style={{display:"grid",gap:6,marginTop:12}}>
              {[{l:"Repos hebdo",list:grouped.absRH,sc:ST.RH},{l:"Congés",list:grouped.absCP,sc:ST.CP},{l:"Maladie",list:grouped.absMAL,sc:ST.MAL},{l:"Autres",list:grouped.absOther,sc:ST.ABS}].filter(g=>g.list.length>0).map(g=>(
                <div key={g.l}>
                  <div style={{fontSize:10,fontWeight:700,color:g.sc.c,marginBottom:3}}>{g.l.toUpperCase()}</div>
                  {g.list.map(e=>(<div key={e.n} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:10,background:g.sc.bg,marginBottom:2,border:`1px solid ${g.sc.c}15`}}><span style={{fontSize:12,fontWeight:700,color:V.body}}>{e.n}</span><span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:g.sc.c}}>{g.sc.l}</span></div>))}
                </div>
              ))}
              {grouped.absRH.length===0&&grouped.absCP.length===0&&grouped.absMAL.length===0&&grouped.absOther.length===0&&<div style={{padding:16,textAlign:"center",color:V.light}}>Personne absent</div>}
            </div>
          </Card>
          {triPair&&<Card style={{marginTop:14}}><Kicker label="TRI CADDIE" icon={CartIcon}/><div style={{display:"flex",gap:8,marginTop:12}}>{triPair.map(n=>(<div key={n} style={{flex:1,padding:"12px",borderRadius:12,background:V.mG,textAlign:"center",border:`1px solid ${V.amber}20`}}><div style={{fontSize:14,fontWeight:700}}>{n}</div></div>))}</div></Card>}
          <Card style={{marginTop:14}}><Kicker label="BINÔMES REPOS" icon={LinkIcon}/><div style={{display:"grid",gap:4,marginTop:10}}>{binomes.map((pair,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`,fontSize:12}}><span style={{width:20,height:20,borderRadius:6,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:V.mc}}>{i+1}</span><span style={{fontWeight:600}}>{pair.join(" + ")}</span></div>))}</div></Card>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function PlanningApp(){
  const [view,setView]=useState("mois");
  const [year,setYear]=useState(2026);
  const [month,setMonth]=useState(2);
  const [selectedDate,setSelectedDate]=useState(new Date(2026,2,20));
  const [filter,setFilter]=useState("ALL");
  const [overrides,setOverrides]=useState({}); // key: "NAME_2026-03-20" → {s:"CP",h:"6h-13h"}
  const [editing,setEditing]=useState(null);
  const [triData,setTriData]=useState({1:["CECILE","WASIM"],2:["ROSALIE","JAMAA"],3:["JEREMY","KAMEL"],4:["EL HASSANE","LIYAKATH"],5:["KHANH","YASSINE"],6:["MOHCINE","PASCALE"]});
  const [binomes,setBinomes]=useState([["ROSALIE","JEREMY"],["KHANH","CECILE"],["MOHCINE","KAMEL"],["EL HASSANE","JAMAA"],["WASIM","LIYAKATH"],["MOHAMED","PASCALE"]]);
  const [editTri,setEditTri]=useState(null); // dow number
  const [editBinome,setEditBinome]=useState(null); // index

  const weekStart=useMemo(()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;},[selectedDate]);
  const weekLabel=`${weekStart.getDate()} ${MOIS_FR[weekStart.getMonth()].substring(0,3)} → ${new Date(weekStart.getTime()+5*864e5).getDate()} ${MOIS_FR[new Date(weekStart.getTime()+5*864e5).getMonth()].substring(0,3)}`;

  const nav=(dir)=>{
    if(view==="mois"){if(dir<0){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}else{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}}
    else if(view==="semaine"){setSelectedDate(d=>{const n=new Date(d);n.setDate(n.getDate()+(dir*7));return n;});}
    else{setSelectedDate(d=>{const n=new Date(d);n.setDate(n.getDate()+dir);if(n.getDay()===0)n.setDate(n.getDate()+dir);return n;});}
  };

  const handleEdit=(emp,date)=>{
    const s=getStatus(emp,date,overrides);
    const h=getHoraire(emp,date,overrides);
    const dh=getDefaultHoraire(emp,date);
    setEditing({emp,date,s,h,dh});
  };

  const saveEdit=(s,h,scope)=>{
    if(!editing)return;
    if(scope==="mois"&&h){
      // Apply to all working days of the month for this employee
      const emp=editing.emp;
      const d=editing.date;
      const y=d.getFullYear();const m=d.getMonth();
      const days=daysInMonth(y,m);
      setOverrides(p=>{
        const next={...p};
        for(let day=1;day<=days;day++){
          const dt=new Date(y,m,day);
          const dow=dt.getDay();
          if(dow===0) continue; // skip sunday
          const curS=getStatus(emp,dt,p);
          if(curS==="PRESENT"){
            const key=`${emp.n}_${dt.toISOString().slice(0,10)}`;
            next[key]={s:"PRESENT",h};
          }
        }
        // Also apply the statut change for the clicked day
        const key=`${emp.n}_${d.toISOString().slice(0,10)}`;
        next[key]={s,h};
        return next;
      });
    } else {
      const key=`${editing.emp.n}_${editing.date.toISOString().slice(0,10)}`;
      setOverrides(p=>({...p,[key]:{s,h}}));
    }
    setEditing(null);
  };

  const todayDate=new Date(2026,2,20);
  const mCount=EMPS.filter(e=>e.t==="M"&&getStatus(e,todayDate,overrides)==="PRESENT").length;
  const sCount=EMPS.filter(e=>e.t==="S"&&getStatus(e,todayDate,overrides)==="PRESENT").length;
  const absCount=EMPS.filter(e=>e.actif&&!["PRESENT","X"].includes(getStatus(e,todayDate,overrides))).length;

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:V.body,minHeight:"100vh",background:`radial-gradient(circle at top left,rgba(29,95,160,0.06),transparent 24%),linear-gradient(180deg,#f9fbfd 0%,${V.bg} 100%)`}}>
      <div style={{maxWidth:1600,margin:"0 auto",padding:18}}>

        {/* HEADER */}
        <Card style={{padding:"14px 22px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:14,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center"}}>{CalIcon}</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:V.mc}}>PLANNING ÉQUIPE</div>
              <div style={{fontSize:20,fontWeight:700,color:V.text}}>
                {view==="mois"?`${MOIS_FR[month]} ${year}`:view==="semaine"?`Semaine du ${weekLabel}`:selectedDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Chev dir="l" onClick={()=>nav(-1)}/>
            <Chev dir="r" onClick={()=>nav(1)}/>
            <div style={{display:"flex",gap:3,background:"rgba(241,245,249,0.8)",borderRadius:10,padding:3,marginLeft:6}}>
              {[{v:"mois",l:"Mois"},{v:"semaine",l:"Semaine"},{v:"jour",l:"Jour"}].map(t=>(
                <button key={t.v} onClick={()=>setView(t.v)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:view===t.v?700:500,background:view===t.v?"#fff":"transparent",color:view===t.v?V.mc:V.light,boxShadow:view===t.v?"0 1px 4px rgba(0,0,0,0.06)":"none"}}>{t.l}</button>
              ))}
            </div>
            {view==="mois"&&(
              <div style={{display:"flex",gap:3,background:"rgba(241,245,249,0.8)",borderRadius:10,padding:3,marginLeft:4}}>
                {[{v:"ALL",l:"Tous"},{v:"M",l:"Matin"},{v:"S",l:"Soir"},{v:"E",l:"Étu."}].map(f=>(
                  <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:filter===f.v?700:500,background:filter===f.v?"#fff":"transparent",color:filter===f.v?V.mc:V.light}}>{f.l}</button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <KPI value={mCount} label="Matin aujourd'hui" color={mCount<8?V.red:V.mc} gradient={mCount<8?"linear-gradient(135deg,#fef1f2,#fff8f8)":V.mG}/>
          <KPI value={sCount} label="Après-midi" color={V.purple} gradient="linear-gradient(135deg,#f5f2fe,#faf8ff)"/>
          <KPI value={absCount} label="Absents" color={absCount>3?V.red:V.amber} gradient={absCount>3?"linear-gradient(135deg,#fef1f2,#fff8f8)":"linear-gradient(135deg,#fffbeb,#fffef5)"}/>
          <KPI value={EMPS.filter(e=>e.actif&&e.t==="M").length} label="Effectif matin" color={V.green} gradient="linear-gradient(135deg,#ecfdf5,#f0faf4)"/>
        </div>

        {/* VIEWS */}
        <Card style={view==="semaine"?{padding:14}:{}}>
          {view!=="semaine"&&<Legend/>}
          {view!=="semaine"&&<div style={{height:1,background:`linear-gradient(90deg,transparent,${V.line},transparent)`,margin:"8px 0 12px"}}/>}
          {view==="mois"&&<VueMois year={year} month={month} filter={filter} overrides={overrides} triData={triData} onEdit={handleEdit}/>}
          {view==="semaine"&&<VueSemaine weekStart={weekStart} overrides={overrides} triData={triData} onEdit={handleEdit}/>}
          {view==="jour"&&<VueJour date={selectedDate} overrides={overrides} triData={triData} binomes={binomes} onEdit={handleEdit}/>}
        </Card>

        {/* TRI CADDIE + BINÔMES (month view) */}
        {view==="mois"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
            <Card>
              <Kicker label="TRI CADDIE — cliquer pour modifier" icon={CartIcon}/>
              <H2>Rotation mars 2026</H2>
              <div style={{display:"grid",gap:6,marginTop:12}}>
                {Object.entries(triData).map(([dow,pair])=>(
                  <div key={dow} onClick={()=>setEditTri(parseInt(dow))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=V.amber+"40"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(226,232,240,0.5)"}>
                    <span style={{fontSize:12,fontWeight:700,color:V.mc,minWidth:40}}>{JL[dow]}</span>
                    <span style={{fontSize:13,fontWeight:600,color:V.body,flex:1}}>{pair.join(" + ")}</span>
                    <span style={{color:V.light}}>{EditIcon}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <Kicker label="BINÔMES REPOS — cliquer pour modifier" icon={LinkIcon}/>
              <H2>Paires fixes</H2>
              <div style={{display:"grid",gap:6,marginTop:12}}>
                {binomes.map((pair,i)=>(
                  <div key={i} onClick={()=>setEditBinome(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=V.mc+"40"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(226,232,240,0.5)"}>
                    <span style={{width:24,height:24,borderRadius:8,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:V.mc}}>{i+1}</span>
                    <span style={{fontSize:13,fontWeight:600,color:V.body,flex:1}}>{pair.join(" + ")}</span>
                    <span style={{color:V.light}}>{EditIcon}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODALS */}
      {editing&&<EditCellModal empName={editing.emp.n} date={editing.date} currentStatut={editing.s} currentHoraire={editing.h} defaultHoraire={editing.dh} monthLabel={`${MOIS_FR[editing.date.getMonth()]} ${editing.date.getFullYear()}`} onSave={saveEdit} onClose={()=>setEditing(null)}/>}
      {editTri!==null&&<EditTriModal dow={editTri} pair={triData[editTri]} allNames={ALL_EMP_NAMES} onSave={(pair)=>{setTriData(p=>({...p,[editTri]:pair}));setEditTri(null);}} onClose={()=>setEditTri(null)}/>}
      {editBinome!==null&&<EditBinomeModal index={editBinome} pair={binomes[editBinome]} allNames={ALL_EMP_NAMES} onSave={(pair)=>{setBinomes(p=>{const n=[...p];n[editBinome]=pair;return n;});setEditBinome(null);}} onClose={()=>setEditBinome(null)}/>}
    </div>
  );
}
