"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  createRhEmployeeInSupabase,
  defaultRhCycles,
  defaultRhEmployees,
  getRhUpdatedEventName,
  loadRhCycles,
  loadRhEmployees,
  renameRhCycleCache,
  saveRhCycleInSupabase,
  syncRhFromSupabase,
  updateRhEmployeeInSupabase,
} from "@/lib/rh-store";
import {
  RH_ROLE_OPTIONS,
  getRhEmployeeRoleLabel,
  getRhEmployeeRoleMeta,
} from "@/lib/rh-status";
import {
  getTgUpdatedEventName,
  loadTgDefaultAssignments,
  loadTgRayons,
  syncTgFromSupabase,
} from "@/lib/tg-store";

/* ═══════════════════════════════════════════════════════════
   THEME — RH = Teal foncé
   ═══════════════════════════════════════════════════════════ */
const V = {
  bg:"#f2f5f8",card:"rgba(255,255,255,0.92)",border:"rgba(226,232,240,0.5)",line:"#dbe3eb",
  text:"#0f172a",body:"#1e293b",muted:"#64748b",light:"#94a3b8",
  shadow:"0 1px 2px rgba(0,0,0,0.03),0 4px 16px rgba(0,0,0,0.04),0 12px 32px rgba(0,0,0,0.02)",
  mc:"#0f766e",mL:"#f0fdfa",mM:"#ccfbf1",mD:"#115e59",
  mG:"linear-gradient(135deg,#f0fdfa 0%,#f7fefb 50%,#fcfefd 100%)",
  mIG:"linear-gradient(135deg,#ccfbf1,#99f6e4)",
  green:"#16a34a",amber:"#d97706",red:"#dc2626",purple:"#5635b8",blue:"#1d5fa0",orange:"#ea580c",pink:"#db2777",
};

const TYPE_LABELS = { M:{l:"Matin",c:V.blue,bg:"#eff6ff"}, S:{l:"Après-midi",c:V.purple,bg:"#f5f3ff"}, E:{l:"Étudiant",c:"#9ca3af",bg:"#f5f7f9"} };
const JOURS = ["LUN","MAR","MER","JEU","VEN","SAM"];
const JOURS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

function compareEmployeesByName(a,b){
  return String(a?.n||"").localeCompare(String(b?.n||""),"fr");
}

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const IC = {
  users:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  user:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  clock:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  refresh:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  edit:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};

/* ═══════════════════════════════════════════════════════════
   UI PRIMITIVES
   ═══════════════════════════════════════════════════════════ */
