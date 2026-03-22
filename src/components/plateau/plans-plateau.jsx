"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/* ═══════════════════════════════════════════════════════════
   THEME — Plateaux = Orange
   ═══════════════════════════════════════════════════════════ */
const V = {
  bg:"#f2f5f8",card:"rgba(255,255,255,0.92)",border:"rgba(226,232,240,0.5)",line:"#dbe3eb",
  text:"#0f172a",body:"#1e293b",muted:"#64748b",light:"#94a3b8",
  shadow:"0 1px 2px rgba(0,0,0,0.03),0 4px 16px rgba(0,0,0,0.04),0 12px 32px rgba(0,0,0,0.02)",
  mc:"#c05a0c",mL:"#fef6ee",mM:"#fde9d4",mD:"#854009",
  mG:"linear-gradient(135deg,#fef6ee 0%,#fffaf4 50%,#fffdfa 100%)",
  mIG:"linear-gradient(135deg,#fde9d4,#f8d4af)",
  red:"#a32d2d",redL:"#fcebeb",green:"#27500a",greenL:"#eaf3de",blue:"#0c447c",blueL:"#e6f1fb",amber:"#633806",amberL:"#faeeda",
};

const PL={
  A:{c:"#a32d2d",cL:"#fcebeb",cM:"#f09595",label:"Plateau A",desc:"Entrée magasin + allée centrale"},
  B:{c:"#27500a",cL:"#eaf3de",cM:"#97c459",label:"Plateau B",desc:"Côté écolier + côté LSE"},
  C:{c:"#0c447c",cL:"#e6f1fb",cM:"#85b7eb",label:"Plateau C/D",desc:"Zones thématiques"},
};

const IC={
  map:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  img:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  upload:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  edit:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  zoom:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  chevL:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevR:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  note:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  x:(c,s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

/* ═══════════════════════════════════════════════════════════
   OPERATIONS DATA — from PDF
   ═══════════════════════════════════════════════════════════ */
const OPS = [
  // Plateau A
  {id:"a1",pl:"A",nom:"Nettoyage rangement",zone:"Entrée mag + allée XL",sFrom:10,sTo:10,mFrom:2,mTo:2},
  {id:"a2",pl:"A",nom:"Pré-chocolat + Top foire alcool",zone:"Entrée + allée centrale",sFrom:11,sTo:11,mFrom:2,mTo:2},
  {id:"a3",pl:"A",nom:"Chocolat de Pâques",zone:"Entrée magasin",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"a4",pl:"A",nom:"Foire au vin",zone:"Allée centrale",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"a5",pl:"A",nom:"Gastro de Pâques",zone:"Allée centrale",sFrom:14,sTo:14,mFrom:3,mTo:3},
  {id:"a6",pl:"A",nom:"Bébé",zone:"Allée centrale",sFrom:15,sTo:16,mFrom:3,mTo:3},
  {id:"a7",pl:"A",nom:"Top Mai + Été lingerie",zone:"Entrée + allée",sFrom:18,sTo:19,mFrom:4,mTo:4},
  {id:"a8",pl:"A",nom:"Petit déj / Goûter",zone:"Entrée magasin",sFrom:20,sTo:21,mFrom:4,mTo:4},
  {id:"a9",pl:"A",nom:"Été apéro ALI + Vins",zone:"Allée centrale",sFrom:21,sTo:22,mFrom:4,mTo:5},
  {id:"a10",pl:"A",nom:"Foire alcool BBQ",zone:"Entrée mag",sFrom:24,sTo:24,mFrom:5,mTo:5},
  {id:"a11",pl:"A",nom:"Beauté",zone:"Entrée mag",sFrom:25,sTo:25,mFrom:5,mTo:5},
  // Plateau B
  {id:"b1",pl:"B",nom:"Jardin + été jouet",zone:"Côté écolier",sFrom:10,sTo:26,mFrom:2,mTo:5},
  {id:"b2",pl:"B",nom:"Cuisson",zone:"Côté LSE",sFrom:10,sTo:11,mFrom:2,mTo:2},
  {id:"b3",pl:"B",nom:"Pâques non AL",zone:"Côté LSE",sFrom:12,sTo:14,mFrom:2,mTo:3},
  {id:"b4",pl:"B",nom:"Été non AL",zone:"Côté LSE",sFrom:15,sTo:19,mFrom:3,mTo:4},
  {id:"b5",pl:"B",nom:"Fête des mères",zone:"Côté LSE",sFrom:21,sTo:22,mFrom:4,mTo:5},
  // Plateau C/D
  {id:"c1",pl:"C",nom:"Fête de la mer",zone:"",sFrom:10,sTo:10,mFrom:2,mTo:2},
  {id:"c2",pl:"C",nom:"Little Italy",zone:"",sFrom:11,sTo:12,mFrom:2,mTo:2},
  {id:"c3",pl:"C",nom:"Tropiques",zone:"",sFrom:13,sTo:13,mFrom:2,mTo:2},
  {id:"c4",pl:"C",nom:"Gastro Pâques MBA",zone:"",sFrom:14,sTo:14,mFrom:3,mTo:3},
  {id:"c5",pl:"C",nom:"Bretagne",zone:"",sFrom:15,sTo:15,mFrom:3,mTo:3},
  {id:"c6",pl:"C",nom:"Les Halles",zone:"",sFrom:16,sTo:16,mFrom:3,mTo:3},
  {id:"c7",pl:"C",nom:"MBA BBQ",zone:"",sFrom:17,sTo:19,mFrom:3,mTo:4},
  {id:"c8",pl:"C",nom:"Italie",zone:"",sFrom:20,sTo:21,mFrom:4,mTo:4},
  {id:"c9",pl:"C",nom:"Fête mer / Fête stands",zone:"",sFrom:23,sTo:25,mFrom:5,mTo:5},
];

const SEMAINES = [];
for(let s=10;s<=26;s++) SEMAINES.push(s);
const S_MIN=10,S_MAX=26,S_TOTAL=S_MAX-S_MIN+1;
const MOIS_LABELS=[{m:2,l:"Mars",sStart:10,sEnd:13},{m:3,l:"Avril",sStart:14,sEnd:17},{m:4,l:"Mai",sStart:18,sEnd:22},{m:5,l:"Juin",sStart:23,sEnd:26}];

/* Dates des semaines (mardi → lundi, comme dans le PDF) */
const WEEK_DATES = {
  10:{d:"3 mars",f:"9 mars",label:"3 → 9 mars"},
  11:{d:"10 mars",f:"16 mars",label:"10 → 16 mars"},
  12:{d:"17 mars",f:"23 mars",label:"17 → 23 mars"},
  13:{d:"24 mars",f:"30 mars",label:"24 → 30 mars"},
  14:{d:"31 mars",f:"6 avril",label:"31 mars → 6 avril"},
  15:{d:"7 avril",f:"13 avril",label:"7 → 13 avril"},
  16:{d:"14 avril",f:"20 avril",label:"14 → 20 avril"},
  17:{d:"21 avril",f:"27 avril",label:"21 → 27 avril"},
  18:{d:"28 avril",f:"4 mai",label:"28 avr → 4 mai"},
  19:{d:"5 mai",f:"11 mai",label:"5 → 11 mai"},
  20:{d:"12 mai",f:"18 mai",label:"12 → 18 mai"},
  21:{d:"19 mai",f:"25 mai",label:"19 → 25 mai"},
  22:{d:"26 mai",f:"1 juin",label:"26 mai → 1 juin"},
  23:{d:"2 juin",f:"8 juin",label:"2 → 8 juin"},
  24:{d:"9 juin",f:"15 juin",label:"9 → 15 juin"},
  25:{d:"16 juin",f:"22 juin",label:"16 → 22 juin"},
  26:{d:"23 juin",f:"29 juin",label:"23 → 29 juin"},
};

const WEEK_PATTERN = /\b(?:semaine|sem\.?)\s*0?([1-9]|1\d|2\d|3\d)\b/gi;
const DATE_RANGE_PATTERN = /mardi\s+0*(\d{1,2})\s+([a-z\u00e9\u00fb\u00ee\u00f4]+)\s+au\s+lundi\s+0*(\d{1,2})\s+([a-z\u00e9\u00fb\u00ee\u00f4]+)/gi;
const MONTH_ALIASES = {
  jan: "janvier",
  janvier: "janvier",
  fev: "fevrier",
  fevr: "fevrier",
  fevrier: "fevrier",
  mar: "mars",
  mars: "mars",
  avr: "avril",
  avril: "avril",
  mai: "mai",
  juin: "juin",
  juil: "juillet",
  juillet: "juillet",
  aout: "aout",
  aou: "aout",
  sep: "septembre",
  sept: "septembre",
  septembre: "septembre",
  oct: "octobre",
  octobre: "octobre",
  nov: "novembre",
  novembre: "novembre",
  dec: "decembre",
  decembre: "decembre",
};

const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeMonth = (rawMonth = "") => {
  const cleaned = normalizeText(rawMonth).replace(/[^a-z]/g, "");
  return MONTH_ALIASES[cleaned] || cleaned;
};

const weekByStartDate = Object.entries(WEEK_DATES).reduce((acc, [week, dates]) => {
  const parts = normalizeText(dates.d).trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = Number(parts[0]);
    const month = normalizeMonth(parts[1]);
    if (Number.isFinite(day) && month) {
      acc.set(`${day}-${month}`, Number(week));
    }
  }
  return acc;
}, new Map());

const detectWeeksFromText = (text) => {
  const weeks = new Set();
  if (!text) return weeks;
  WEEK_PATTERN.lastIndex = 0;
  let match;
  while ((match = WEEK_PATTERN.exec(text)) !== null) {
    const week = Number(match[1]);
    if (week >= S_MIN && week <= S_MAX) weeks.add(week);
  }
  return weeks;
};

const detectWeeksFromDateRanges = (text) => {
  const weeks = new Set();
  if (!text) return weeks;
  DATE_RANGE_PATTERN.lastIndex = 0;
  let match;
  while ((match = DATE_RANGE_PATTERN.exec(text)) !== null) {
    const startDay = Number(match[1]);
    const startMonth = normalizeMonth(match[2]);
    const key = `${startDay}-${startMonth}`;
    const week = weekByStartDate.get(key);
    if (week && week >= S_MIN && week <= S_MAX) {
      weeks.add(week);
    }
  }
  return weeks;
};

const detectPlateauxFromText = (text) => {
  const normalized = normalizeText(text || "");
  const plateaux = new Set();
  if (normalized.includes("plateau a")) plateaux.add("A");
  if (normalized.includes("plateau b")) plateaux.add("B");
  if (
    normalized.includes("plateau c") ||
    normalized.includes("plateau d") ||
    normalized.includes("plateau c/d") ||
    normalized.includes("c/d")
  ) {
    plateaux.add("C");
  }
  return plateaux;
};

const IMPORT_RENDER_SCALE = 2.8;
const IMPORT_MAX_SIDE = 5200;

/* ═══════════════════════════════════════════════════════════
   UI PRIMITIVES
   ═══════════════════════════════════════════════════════════ */
const Card=({children,style})=>(<div style={{background:V.card,backdropFilter:"blur(12px)",border:`1px solid ${V.border}`,borderRadius:20,boxShadow:V.shadow,padding:22,...style}}>{children}</div>);
const Kicker=({icon,label,color,bg})=>(<div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:10,background:bg||V.mM,color:color||V.mD,fontSize:11,fontWeight:700,letterSpacing:"0.04em"}}>{icon}<span>{label}</span></div>);
const H2=({children})=>(<h2 style={{margin:"10px 0 6px",fontSize:20,fontWeight:700,letterSpacing:"-0.02em",color:V.text}}>{children}</h2>);
const PlBadge=({pl,size="normal"})=>{const p=PL[pl]||PL.A;const sm=size==="small";return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:sm?"2px 8px":"4px 12px",borderRadius:8,background:p.cL,color:p.c,fontSize:sm?10:12,fontWeight:700,border:`1px solid ${p.c}15`}}>{p.label}</span>;};