const Card=({children,style})=>(<div style={{background:V.card,backdropFilter:"blur(12px)",border:`1px solid ${V.border}`,borderRadius:20,boxShadow:V.shadow,padding:22,...style}}>{children}</div>);
const Kicker=({icon,label})=>(<div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:10,background:V.mM,color:V.mD,fontSize:11,fontWeight:700,letterSpacing:"0.04em"}}>{icon(V.mc,14)}<span>{label}</span></div>);
const H2=({children})=>(<h2 style={{margin:"10px 0 6px",fontSize:20,fontWeight:700,letterSpacing:"-0.02em",color:V.text}}>{children}</h2>);
const KPI=({value,label,color,gradient,sub})=>(<div style={{borderRadius:16,padding:"16px 12px",textAlign:"center",background:gradient}}><strong style={{display:"block",fontSize:28,lineHeight:1,marginBottom:4,fontWeight:800,color}}>{value}</strong><span style={{fontSize:11,fontWeight:600,color:color+"99"}}>{label}</span>{sub&&<div style={{fontSize:10,color:V.light,marginTop:2}}>{sub}</div>}</div>);
const RoleBadge=({value,type,size="md"})=>{
  const meta=getRhEmployeeRoleMeta(value,type);
  return(
    <span style={{
      display:"inline-flex",alignItems:"center",gap:6,
      fontSize:size==="sm"?9:10,fontWeight:700,color:meta.color,
      background:meta.bg,padding:size==="sm"?"2px 8px":"3px 10px",borderRadius:999,
      border:`1px solid ${meta.border}`,
    }}>
      <span style={{width:size==="sm"?7:8,height:size==="sm"?7:8,borderRadius:999,background:meta.color,flexShrink:0}}/>
      {meta.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   EDIT EMPLOYEE MODAL
   ═══════════════════════════════════════════════════════════ */
const EditEmpModal=({emp,availableRayons,onSave,onClose})=>{
  const [d,setD]=useState({...emp});
  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  const roleMeta=getRhEmployeeRoleMeta(d.obs,d.t);
  const toggleRayon=(rayon)=>{
    const current = Array.isArray(d.rayons) ? d.rayons : [];
    if(current.includes(rayon)){
      upd("rayons", current.filter((item)=>item!==rayon));
      return;
    }
    upd("rayons", [...current, rayon]);
  };

  const handlePhoto=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>upd("photo",ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleTypeChange=(value)=>{
    setD((current)=>{
      const currentRole=getRhEmployeeRoleMeta(current.obs,current.t).id;
      const nextRole=
        value==="E"&&currentRole==="COLLABORATEUR"
          ? getRhEmployeeRoleLabel("ETUDIANT",value)
          : value!=="E"&&currentRole==="ETUDIANT"
            ? getRhEmployeeRoleLabel("COLLABORATEUR",value)
            : getRhEmployeeRoleLabel(current.obs,value);
      return {
        ...current,
        t:value,
        hs:value==="E"?null:(current.hs||"3h50-11h20"),
        hm:value==="E"?null:(current.hm||"3h00-10h30"),
        hsa:value==="E"?(current.hsa||"14h-21h30"):current.hsa,
        obs:nextRole,
      };
    });
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:"min(520px, calc(100vw - 32px))",maxHeight:"calc(100vh - 32px)",display:"flex",flexDirection:"column",boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.mc,padding:"18px 24px",color:"#fff",display:"flex",alignItems:"center",gap:16}}>
          {/* Photo / Avatar */}
          <div style={{position:"relative"}}>
            <Avatar name={d.n} photo={d.photo} size={64} active={true}/>
            <label style={{
              position:"absolute",bottom:-4,right:-4,width:24,height:24,borderRadius:8,
              background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
          </div>
          <div>
            <div style={{fontSize:20,fontWeight:700}}>{d.n}</div>
            <div style={{fontSize:13,opacity:0.8}}>Fiche employé — Données RH</div>
          </div>
        </div>
        <div style={{padding:24,overflowY:"auto"}}>
          {/* Photo section */}
          {d.photo&&(
            <div style={{marginBottom:16,padding:"10px 14px",borderRadius:12,background:"#f8fafc",border:`1px solid ${V.line}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={d.n} photo={d.photo} size={32}/>
                <span style={{fontSize:12,color:V.muted}}>Photo ajoutée</span>
              </div>
              <button onClick={()=>upd("photo",null)} style={{fontSize:11,fontWeight:700,color:V.red,background:"#fef2f2",border:`1px solid ${V.red}15`,borderRadius:8,padding:"4px 12px",cursor:"pointer"}}>Supprimer la photo</button>
            </div>
          )}
          {/* Infos de base */}
          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>INFORMATIONS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Nom</label>
              <input value={d.n} onChange={e=>upd("n",e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Type</label>
              <select value={d.t} onChange={e=>handleTypeChange(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",color:TYPE_LABELS[d.t]?.c||V.body}}>
                <option value="M">Matin</option>
                <option value="S">Après-midi</option>
                <option value="E">Étudiant</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Observation / statut RH</label>
              <select value={getRhEmployeeRoleLabel(d.obs,d.t)} onChange={e=>upd("obs",e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${roleMeta.border}`,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",color:roleMeta.color}}>
                {RH_ROLE_OPTIONS.map((role)=>(
                  <option key={role.id} value={role.label}>{role.label}</option>
                ))}
              </select>
              <div style={{marginTop:6}}>
                <RoleBadge value={d.obs} type={d.t}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Statut</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>upd("actif",true)} style={{flex:1,padding:"8px",borderRadius:8,border:d.actif?`2px solid ${V.green}`:`1px solid ${V.line}`,background:d.actif?"#ecfdf5":"#fafafa",color:d.actif?V.green:V.light,fontSize:12,fontWeight:700,cursor:"pointer"}}>Actif</button>
                <button onClick={()=>upd("actif",false)} style={{flex:1,padding:"8px",borderRadius:8,border:!d.actif?`2px solid ${V.red}`:`1px solid ${V.line}`,background:!d.actif?"#fef2f2":"#fafafa",color:!d.actif?V.red:V.light,fontSize:12,fontWeight:700,cursor:"pointer"}}>Inactif</button>
              </div>
            </div>
          </div>

          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>RAYONS RESPONSABLE TG/GB</div>
          <div style={{padding:"14px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.line}`,marginBottom:18}}>
            <div style={{display:"grid",gap:6,maxHeight:170,overflowY:"auto",paddingRight:4}}>
              {availableRayons.map((rayon)=> {
                const checked = Array.isArray(d.rayons) && d.rayons.includes(rayon);
                return (
                  <label key={rayon} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.body,cursor:"pointer"}}>
                    <input type="checkbox" checked={checked} onChange={()=>toggleRayon(rayon)} style={{accentColor:V.mc}}/>
                    <span>{rayon}</span>
                  </label>
                );
              })}
            </div>
            <div style={{fontSize:10,color:V.light,marginTop:8}}>
              Cette affectation définit le responsable par défaut des rayons dans le module Plan TG.
            </div>
          </div>

          {/* Horaires par défaut */}
          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>HORAIRES PAR DÉFAUT</div>
          <div style={{padding:"16px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.line}`,marginBottom:18}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Standard (Lun/Mer/Jeu/Ven)</label>
                <input value={d.hs||""} onChange={e=>upd("hs",e.target.value)} placeholder="Ex: 3h50-11h20"
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.mc}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.mc}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Mardi</label>
                <input value={d.hm||""} onChange={e=>upd("hm",e.target.value)} placeholder="Ex: 3h00-10h30"
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.amber}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.amber}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Samedi</label>
                <input value={d.hsa||""} onChange={e=>upd("hsa",e.target.value)} placeholder="Ex: 14h-21h30"
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.purple}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.purple}}/>
              </div>
            </div>
            <div style={{fontSize:10,color:V.light,marginTop:8}}>
              Ces horaires sont ceux utilisés par défaut dans le planning. Des modifications ponctuelles peuvent être faites depuis le planning (par jour ou par mois).
            </div>
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,background:"#fff",display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Annuler</button>
          <button onClick={()=>onSave(d)} style={{padding:"10px 24px",borderRadius:10,border:"none",background:V.mc,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   EDIT CYCLE MODAL
   ═══════════════════════════════════════════════════════════ */
const EditCycleModal=({empName,cycle,onSave,onClose,busy})=>{
  const [c,setC]=useState([...cycle]);
  const updWeek=(i,val)=>{const n=[...c];n[i]=val;setC(n);};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:500,boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.purple,padding:"18px 24px",color:"#fff"}}>
          <div style={{fontSize:18,fontWeight:700}}>{empName}</div>
          <div style={{fontSize:13,opacity:0.8}}>Cycle de repos — 5 semaines</div>
        </div>
        <div style={{padding:24}}>
          <div style={{fontSize:12,color:V.muted,marginBottom:14,lineHeight:1.4}}>
            Chaque semaine du cycle définit le jour de repos hebdomadaire. Le cycle se répète toutes les 5 semaines sur l&apos;année.
          </div>
          <div style={{display:"grid",gap:8}}>
            {c.map((jour,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,background:"#f8fafc",border:`1px solid ${V.line}`}}>
                <span style={{width:32,height:32,borderRadius:10,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:V.mc,flexShrink:0}}>S{i+1}</span>
                <span style={{fontSize:13,fontWeight:600,color:V.body,minWidth:70}}>Semaine {i+1}</span>
                <div style={{display:"flex",gap:4,flex:1}}>
                  {JOURS.map(j=>(
                    <button key={j} onClick={()=>updWeek(i,j)} style={{
                      flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
                      border:c[i]===j?`2px solid ${V.purple}`:`1px solid ${V.line}`,
                      background:c[i]===j?V.purple:"#fff",
                      color:c[i]===j?"#fff":V.light,
                    }}>{j}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} disabled={busy} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:busy?"not-allowed":"pointer",opacity:busy?0.6:1,fontSize:13}}>Annuler</button>
          <button
            onClick={()=>onSave(c)}
            disabled={busy}
            style={{
              padding:"10px 24px",borderRadius:10,border:"none",background:V.purple,color:"#fff",
              cursor:busy?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:busy?0.7:1,
            }}
          >
            {busy?"Enregistrement...":"Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
};

const NewEmpModal=({availableRayons,onSave,onClose})=>{
  const [d,setD]=useState({
    n:"",
    t:"M",
    hs:"3h50-11h20",
    hm:"3h00-10h30",
    hsa:null,
    obs:"Collaborateur",
    actif:true,
    photo:null,
    rayons:[],
  });
  const [cycle,setCycle]=useState(["LUN","LUN","LUN","LUN","LUN"]);
  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  const roleMeta=getRhEmployeeRoleMeta(d.obs,d.t);
  const toggleRayon=(rayon)=>{
    const current = Array.isArray(d.rayons) ? d.rayons : [];
    if(current.includes(rayon)){
      upd("rayons", current.filter((item)=>item!==rayon));
      return;
    }
    upd("rayons", [...current, rayon]);
  };

  const handleTypeChange=(value)=>{
    setD((current)=>{
      const currentRole=getRhEmployeeRoleMeta(current.obs,current.t).id;
      const nextRole=
        value==="E"&&currentRole==="COLLABORATEUR"
          ? getRhEmployeeRoleLabel("ETUDIANT",value)
          : value!=="E"&&currentRole==="ETUDIANT"
            ? getRhEmployeeRoleLabel("COLLABORATEUR",value)
            : getRhEmployeeRoleLabel(current.obs,value);
      return {
        ...current,
        t:value,
        hs:value==="E"?null:(current.hs||"3h50-11h20"),
        hm:value==="E"?null:(current.hm||"3h00-10h30"),
        hsa:value==="E"?(current.hsa||"14h-21h30"):current.hsa,
        obs:nextRole,
      };
    });
  };

  const handlePhoto=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>upd("photo",ev.target.result);
    reader.readAsDataURL(file);
  };

  const canSave = d.n.trim().length > 1;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:"min(720px, calc(100vw - 32px))",maxHeight:"calc(100vh - 32px)",display:"flex",flexDirection:"column",boxShadow:"0 24px 48px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{background:V.mc,padding:"18px 24px",color:"#fff",display:"flex",alignItems:"center",gap:16}}>
          <div style={{position:"relative"}}>
            <Avatar name={d.n||"NOUVEAU"} photo={d.photo} size={64} active={d.actif}/>
            <label style={{position:"absolute",bottom:-4,right:-4,width:24,height:24,borderRadius:8,background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
          </div>
          <div>
            <div style={{fontSize:20,fontWeight:700}}>Nouvel employe</div>
            <div style={{fontSize:13,opacity:0.8}}>Creation fiche RH complete</div>
          </div>
        </div>
        <div style={{padding:24,overflowY:"auto"}}>
          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>INFORMATIONS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Nom</label>
              <input value={d.n} onChange={e=>upd("n",e.target.value.toUpperCase())} placeholder="Ex: NOUVEL EMPLOYE" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Type</label>
              <select value={d.t} onChange={e=>handleTypeChange(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:14,fontWeight:700,outline:"none",color:TYPE_LABELS[d.t]?.c||V.body}}>
                <option value="M">Matin</option>
                <option value="S">Apres-midi</option>
                <option value="E">Etudiant</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Observation / statut RH</label>
              <select value={getRhEmployeeRoleLabel(d.obs,d.t)} onChange={e=>upd("obs",e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${roleMeta.border}`,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",color:roleMeta.color}}>
                {RH_ROLE_OPTIONS.map((role)=>(
                  <option key={role.id} value={role.label}>{role.label}</option>
                ))}
              </select>
              <div style={{marginTop:6}}>
                <RoleBadge value={d.obs} type={d.t}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Statut</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>upd("actif",true)} style={{flex:1,padding:"8px",borderRadius:8,border:d.actif?`2px solid ${V.green}`:`1px solid ${V.line}`,background:d.actif?"#ecfdf5":"#fafafa",color:d.actif?V.green:V.light,fontSize:12,fontWeight:700,cursor:"pointer"}}>Actif</button>
                <button onClick={()=>upd("actif",false)} style={{flex:1,padding:"8px",borderRadius:8,border:!d.actif?`2px solid ${V.red}`:`1px solid ${V.line}`,background:!d.actif?"#fef2f2":"#fafafa",color:!d.actif?V.red:V.light,fontSize:12,fontWeight:700,cursor:"pointer"}}>Inactif</button>
              </div>
            </div>
          </div>

          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>HORAIRES PAR DEFAUT</div>
          <div style={{padding:"16px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.line}`,marginBottom:18}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Standard</label>
                <input value={d.hs||""} onChange={e=>upd("hs",e.target.value)} disabled={d.t==="E"} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.mc}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.mc,opacity:d.t==="E"?0.5:1}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Mardi</label>
                <input value={d.hm||""} onChange={e=>upd("hm",e.target.value)} disabled={d.t==="E"} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.amber}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.amber,opacity:d.t==="E"?0.5:1}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:V.muted,fontWeight:600,display:"block",marginBottom:3}}>Samedi</label>
                <input value={d.hsa||""} onChange={e=>upd("hsa",e.target.value)} placeholder="Ex: 14h-21h30" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.purple}25`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",color:V.purple}}/>
              </div>
            </div>
          </div>

          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>RAYONS RESPONSABLE TG/GB</div>
          <div style={{padding:"14px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.line}`,marginBottom:18}}>
            <div style={{display:"grid",gap:6,maxHeight:170,overflowY:"auto",paddingRight:4}}>
              {availableRayons.map((rayon)=> {
                const checked = Array.isArray(d.rayons) && d.rayons.includes(rayon);
                return (
                  <label key={rayon} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:V.body,cursor:"pointer"}}>
                    <input type="checkbox" checked={checked} onChange={()=>toggleRayon(rayon)} style={{accentColor:V.mc}}/>
                    <span>{rayon}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{fontSize:12,color:V.muted,fontWeight:700,marginBottom:8}}>CYCLE REPOS (5 SEMAINES)</div>
          <div style={{display:"grid",gap:8}}>
            {cycle.map((jour,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,background:"#f8fafc",border:`1px solid ${V.line}`}}>
                <span style={{width:32,height:32,borderRadius:10,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:V.mc,flexShrink:0}}>S{i+1}</span>
                <div style={{display:"flex",gap:4,flex:1}}>
                  {JOURS.map(j=>(
                    <button key={`${i}-${j}`} onClick={()=>{const n=[...cycle];n[i]=j;setCycle(n);}} style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",border:cycle[i]===j?`2px solid ${V.purple}`:`1px solid ${V.line}`,background:cycle[i]===j?V.purple:"#fff",color:cycle[i]===j?"#fff":V.light}}>
                      {j}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,background:"#fff",display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Annuler</button>
          <button disabled={!canSave} onClick={()=>canSave&&onSave({...d,cycle})} style={{padding:"10px 24px",borderRadius:10,border:"none",background:canSave?V.mc:"#cbd5e1",color:"#fff",cursor:canSave?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>Creer employe</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE CARD
   ═══════════════════════════════════════════════════════════ */
const EmpCard=({emp,cycle,onEditEmp,onEditCycle})=>{
  const tl=TYPE_LABELS[emp.t];
  const roleMeta=getRhEmployeeRoleMeta(emp.obs,emp.t);
  return(
    <Card style={{padding:0,overflow:"hidden",opacity:emp.actif?1:0.55}}>
      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${V.line}`,display:"flex",alignItems:"center",gap:12}}>
        <Avatar name={emp.n} photo={emp.photo} size={42} active={emp.actif}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:V.text}}>{emp.n}</span>
            <span style={{fontSize:10,fontWeight:700,color:tl.c,background:tl.bg,padding:"2px 10px",borderRadius:8,border:`1px solid ${tl.c}15`}}>{tl.l}</span>
            <RoleBadge value={emp.obs} type={emp.t}/>
            {!emp.actif&&<span style={{fontSize:10,fontWeight:700,color:V.red,background:"#fef2f2",padding:"2px 10px",borderRadius:8}}>Inactif</span>}
          </div>
          <div style={{fontSize:12,color:V.muted,marginTop:1}}>Statut RH : <span style={{fontWeight:700,color:roleMeta.color}}>{roleMeta.label}</span></div>
        </div>
        <button onClick={onEditEmp} style={{width:34,height:34,borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.edit(V.muted,15)}</button>
      </div>

      {/* Horaires */}
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${V.line}`}}>
        <div style={{fontSize:10,fontWeight:700,color:V.light,letterSpacing:"0.04em",marginBottom:6}}>HORAIRES PAR DÉFAUT</div>
        <div style={{display:"flex",gap:8}}>
          {[
            {l:"Standard",v:emp.hs,c:V.mc},
            {l:"Mardi",v:emp.hm,c:V.amber},
            {l:"Samedi",v:emp.hsa||emp.hs,c:V.purple},
          ].map(h=>h.v?(
            <div key={h.l} style={{flex:1,padding:"6px 10px",borderRadius:8,background:`${h.c}08`,border:`1px solid ${h.c}15`,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:h.c,marginBottom:2}}>{h.l}</div>
              <div style={{fontSize:12,fontWeight:700,color:V.body}}>{h.v}</div>
            </div>
          ):null)}
        </div>
      </div>

      {/* Cycle repos */}
      {cycle&&(
        <div style={{padding:"12px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontSize:10,fontWeight:700,color:V.light,letterSpacing:"0.04em"}}>CYCLE REPOS (5 SEMAINES)</div>
            <button onClick={onEditCycle} style={{fontSize:10,fontWeight:700,color:V.purple,background:V.purple+"10",border:`1px solid ${V.purple}15`,borderRadius:6,padding:"3px 8px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              {IC.edit(V.purple,10)} Modifier
            </button>
          </div>
          <div style={{display:"flex",gap:4}}>
            {cycle.map((jour,i)=>(
              <div key={i} style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:8,background:`${V.purple}08`,border:`1px solid ${V.purple}12`}}>
                <div style={{fontSize:8,fontWeight:700,color:V.light}}>S{i+1}</div>
                <div style={{fontSize:12,fontWeight:800,color:V.purple}}>{jour}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════
   CYCLE OVERVIEW TABLE
   ═══════════════════════════════════════════════════════════ */
const CycleOverview=({emps,cycles,onEditCycle})=>{
  const filtered=[...emps]
    .filter(e=>e.t!=="E"&&cycles[e.n])
    .sort(compareEmployeesByName);
  return(
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${V.line}`}}>
        <Kicker icon={IC.refresh} label="VUE D'ENSEMBLE CYCLES"/>
        <H2>Rotation des repos — 5 semaines</H2>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#f8fafc"}}>
              <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:V.light,textAlign:"left",borderBottom:`2px solid ${V.line}`,position:"sticky",left:0,background:"#f8fafc",zIndex:2}}>Employé</th>
              {[1,2,3,4,5].map(s=>(
                <th key={s} style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:V.purple,textAlign:"center",borderBottom:`2px solid ${V.line}`,minWidth:80}}>Semaine {s}</th>
              ))}
              <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:V.light,textAlign:"center",borderBottom:`2px solid ${V.line}`}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp=>{
              const cy=cycles[emp.n]||[];
              return(
                <tr key={emp.n} style={{background:"#fff"}} onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,borderBottom:`1px solid ${V.line}`,position:"sticky",left:0,background:"inherit",zIndex:2}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:8,height:8,borderRadius:99,background:getRhEmployeeRoleMeta(emp.obs,emp.t).color}}/>{emp.n}
                    </div>
                  </td>
                  {cy.map((jour,i)=>{
                    const isSam=jour==="SAM";
                    return(
                      <td key={i} style={{padding:"8px 14px",textAlign:"center",borderBottom:`1px solid ${V.line}`}}>
                        <span style={{
                          display:"inline-flex",alignItems:"center",justifyContent:"center",
                          minWidth:42,padding:"5px 12px",borderRadius:8,
                          fontSize:13,fontWeight:700,
                          background:isSam?`${V.amber}12`:`${V.purple}08`,
                          color:isSam?V.amber:V.purple,
                          border:`1px solid ${isSam?V.amber:V.purple}15`,
                        }}>{JOURS_FULL[JOURS.indexOf(jour)]||jour}</span>
                      </td>
                    );
                  })}
                  <td style={{padding:"8px 10px",textAlign:"center",borderBottom:`1px solid ${V.line}`}}>
                    <button onClick={()=>onEditCycle(emp.n)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${V.line}`,background:"#fafafa",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.edit(V.muted,13)}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

function attachTgRayonsToEmployees(employees, assignments){
  const map = new Map();
  assignments.forEach((item)=>{
    const list = map.get(item.employee) || [];
    map.set(item.employee, [...list, item.rayon]);
  });
  return employees.map((employee)=>({
    ...employee,
    rayons: map.get(employee.n) || [],
  }));
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function RHModule(){
  const [view,setView]=useState("fiches"); // fiches | cycles
  const [emps,setEmps]=useState(()=>{
    const initialAssignments = loadTgDefaultAssignments();
    return attachTgRayonsToEmployees(loadRhEmployees()||defaultRhEmployees, initialAssignments);
  });
  const [cycles,setCycles]=useState(()=>loadRhCycles()||defaultRhCycles);
  const [tgRayons,setTgRayons]=useState(()=>loadTgRayons());
  const [tgAssignments,setTgAssignments]=useState(()=>loadTgDefaultAssignments());
  const [editEmp,setEditEmp]=useState(null);
  const [editCycleFor,setEditCycleFor]=useState(null);
  const [newEmpOpen,setNewEmpOpen]=useState(false);
  const [filterType,setFilterType]=useState("ALL");
  const [employeeFilter,setEmployeeFilter]=useState("ALL");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const availableRayons = useMemo(
    ()=>[...tgRayons]
      .filter((rayon)=>rayon.active)
      .sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0))
      .map((rayon)=>rayon.rayon),
    [tgRayons],
  );
  const rayonsByEmployee = useMemo(()=>{
    const map = new Map();
    tgAssignments.forEach((item)=>{
      const list = map.get(item.employee) || [];
      map.set(item.employee, [...list, item.rayon]);
    });
    return map;
  },[tgAssignments]);

  const refreshFromStores = () => {
    const refreshedAssignments = loadTgDefaultAssignments();
    setEmps(attachTgRayonsToEmployees(loadRhEmployees(), refreshedAssignments));
    setCycles(loadRhCycles());
    setTgRayons(loadTgRayons());
    setTgAssignments(refreshedAssignments);
  };

  const employeeOptions = useMemo(()=>{
    let list=[...emps];
    if(filterType!=="ALL") list=list.filter(e=>e.t===filterType);
    return list.sort(compareEmployeesByName);
  },[emps,filterType]);

  const filtered=useMemo(()=>{
    let list=[...employeeOptions];
    if(employeeFilter!=="ALL") list=list.filter((employee)=>employee.n===employeeFilter);
    return list;
  },[employeeFilter,employeeOptions]);

  useEffect(()=>{
    if(employeeFilter==="ALL") return;
    if(employeeOptions.some((employee)=>employee.n===employeeFilter)) return;
    setEmployeeFilter("ALL");
  },[employeeFilter,employeeOptions]);

  useEffect(() => {
    const rhEventName = getRhUpdatedEventName();
    const tgEventName = getTgUpdatedEventName();
    window.addEventListener(rhEventName, refreshFromStores);
    window.addEventListener(tgEventName, refreshFromStores);
    return () => {
      window.removeEventListener(rhEventName, refreshFromStores);
      window.removeEventListener(tgEventName, refreshFromStores);
    };
  }, []);

  useEffect(() => {
    void Promise.all([syncRhFromSupabase(), syncTgFromSupabase()]).then(() => {
      refreshFromStores();
    });
  }, []);

  const saveEmp=async(updated)=>{
    let previousName = updated.n;
    setBusy(true);
    setError("");
    try {
      const current = emps.find((item)=>item.id===updated.id);
      previousName = current?.n ?? updated.n;
      const synced = await updateRhEmployeeInSupabase(updated);
      setEmps((p)=>p.map((employee)=>employee.id===updated.id?{...synced,rayons:updated.rayons}:employee));

      if (previousName !== synced.n) {
        setCycles((p)=>{
          const next = { ...p };
          const existing = next[previousName];
          if (existing) {
            delete next[previousName];
            next[synced.n] = existing;
          }
          return next;
        });
        renameRhCycleCache(previousName, synced.n);
      }

      refreshFromStores();
      setEditEmp(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Supabase.");
    } finally {
      setBusy(false);
    }
  };
  const saveCycle=async(name,newCycle)=>{
    if(busy)return;
    const employee = emps.find((item)=>item.n===name);
    if(!employee){
      setError(`Employe introuvable en memoire : ${name}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const syncedCycle = await saveRhCycleInSupabase(employee,newCycle);
      setCycles((p)=>({...p,[name]:syncedCycle}));
      setEditCycleFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Supabase.");
    } finally {
      setBusy(false);
    }
  };
  const createEmp=async(payload)=>{
    const name = payload.n.trim().toUpperCase();
    if(!name)return;
    if(emps.some((item)=>item.n===name))return;
    setBusy(true);
    setError("");
    try {
      const nextEmp = await createRhEmployeeInSupabase({
        ...payload,
        n: name,
        cycle: payload.cycle,
      });
      setEmps((current)=>(
        current.some((item)=>item.dbId===nextEmp.dbId)
          ? current.map((item)=>item.dbId===nextEmp.dbId?{...nextEmp,rayons:payload.rayons}:item)
          : [...current,{...nextEmp,rayons:payload.rayons}]
      ));
      setCycles((current)=>({ ...current, [name]: payload.cycle }));
      refreshFromStores();
      setNewEmpOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Supabase.");
    } finally {
      setBusy(false);
    }
  };

  const mCount=emps.filter(e=>e.t==="M"&&e.actif).length;
  const sCount=emps.filter(e=>e.t==="S"&&e.actif).length;
  const eCount=emps.filter(e=>e.t==="E"&&e.actif).length;
  const inactifCount=emps.filter(e=>!e.actif).length;

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:V.body,minHeight:"100vh",
      background:`radial-gradient(circle at top left,rgba(15,118,110,0.06),transparent 24%),linear-gradient(180deg,#f9fbfd 0%,${V.bg} 100%)`}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:18}}>

        {/* HEADER */}
        <Card style={{padding:"14px 22px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:14,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.users(V.mc,20)}</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:V.mc}}>RESSOURCES HUMAINES</div>
              <div style={{fontSize:20,fontWeight:700,color:V.text}}>Gestion de l&apos;équipe</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{display:"flex",gap:3,background:"rgba(241,245,249,0.8)",borderRadius:10,padding:3}}>
              {[{v:"fiches",l:"Fiches employés"},{v:"cycles",l:"Cycles repos"}].map(t=>(
                <button key={t.v} onClick={()=>setView(t.v)} style={{
                  padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,
                  fontWeight:view===t.v?700:500,background:view===t.v?"#fff":"transparent",color:view===t.v?V.mc:V.light,
                  boxShadow:view===t.v?"0 1px 4px rgba(0,0,0,0.06)":"none",
                }}>{t.l}</button>
              ))}
            </div>
            {view==="fiches"&&(
              <div style={{display:"flex",gap:3,background:"rgba(241,245,249,0.8)",borderRadius:10,padding:3,marginLeft:4}}>
                {[{v:"ALL",l:"Tous"},{v:"M",l:"Matin"},{v:"S",l:"Soir"},{v:"E",l:"Étu."}].map(f=>(
                  <button key={f.v} onClick={()=>setFilterType(f.v)} style={{
                    padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,
                    fontWeight:filterType===f.v?700:500,background:filterType===f.v?"#fff":"transparent",
                    color:filterType===f.v?V.mc:V.light,
                  }}>{f.l}</button>
                ))}
              </div>
            )}
            <button disabled={busy} onClick={()=>setNewEmpOpen(true)} style={{marginLeft:6,padding:"8px 12px",borderRadius:10,border:`1px solid ${V.mc}25`,background:V.mG,color:V.mc,fontSize:12,fontWeight:700,cursor:busy?"not-allowed":"pointer",opacity:busy?0.6:1}}>
              + Nouvel employe
            </button>
          </div>
        </Card>
        {error&&(
          <div style={{marginBottom:14,padding:"12px 14px",borderRadius:14,border:`1px solid ${V.red}22`,background:"#fff5f5",color:V.red,fontSize:13,fontWeight:600}}>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <KPI value={mCount} label="Équipe matin" color={V.blue} gradient="linear-gradient(135deg,#eff6ff,#f8fbff)"/>
          <KPI value={sCount} label="Après-midi" color={V.purple} gradient="linear-gradient(135deg,#f5f2fe,#faf8ff)"/>
          <KPI value={eCount} label="Étudiants" color={V.mc} gradient={V.mG}/>
          <KPI value={inactifCount} label="Inactifs" color={inactifCount>0?V.red:V.green} gradient={inactifCount>0?"linear-gradient(135deg,#fef1f2,#fff8f8)":"linear-gradient(135deg,#ecfdf5,#f0faf4)"} sub={inactifCount>0?"Congé mat./longue durée":"Tout le monde est actif"}/>
        </div>

        {/* FICHES VIEW */}
        {view==="fiches"&&(
          <>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:V.muted,fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.04em"}}>EMPLOYÉ</label>
              <select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}
                style={{width:"100%",padding:"12px 14px",borderRadius:14,border:`1px solid ${V.border}`,background:"rgba(255,255,255,0.92)",fontSize:13,color:V.body,outline:"none",boxSizing:"border-box",backdropFilter:"blur(12px)",fontWeight:600}}>
                <option value="ALL">Tous les employés</option>
                {employeeOptions.map((employee)=>(
                  <option key={employee.id} value={employee.n}>{employee.n}</option>
                ))}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
              {filtered.map(emp=>(
                <EmpCard key={emp.id} emp={emp} cycle={cycles[emp.n]}
                  onEditEmp={()=>setEditEmp({...emp,rayons:rayonsByEmployee.get(emp.n)||[]})}
                  onEditCycle={()=>setEditCycleFor(emp.n)}/>
              ))}
            </div>
            {filtered.length===0&&(<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:14,color:V.light}}>Aucun employé trouvé</div></Card>)}
          </>
        )}

        {/* CYCLES VIEW */}
        {view==="cycles"&&(
          <CycleOverview emps={emps} cycles={cycles} onEditCycle={name=>setEditCycleFor(name)}/>
        )}
      </div>

      {/* MODALS */}
      {editEmp&&<EditEmpModal emp={editEmp} availableRayons={availableRayons} onSave={saveEmp} onClose={()=>setEditEmp(null)}/>}
      {editCycleFor&&<EditCycleModal empName={editCycleFor} cycle={cycles[editCycleFor]||["LUN","LUN","LUN","LUN","LUN"]} onSave={c=>saveCycle(editCycleFor,c)} onClose={()=>setEditCycleFor(null)} busy={busy}/>}
      {newEmpOpen&&<NewEmpModal availableRayons={availableRayons} onSave={createEmp} onClose={()=>setNewEmpOpen(false)}/>}
    </div>
  );
}