/* ═══════════════════════════════════════════════════════════
   TIMELINE BAR
   ═══════════════════════════════════════════════════════════ */
const TimelineRow=({ops,plKey,selected,onSelect})=>{
  const p=PL[plKey];
  const rowOps = ops
    .filter((o) => o.pl === plKey)
    .sort((a, b) => {
      if (a.sFrom !== b.sFrom) return a.sFrom - b.sFrom;
      return a.sTo - b.sTo;
    });

  const laneEnds = [];
  const placedOps = rowOps.map((op) => {
    let lane = laneEnds.findIndex((laneEnd) => op.sFrom > laneEnd);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(op.sTo);
    } else {
      laneEnds[lane] = op.sTo;
    }
    return { ...op, lane };
  });

  const laneCount = Math.max(placedOps.reduce((max, op) => Math.max(max, op.lane + 1), 0), 1);
  const laneHeight = 28;
  const timelineHeight = laneCount * laneHeight + 6;

  return(
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:700,color:p.c,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:10,height:10,borderRadius:3,background:p.c,opacity:0.7}}/>
        {p.label}
      </div>
      <div style={{position:"relative",height:timelineHeight,background:`${p.cL}80`,borderRadius:8,overflow:"hidden"}}>
        {placedOps.map(op=>{
          const left=((op.sFrom-S_MIN)/S_TOTAL)*100;
          const width=Math.max(((op.sTo-op.sFrom+1)/S_TOTAL)*100,2);
          const isSel=selected===op.id;
          return(
            <div key={op.id} onClick={()=>onSelect(op.id)}
              title={`${op.nom} — S${op.sFrom}${op.sTo!==op.sFrom?`→S${op.sTo}`:""}`}
              style={{
                position:"absolute",left:`${left}%`,width:`${width}%`,top:3 + op.lane * laneHeight,height:24,
                borderRadius:6,background:isSel?p.c:`${p.c}cc`,
                display:"flex",alignItems:"center",padding:"0 6px",overflow:"hidden",
                cursor:"pointer",transition:"all 0.15s",
                border:isSel?`2px solid ${p.c}`:"2px solid transparent",
                boxShadow:isSel?`0 2px 8px ${p.c}30`:"none",
                zIndex:isSel?2:1,
              }}>
              <span style={{fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textShadow:"0 1px 2px rgba(0,0,0,0.2)"}}>
                {op.nom}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   IMAGE VIEWER — upload + zoom
   ═══════════════════════════════════════════════════════════ */
const ImageViewer=({image,opName,onUpload,onRemove})=>{
  const handleFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>onUpload(ev.target.result);
    reader.readAsDataURL(file);
  };
  const [zoomed,setZoomed]=useState(false);
  const [zoomLevel,setZoomLevel]=useState(1.25);

  const openZoom=()=>{
    setZoomLevel(1.25);
    setZoomed(true);
  };

  const closeZoom=()=>setZoomed(false);
  const zoomIn=()=>setZoomLevel((z)=>Math.min(5,z+0.25));
  const zoomOut=()=>setZoomLevel((z)=>Math.max(0.75,z-0.25));
  const zoomReset=()=>setZoomLevel(1.8);

  return(
    <>
      <div style={{
        borderRadius:16,border:`1px solid ${V.border}`,overflow:"hidden",
        background:image?"#fff":"#f8fafc",position:"relative",minHeight:image?0:280,
      }}>
        {image?(
          <>
            <img src={image} alt={opName} onClick={openZoom} style={{width:"100%",display:"block",cursor:"zoom-in"}}/>
            <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6}}>
              <button onClick={openZoom} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}>{IC.zoom(V.mc,16)}</button>
              <label style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}>
                {IC.upload(V.mc,16)}<input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
              </label>
              <button onClick={onRemove} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}>{IC.x(V.red,16)}</button>
            </div>
          </>
        ):(
          <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"40px 20px",cursor:"pointer",minHeight:280}}>
            <div style={{width:56,height:56,borderRadius:16,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.img(V.mc,24)}</div>
            <div style={{fontSize:14,fontWeight:700,color:V.body}}>Plan non disponible</div>
            <div style={{fontSize:12,color:V.muted}}>Importer le PDF pour charger tous les plans automatiquement</div>
            <div style={{fontSize:11,color:V.light}}>Ou ajouter manuellement une image (JPG, PNG)</div>
            <input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
          </label>
        )}
      </div>

      {/* Zoom modal */}
      {zoomed&&image&&typeof document!=="undefined"&&createPortal(
        <div onClick={closeZoom} style={{position:"fixed",left:0,top:0,width:"100vw",height:"100vh",background:"rgba(15,23,42,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99999,padding:20}}>
          <div onClick={(e)=>e.stopPropagation()} style={{width:"min(92vw,1400px)",height:"min(90vh,920px)",background:"#fff",borderRadius:14,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 48px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${V.border}`}}>
              <div style={{fontSize:13,fontWeight:700,color:V.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{opName}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={zoomOut} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,color:V.body}}>−</button>
                <div style={{minWidth:58,textAlign:"center",fontSize:12,fontWeight:700,color:V.muted}}>{Math.round(zoomLevel*100)}%</div>
                <button onClick={zoomIn} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,color:V.body}}>+</button>
                <button onClick={zoomReset} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,color:V.muted}}>Reset</button>
                <button onClick={closeZoom} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${V.border}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,color:V.red}}>Fermer</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto",background:"#f5f7fb",padding:16}}>
              <img
                src={image}
                alt={opName}
                style={{
                  width:`${zoomLevel*100}%`,
                  maxWidth:"none",
                  minWidth:0,
                  display:"block",
                  borderRadius:10,
                  boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
                  transformOrigin:"top left",
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   ANNOTATION EDITOR
   ═══════════════════════════════════════════════════════════ */
const AnnotationBox=({notes,onChange})=>{
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(notes||"");

  return(
    <div style={{padding:"14px 16px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.border}`,marginTop:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {IC.note(V.muted,14)}
          <span style={{fontSize:11,fontWeight:700,color:V.light,letterSpacing:"0.04em"}}>NOTES & ANNOTATIONS</span>
        </div>
        <button onClick={()=>{if(editing){onChange(val);}setEditing(!editing);}} style={{fontSize:11,fontWeight:700,color:V.mc,background:V.mL,border:`1px solid ${V.mc}15`,borderRadius:6,padding:"3px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          {editing?<>{IC.edit(V.mc,10)} Enregistrer</>:<>{IC.edit(V.mc,10)} Modifier</>}
        </button>
      </div>
      {editing?(
        <textarea value={val} onChange={e=>setVal(e.target.value)} rows={3} placeholder="Ajouter des notes pour cette opération..."
          style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid ${V.mc}25`,fontSize:13,color:V.body,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}/>
      ):(
        <div style={{fontSize:13,color:notes?V.body:V.light,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
          {notes||"Aucune note pour cette opération. Cliquer sur Modifier pour en ajouter."}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function PlateauApp(){
  const [selectedOp,setSelectedOp]=useState("a3");
  const [focusWeek,setFocusWeek]=useState(12); // S12 par défaut
  const [images,setImages]=useState({});
  const [weekImages,setWeekImages]=useState({});
  const [notes,setNotes]=useState({
    a3:"Prévoir 2 palettes supplémentaires pour le chocolat. Confirmer avec le fournisseur mardi.",
    a4:"Mise en place mercredi matin. Jeremy + Kamel sur la zone.",
  });

  const op=OPS.find(o=>o.id===selectedOp);
  const sameWeekOps=op?OPS.filter(o=>o.id!==selectedOp&&o.sFrom<=op.sTo&&o.sTo>=op.sFrom):[];

  const [showImport,setShowImport]=useState(false);
  const [lastImport,setLastImport]=useState("15 mars 2026"); // mock last import date
  const [importProgress,setImportProgress]=useState(null); // null | 0-100
  const [importMessage,setImportMessage]=useState("");
  const [importError,setImportError]=useState("");

  const handlePdfImport=async(e)=>{
    const input=e.target;
    const file=input.files?.[0];
    if(!file)return;
    if(!(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf"))){
      setImportError("Fichier invalide: merci d'importer un PDF.");
      input.value = "";
      return;
    }

    setImportError("");
    setImportMessage("Initialisation de l'analyse PDF...");
    setImportProgress(3);

    try{
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const data = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data });
      const pdfDoc = await loadingTask.promise;

      const pageInfos = [];
      const totalPages = pdfDoc.numPages;

      for(let pageNumber=1; pageNumber<=totalPages; pageNumber+=1){
        setImportMessage(`Analyse de la page ${pageNumber}/${totalPages}...`);
        const page = await pdfDoc.getPage(pageNumber);

        const textContent = await page.getTextContent();
        const rawText = textContent.items
          .map((item)=>("str" in item ? item.str : ""))
          .join(" ");
        const normalizedText = normalizeText(rawText);
        const weeksFromDate = detectWeeksFromDateRanges(normalizedText);
        const weeksFromLabel = detectWeeksFromText(normalizedText);
        const weeks = weeksFromDate.size > 0 ? weeksFromDate : weeksFromLabel;
        const plateaux = detectPlateauxFromText(rawText);
        const isRecapPage =
          normalizedText.includes("pcc") ||
          normalizedText.includes("recap") ||
          normalizedText.includes("recapitulatif") ||
          normalizedText.includes("calendrier") ||
          normalizedText.includes("vacances scolaires");
        const hasPlanPlateauMarker = normalizedText.includes("plan plateau");
        const isEligibleWeeklyPage = !isRecapPage && (weeks.size > 0 || hasPlanPlateauMarker);

        let renderScale = IMPORT_RENDER_SCALE;
        let viewport = page.getViewport({ scale: renderScale });
        const largerSide = Math.max(viewport.width, viewport.height);
        if (largerSide > IMPORT_MAX_SIDE) {
          renderScale = (IMPORT_MAX_SIDE / largerSide) * renderScale;
          viewport = page.getViewport({ scale: renderScale });
        }
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if(!context) throw new Error("Impossible de lire le canvas pour le rendu PDF.");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        const image = canvas.toDataURL("image/png");

        pageInfos.push({ pageNumber, image, weeks, plateaux, isEligibleWeeklyPage });
        setImportProgress(Math.max(4,Math.min(96,Math.round((pageNumber/totalPages)*96))));
      }

      const weekFallbackStart = S_MIN;
      const pageByWeekAndPlateau = new Map();
      const pageByWeekOnly = new Map();
      const weeklyPages = pageInfos.filter((info)=>info.isEligibleWeeklyPage);
      let skippedPagesCount = pageInfos.length - weeklyPages.length;

      weeklyPages.forEach((info, index)=>{
        const inferredWeek = weekFallbackStart + index;
        const effectiveWeeks = info.weeks.size>0
          ? [...info.weeks]
          : (inferredWeek>=S_MIN && inferredWeek<=S_MAX ? [inferredWeek] : []);

        if (effectiveWeeks.length === 0) {
          skippedPagesCount += 1;
        }

        effectiveWeeks.forEach((week)=>{
          if(!pageByWeekOnly.has(week)) pageByWeekOnly.set(week, info.image);
          if(info.plateaux.size===0){
            if(!pageByWeekAndPlateau.has(`${week}:*`)) pageByWeekAndPlateau.set(`${week}:*`, info.image);
            return;
          }
          info.plateaux.forEach((pl)=>{
            const key = `${week}:${pl}`;
            if(!pageByWeekAndPlateau.has(key)) pageByWeekAndPlateau.set(key, info.image);
          });
        });
      });

      const mappedWeekImages = {};
      for(let week=S_MIN; week<=S_MAX; week+=1){
        const imageForWeek =
          pageByWeekOnly.get(week) ||
          pageByWeekAndPlateau.get(`${week}:A`) ||
          pageByWeekAndPlateau.get(`${week}:B`) ||
          pageByWeekAndPlateau.get(`${week}:C`) ||
          pageByWeekAndPlateau.get(`${week}:*`) ||
          null;
        if(imageForWeek){
          mappedWeekImages[week] = imageForWeek;
        }
      }

      setWeekImages((previous)=>({
        ...previous,
        ...mappedWeekImages,
      }));

      setImportProgress(100);
      setImportMessage(`${Object.keys(mappedWeekImages).length} semaine(s) mise(s) à jour (${skippedPagesCount} page(s) ignorée(s)).`);
      setLastImport(new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}));

      setTimeout(()=>{
        setImportProgress(null);
        setImportMessage("");
        setShowImport(false);
      },900);
    }catch(error){
      setImportProgress(null);
      setImportMessage("");
      setImportError(`Import impossible: ${error?.message || "erreur inconnue"}`);
    }finally{
      input.value = "";
    }
  };

  // Ops active for focused week
  const weekOps=OPS.filter(o=>o.sFrom<=focusWeek&&o.sTo>=focusWeek);
  const weekOpsA=weekOps.filter(o=>o.pl==="A");
  const weekOpsB=weekOps.filter(o=>o.pl==="B");
  const weekOpsC=weekOps.filter(o=>o.pl==="C");
  const wd=WEEK_DATES[focusWeek]||{label:`S${focusWeek}`};
  const imageWeekForSelectedOp = op
    ? (focusWeek >= op.sFrom && focusWeek <= op.sTo ? focusWeek : op.sFrom)
    : focusWeek;
  const selectedOpImage = op
    ? (images[op.id] || weekImages[imageWeekForSelectedOp] || null)
    : null;

  const prevW=()=>{if(focusWeek>S_MIN)setFocusWeek(w=>w-1);};
  const nextW=()=>{if(focusWeek<S_MAX)setFocusWeek(w=>w+1);};

  // Keep detail pane synced with selected week (avoid "frozen" lower section).
  useEffect(()=>{
    const opsForWeek=OPS.filter(o=>o.sFrom<=focusWeek&&o.sTo>=focusWeek);
    if(opsForWeek.length===0)return;
    const selectedStillVisible=opsForWeek.some(o=>o.id===selectedOp);
    if(selectedStillVisible)return;
    const preferred=opsForWeek.find(o=>o.pl==="A")||opsForWeek[0];
    if(preferred&&preferred.id!==selectedOp)setSelectedOp(preferred.id);
  },[focusWeek,selectedOp]);

  // Group by plateau for timeline
  const opsA=OPS.filter(o=>o.pl==="A");
  const opsB=OPS.filter(o=>o.pl==="B");
  const opsC=OPS.filter(o=>o.pl==="C");

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:V.body,minHeight:"100vh",
      background:`radial-gradient(circle at top left,rgba(192,90,12,0.06),transparent 24%),linear-gradient(180deg,#f9fbfd 0%,${V.bg} 100%)`}}>
      <div style={{maxWidth:1500,margin:"0 auto",padding:18}}>

        {/* HEADER */}
        <Card style={{padding:"14px 22px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:14,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.map(V.mc,20)}</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:V.mc}}>PLANS PLATEAU 2026</div>
              <div style={{fontSize:20,fontWeight:700,color:V.text}}>Opérations commerciales</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:11,color:V.light,textAlign:"right",marginRight:4}}>
              <div>Dernier import PDF</div>
              <div style={{fontWeight:700,color:V.muted}}>{lastImport}</div>
            </div>
            <button onClick={()=>{setImportError("");setImportMessage("");setShowImport(true);}} style={{
              display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:12,
              border:"none",background:V.mc,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,
              boxShadow:`0 2px 8px ${V.mc}30`,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
              </svg>
              Importer / Mettre à jour le PDF
            </button>
            <PlBadge pl="A"/><PlBadge pl="B"/><PlBadge pl="C"/>
          </div>
        </Card>

        {/* PDF IMPORT MODAL */}
        {showImport&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>{if(importProgress===null){setImportError("");setImportMessage("");setShowImport(false);}}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:520,boxShadow:"0 24px 48px rgba(0,0,0,0.2)",overflow:"hidden"}}>
              <div style={{background:V.mc,padding:"18px 24px",color:"#fff"}}>
                <div style={{fontSize:18,fontWeight:700}}>Importer le PDF des plans plateau</div>
                <div style={{fontSize:13,opacity:0.8}}>Le système va extraire tous les plans et opérations automatiquement</div>
              </div>
              <div style={{padding:24}}>
                {importError&&(
                  <div style={{marginBottom:12,padding:"10px 12px",borderRadius:10,background:V.redL,border:`1px solid ${V.red}30`,fontSize:12,color:V.red,fontWeight:600}}>
                    {importError}
                  </div>
                )}
                {importProgress===null?(
                  <>
                    {/* Drop zone */}
                    <label style={{
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                      gap:12,padding:"40px 24px",borderRadius:16,
                      border:`2px dashed ${V.mc}40`,background:V.mL,cursor:"pointer",
                      transition:"all 0.15s",
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=V.mc;e.currentTarget.style.background=V.mM;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=V.mc+"40";e.currentTarget.style.background=V.mL;}}>
                      <div style={{width:56,height:56,borderRadius:16,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
                        </svg>
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:V.body}}>Glisser-déposer le PDF ici</div>
                      <div style={{fontSize:12,color:V.muted}}>ou cliquer pour sélectionner le fichier</div>
                      <div style={{fontSize:11,color:V.light}}>Fichier PDF uniquement — max 50 Mo</div>
                      <input type="file" accept="application/pdf" onChange={handlePdfImport} style={{display:"none"}}/>
                    </label>

                    {/* What will happen */}
                    <div style={{marginTop:18,padding:"14px 16px",borderRadius:14,background:"#f8fafc",border:`1px solid ${V.border}`}}>
                      <div style={{fontSize:12,fontWeight:700,color:V.muted,marginBottom:8}}>Ce qui va se passer :</div>
                      <div style={{display:"grid",gap:6}}>
                        {[
                          {n:"1",t:"Extraction des pages",d:"Chaque page du PDF est convertie en image"},
                          {n:"2",t:"Détection des opérations",d:"Les noms, dates et plateaux sont identifiés automatiquement"},
                          {n:"3",t:"Stockage",d:"Tout est enregistré — plus besoin du PDF ensuite"},
                          {n:"4",t:"Mise à jour",d:"Les anciennes données sont remplacées, vos notes sont conservées"},
                        ].map(s=>(
                          <div key={s.n} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                            <div style={{width:22,height:22,borderRadius:7,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:V.mc,flexShrink:0}}>{s.n}</div>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:V.body}}>{s.t}</div>
                              <div style={{fontSize:11,color:V.light}}>{s.d}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ):(
                  /* Progress */
                  <div style={{textAlign:"center",padding:"20px 0"}}>
                    <div style={{fontSize:40,fontWeight:800,color:V.mc,marginBottom:8}}>{importProgress}%</div>
                    <div style={{fontSize:14,fontWeight:600,color:V.body,marginBottom:4}}>
                      {importMessage||"Traitement en cours..."}
                    </div>
                    <div style={{fontSize:12,color:V.muted,marginBottom:16}}>Veuillez patienter</div>
                    <div style={{height:8,borderRadius:99,background:"#eef2f6",overflow:"hidden",maxWidth:300,margin:"0 auto"}}>
                      <div style={{width:`${importProgress}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${V.mc}dd,${V.mc}88)`,transition:"width 0.3s"}}/>
                    </div>
                    {importProgress===100&&(
                      <div style={{marginTop:16,fontSize:14,fontWeight:700,color:"#16a34a"}}>
                        Import terminé — les plans sont maintenant disponibles
                      </div>
                    )}
                  </div>
                )}
              </div>
              {importProgress===null&&(
                <div style={{padding:"14px 24px",borderTop:`1px solid ${V.line}`,display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={()=>{setImportError("");setImportMessage("");setShowImport(false);}} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${V.line}`,background:"#fafafa",color:V.muted,cursor:"pointer",fontSize:13}}>Fermer</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE */}
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <Kicker icon={IC.map(V.mc,14)} label="TIMELINE"/>
              <H2>Mars — Juin 2026</H2>
              <p style={{margin:0,fontSize:12,color:V.muted}}>Cliquer sur une opération pour voir le plan · Cliquer sur une semaine pour le focus</p>
            </div>
            {/* Week selector */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={prevW} style={{width:34,height:34,borderRadius:10,background:V.mL,border:`1px solid ${V.mc}15`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.chevL(V.mc,16)}</button>
              <div style={{textAlign:"center",minWidth:180}}>
                <div style={{fontSize:14,fontWeight:700,color:V.mc}}>Semaine {focusWeek}</div>
                <div style={{fontSize:11,color:V.muted}}>Mar. {wd.label}</div>
              </div>
              <button onClick={nextW} style={{width:34,height:34,borderRadius:10,background:V.mL,border:`1px solid ${V.mc}15`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{IC.chevR(V.mc,16)}</button>
            </div>
          </div>

          {/* Month headers */}
          <div style={{display:"flex",marginBottom:8,paddingLeft:0}}>
            {MOIS_LABELS.map(m=>{
              const width=((m.sEnd-m.sStart+1)/S_TOTAL)*100;
              return(
                <div key={m.l} style={{position:"relative",width:`${width}%`,textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:V.body,padding:"6px 0",borderBottom:`2px solid ${V.line}`}}>{m.l}</div>
                </div>
              );
            })}
          </div>

          {/* Week numbers — clickable */}
          <div style={{display:"flex",marginBottom:8}}>
            {SEMAINES.map(s=>{
              const isFocus=s===focusWeek;
              return(
                <div key={s} onClick={()=>setFocusWeek(s)} style={{
                  flex:1,textAlign:"center",fontSize:isFocus?11:9,fontWeight:700,
                  color:isFocus?V.mc:V.light,cursor:"pointer",padding:"4px 0",
                  background:isFocus?V.mL:"transparent",borderRadius:6,
                  border:isFocus?`2px solid ${V.mc}`:"2px solid transparent",
                  transition:"all 0.15s",
                }}>{s}</div>
              );
            })}
          </div>

          {/* Bars with focus indicator */}
          <div style={{position:"relative"}}>
            {/* Vertical focus line */}
            <div style={{
              position:"absolute",
              left:`${((focusWeek-S_MIN)/S_TOTAL)*100}%`,
              width:`${(1/S_TOTAL)*100}%`,
              top:0,bottom:0,
              background:`${V.mc}10`,borderLeft:`2px solid ${V.mc}40`,borderRight:`2px solid ${V.mc}40`,
              borderRadius:4,zIndex:0,pointerEvents:"none",
              transition:"left 0.2s",
            }}/>
            <div style={{position:"relative",zIndex:1}}>
              <TimelineRow ops={OPS} plKey="A" selected={selectedOp} onSelect={setSelectedOp}/>
              <TimelineRow ops={OPS} plKey="B" selected={selectedOp} onSelect={setSelectedOp}/>
              <TimelineRow ops={OPS} plKey="C" selected={selectedOp} onSelect={setSelectedOp}/>
            </div>
          </div>
        </Card>

        {/* FOCUS SEMAINE — what's happening this week */}
        <Card style={{marginBottom:14,borderLeft:`4px solid ${V.mc}`,borderRadius:"0 20px 20px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:V.mc,letterSpacing:"0.04em"}}>FOCUS SEMAINE {focusWeek}</div>
              <div style={{fontSize:16,fontWeight:700,color:V.text}}>Mardi {wd.label}</div>
              <div style={{fontSize:12,color:V.muted}}>{weekOps.length} opération{weekOps.length>1?"s":""} active{weekOps.length>1?"s":""} cette semaine</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {weekOpsA.length>0&&<div style={{padding:"4px 12px",borderRadius:8,background:PL.A.cL,color:PL.A.c,fontSize:11,fontWeight:700}}>{weekOpsA.length} Plateau A</div>}
              {weekOpsB.length>0&&<div style={{padding:"4px 12px",borderRadius:8,background:PL.B.cL,color:PL.B.c,fontSize:11,fontWeight:700}}>{weekOpsB.length} Plateau B</div>}
              {weekOpsC.length>0&&<div style={{padding:"4px 12px",borderRadius:8,background:PL.C.cL,color:PL.C.c,fontSize:11,fontWeight:700}}>{weekOpsC.length} Plateau C/D</div>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
            {weekOps.map(o=>{
              const p=PL[o.pl]||PL.A;
              const isActive=selectedOp===o.id;
              const isNew=o.sFrom===focusWeek;
              const isEnd=o.sTo===focusWeek;
              return(
                <div key={o.id} onClick={()=>setSelectedOp(o.id)} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                  borderRadius:"0 12px 12px 0",borderLeft:`3px solid ${p.c}`,
                  background:isActive?p.cL:"rgba(248,250,252,0.6)",
                  border:`1px solid ${isActive?p.c+"30":V.border}`,
                  cursor:"pointer",transition:"all 0.15s",position:"relative",
                }}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${p.c}10`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:800,color:p.c}}>{o.pl}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:isActive?p.c:V.body}}>{o.nom}</div>
                    <div style={{fontSize:10,color:V.light}}>{o.zone||p.desc}</div>
                  </div>
                  {isNew&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:"#16a34a",padding:"2px 7px",borderRadius:5}}>Début</span>}
                  {isEnd&&!isNew&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:"#d97706",padding:"2px 7px",borderRadius:5}}>Fin</span>}
                </div>
              );
            })}
            {weekOps.length===0&&(
              <div style={{padding:20,textAlign:"center",color:V.light,fontSize:13,gridColumn:"1/-1"}}>Aucune opération cette semaine</div>
            )}
          </div>
        </Card>

        {/* PLAN DETAIL */}
        {op&&(
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            {/* Main — Plateau A plan */}
            <Card>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <PlBadge pl={op.pl}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:700,color:V.text}}>{op.nom}</div>
                  <div style={{fontSize:12,color:V.muted}}>
                    S{op.sFrom}{op.sTo!==op.sFrom?` → S${op.sTo}`:""} — {op.zone||"Toutes zones"}
                  </div>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:V.mc,background:V.mL,padding:"6px 14px",borderRadius:8}}>
                  {op.sTo-op.sFrom+1} sem.
                </div>
              </div>

              {/* Plan image */}
              <ImageViewer
                image={selectedOpImage}
                opName={op.nom}
                onUpload={(img)=>setImages(p=>({...p,[op.id]:img}))}
                onRemove={()=>setImages(p=>{const n={...p};delete n[op.id];return n;})}
              />

              {/* Annotations */}
              <AnnotationBox
                notes={notes[op.id]}
                onChange={(val)=>setNotes(p=>({...p,[op.id]:val}))}
              />
            </Card>

            {/* Side — other plateaux this week + info */}
            <div style={{display:"grid",gap:14,alignContent:"start"}}>
              {/* Other ops same period */}
              <Card>
                <div style={{fontSize:11,fontWeight:700,color:V.light,letterSpacing:"0.04em",marginBottom:10}}>MÊME PÉRIODE</div>
                <div style={{display:"grid",gap:6}}>
                  {sameWeekOps.length>0?sameWeekOps.map(o=>{
                    const p=PL[o.pl]||PL.A;
                    return(
                      <div key={o.id} onClick={()=>setSelectedOp(o.id)} style={{
                        display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                        borderRadius:"0 12px 12px 0",borderLeft:`3px solid ${p.c}`,
                        background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`,
                        cursor:"pointer",transition:"all 0.15s",
                      }}
                        onMouseEnter={e=>e.currentTarget.style.background=p.cL}
                        onMouseLeave={e=>e.currentTarget.style.background="rgba(248,250,252,0.6)"}>
                        <PlBadge pl={o.pl} size="small"/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:V.body}}>{o.nom}</div>
                          <div style={{fontSize:11,color:V.light}}>S{o.sFrom}{o.sTo!==o.sFrom?`→S${o.sTo}`:""}</div>
                        </div>
                      </div>
                    );
                  }):(
                    <div style={{padding:16,textAlign:"center",color:V.light,fontSize:12}}>Aucune autre opération sur cette période</div>
                  )}
                </div>
              </Card>

              {/* Quick info */}
              <Card>
                <div style={{fontSize:11,fontWeight:700,color:V.light,letterSpacing:"0.04em",marginBottom:10}}>INFORMATIONS</div>
                <div style={{display:"grid",gap:8}}>
                  <div style={{padding:"10px 14px",borderRadius:12,background:V.mG}}>
                    <div style={{fontSize:11,fontWeight:700,color:V.mc,marginBottom:2}}>Durée</div>
                    <div style={{fontSize:16,fontWeight:700,color:V.body}}>{op.sTo-op.sFrom+1} semaine{op.sTo-op.sFrom>0?"s":""}</div>
                    <div style={{fontSize:11,color:V.muted}}>S{op.sFrom} → S{op.sTo}</div>
                  </div>
                  <div style={{padding:"10px 14px",borderRadius:12,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:V.muted,marginBottom:2}}>Zone</div>
                    <div style={{fontSize:13,fontWeight:600,color:V.body}}>{op.zone||"Non précisée"}</div>
                  </div>
                  <div style={{padding:"10px 14px",borderRadius:12,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:V.muted,marginBottom:2}}>Plan visuel</div>
                    <div style={{fontSize:13,fontWeight:600,color:selectedOpImage?"#16a34a":"#d97706"}}>{selectedOpImage?"Disponible":"Non chargé — importer le PDF"}</div>
                  </div>
                  <div style={{padding:"10px 14px",borderRadius:12,background:"rgba(248,250,252,0.6)",border:`1px solid ${V.border}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:V.muted,marginBottom:2}}>Notes</div>
                    <div style={{fontSize:13,fontWeight:600,color:notes[op.id]?"#16a34a":"#94a3b8"}}>{notes[op.id]?"Oui":"Aucune note"}</div>
                  </div>
                </div>
              </Card>

              {/* All operations count */}
              <Card style={{padding:"14px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}>
                  {[{pl:"A",count:opsA.length},{pl:"B",count:opsB.length},{pl:"C",count:opsC.length}].map(x=>(
                    <div key={x.pl}>
                      <div style={{fontSize:22,fontWeight:800,color:PL[x.pl].c}}>{x.count}</div>
                      <div style={{fontSize:10,fontWeight:700,color:V.light}}>{PL[x.pl].label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
