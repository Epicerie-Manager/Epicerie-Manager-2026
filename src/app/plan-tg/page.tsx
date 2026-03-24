"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  tgEmployees,
  tgWeeks,
  type TgDefaultAssignment,
  type TgFamily,
  type TgRayon,
  type TgWeekPlanRow,
} from "@/lib/tg-data";
import {
  getTgUpdatedEventName,
  loadTgCustomMechanics,
  loadTgDefaultAssignments,
  loadTgRayons,
  loadTgWeekPlans,
  saveTgCustomMechanics,
  saveTgDefaultAssignments,
  saveTgRayons,
  saveTgWeekPlans,
  syncTgFromSupabase,
} from "@/lib/tg-store";
import { moduleThemes } from "@/lib/theme";

type FamilyFilter = "ALL" | TgFamily;
type PositionMode = "end" | "before" | "after";

const BASE_MECHANICS = ["2EME 60%","2EME 50%","2EME 40%","2EME 30%","2EME 60% COC","2EME 40% COC","2EME 30% COC","COC 25%","COC 2EME 30%","RI 25%","RI 30%","RI 34%","35+15","85+35","2+1","15% OFFERT","GRATUITÉ EN PACK"];

const chipStyle = (active:boolean,color:string,medium:string):React.CSSProperties => ({ borderRadius:"999px", border:`1px solid ${active ? color : "#dbe3eb"}`, background:active?medium:"#fff", color:active?color:"#64748b", fontWeight:active?700:500, fontSize:"12px", padding:"7px 12px" });

function formatWeekLabel(weekId:string){
  const m=/^(\d{1,2}).*?(\d{2})$/.exec(weekId.trim());
  if(!m) return weekId;
  const week=Number(m[1]); const year=2000+Number(m[2]);
  const jan4=new Date(Date.UTC(year,0,4)); const d=jan4.getUTCDay()||7;
  const monday=new Date(jan4); monday.setUTCDate(jan4.getUTCDate()-d+1+(week-1)*7);
  const end=new Date(monday); end.setUTCDate(monday.getUTCDate()+6);
  const sameMonth=monday.getUTCMonth()===end.getUTCMonth();
  const sd=monday.getUTCDate(); const ed=end.getUTCDate();
  const sm=monday.toLocaleDateString("fr-FR",{month:"short",timeZone:"UTC"});
  const em=end.toLocaleDateString("fr-FR",{month:"short",timeZone:"UTC"});
  return sameMonth?`S${week} - du ${sd} au ${ed} ${em} ${year}`:`S${week} - du ${sd} ${sm} au ${ed} ${em} ${year}`;
}

function resequence(rayons:TgRayon[]){
  return [...rayons].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).map((r,i)=>({...r,order:String((i+1)*10)}));
}

function normalizePlans(plans:TgWeekPlanRow[], rayons:TgRayon[], map:Map<string,string>){
  const byKey=new Map(plans.map((r)=>[`${r.weekId}__${r.rayon}`,r])); const out:TgWeekPlanRow[]=[];
  const weekOrder=new Map(tgWeeks.map((w,i)=>[w.id,i]));
  tgWeeks.forEach((w)=>rayons.forEach((rayon)=>{
    const startIndex=weekOrder.get(rayon.startWeekId??tgWeeks[0]?.id??"")??0;
    const currentIndex=weekOrder.get(w.id)??0;
    if(currentIndex<startIndex) return;
    const k=`${w.id}__${rayon.rayon}`; const ex=byKey.get(k);
    if(ex){ out.push({...ex,family:rayon.family,defaultResponsible:map.get(rayon.rayon)??ex.defaultResponsible??"",hasOperation:Boolean(ex.gbProduct||ex.tgProduct||ex.tgQuantity||ex.tgMechanic)}); return; }
    out.push({weekId:w.id,rayon:rayon.rayon,family:rayon.family,defaultResponsible:map.get(rayon.rayon)??"",gbProduct:"",tgResponsible:map.get(rayon.rayon)??"",tgProduct:"",tgQuantity:"",tgMechanic:"",hasOperation:false});
  }));
  return out;
}

function RayonCardPlan({row,isSelected,onClick,theme}:{row:TgWeekPlanRow;isSelected:boolean;onClick:()=>void;theme:{color:string;medium:string}}){
  const hasData=!!(row.tgProduct||row.gbProduct);
  return <div onClick={onClick} style={{borderRadius:10,border:isSelected?`2px solid ${theme.color}`:"1px solid #dbe3eb",overflow:"hidden",cursor:"pointer",background:"#fff",boxShadow:isSelected?`0 0 0 3px ${theme.medium}`:"none"}}>
    <div style={{padding:"4px 6px",background:hasData?"#f8fafc":"#f1f5f9",borderBottom:"1px solid #dbe3eb",fontSize:9,fontWeight:700,color:"#0f172a",textTransform:"uppercase",minHeight:28,display:"flex",alignItems:"center"}}>{row.rayon}</div>
    <div style={{padding:"2px 6px",background:"#f8fafc",borderBottom:"1px solid #dbe3eb",fontSize:8,color:"#64748b"}}>{row.tgResponsible&&row.tgResponsible!==row.defaultResponsible?<span style={{color:theme.color,fontWeight:700}}>{row.tgResponsible}</span>:(row.defaultResponsible||"Non défini")}</div>
    <div style={{padding:"4px 6px",background:row.gbProduct?"#eff6ff":"#fafafa",borderBottom:"1px solid #dbe3eb",minHeight:36}}>{row.gbProduct?<><div style={{fontSize:8,fontWeight:700,color:"#1d5fa0"}}>GB</div><div style={{fontSize:9,color:"#1d5fa0"}}>{row.gbProduct.length>30?`${row.gbProduct.slice(0,30)}…`:row.gbProduct}</div></>:<div style={{fontSize:8,color:"#94a3b8",fontStyle:"italic"}}>—</div>}</div>
    <div style={{padding:"4px 6px",background:row.tgProduct?"#fdecea":"#fafafa",minHeight:44}}>{row.tgProduct?<><div style={{fontSize:8,fontWeight:700,color:"#C8001A"}}>TG</div><div style={{fontSize:9,color:"#7f1320",fontWeight:600}}>{row.tgProduct.length>28?`${row.tgProduct.slice(0,28)}…`:row.tgProduct}</div>{(row.tgQuantity||row.tgMechanic)&&<div style={{fontSize:8,color:"#C8001A"}}>{[row.tgQuantity,row.tgMechanic].filter(Boolean).join(" · ")}</div>}</>:<div style={{fontSize:8,color:"#94a3b8",fontStyle:"italic"}}>—</div>}</div>
  </div>;
}

export default function PlanTgPage(){
  const theme=moduleThemes.plantg;
  const [rayons,setRayons]=useState<TgRayon[]>(()=>resequence(loadTgRayons()));
  const [assignments,setAssignments]=useState<TgDefaultAssignment[]>(()=>loadTgDefaultAssignments());
  const [plans,setPlans]=useState<TgWeekPlanRow[]>(()=>{
    const rs=resequence(loadTgRayons()); const as=loadTgDefaultAssignments();
    return normalizePlans(loadTgWeekPlans(),rs,new Map(as.map((i)=>[i.rayon,i.employee])));
  });
  const [activeWeekId,setActiveWeekId]=useState(tgWeeks[0]?.id??"");
  const [familyFilter,setFamilyFilter]=useState<FamilyFilter>("ALL");
  const [search,setSearch]=useState("");
  const [selectedRayon,setSelectedRayon]=useState("");
  const [rangeEndWeekId,setRangeEndWeekId]=useState(tgWeeks[0]?.id??"");
  const [planVisible,setPlanVisible]=useState(false);
  const [customMechanics,setCustomMechanics]=useState<string[]>(()=>loadTgCustomMechanics());
  const [mecaCustomInput,setMecaCustomInput]=useState("");
  const [showMecaInput,setShowMecaInput]=useState(false);
  const [newRayonName,setNewRayonName]=useState("");
  const [newRayonFamily,setNewRayonFamily]=useState<TgFamily>("Sale");
  const [newRayonResponsible,setNewRayonResponsible]=useState("");
  const [newRayonAnchor,setNewRayonAnchor]=useState("");
  const [newRayonPositionMode,setNewRayonPositionMode]=useState<PositionMode>("end");
  const [newRayonStartWeekId,setNewRayonStartWeekId]=useState(tgWeeks[0]?.id??"");

  const employees=tgEmployees.filter((e)=>e.active).map((e)=>e.name);
  const assignmentMap=useMemo(()=>new Map(assignments.map((i)=>[i.rayon,i.employee])),[assignments]);
  const weekOrder=useMemo(()=>new Map(tgWeeks.map((w,i)=>[w.id,i])),[]);
  const activeWeekIndex=weekOrder.get(activeWeekId)??0;
  const activeWeek=tgWeeks.find((w)=>w.id===activeWeekId)??tgWeeks[0];
  const orderedRayons=useMemo(()=>resequence(rayons),[rayons]);
  const allMechanics=useMemo(()=>[...BASE_MECHANICS,...customMechanics.filter((m)=>!BASE_MECHANICS.includes(m))],[customMechanics]);
  const rayonStartMap=useMemo(()=>new Map(orderedRayons.map((r)=>[r.rayon,weekOrder.get(r.startWeekId??tgWeeks[0]?.id??"")??0])),[orderedRayons,weekOrder]);

  const activeWeekRows=useMemo(()=>plans.filter((r)=>r.weekId===activeWeek.id).filter((r)=>(rayonStartMap.get(r.rayon)??0)<=activeWeekIndex).sort((a,b)=>(Number(orderedRayons.find((x)=>x.rayon===a.rayon)?.order??"0")||0)-(Number(orderedRayons.find((x)=>x.rayon===b.rayon)?.order??"0")||0)).map((r)=>({...r,defaultResponsible:assignmentMap.get(r.rayon)??r.defaultResponsible})),[activeWeek.id,activeWeekIndex,assignmentMap,orderedRayons,plans,rayonStartMap]);
  const effectiveSelectedRayon=activeWeekRows.some((r)=>r.rayon===selectedRayon)?selectedRayon:(activeWeekRows[0]?.rayon??"");
  const selectedRow=activeWeekRows.find((r)=>r.rayon===effectiveSelectedRayon);
  const filteredRows=useMemo(()=>activeWeekRows.filter((r)=>familyFilter==="ALL"?true:r.family===familyFilter).filter((r)=>{if(!search.trim())return true;const q=search.toLowerCase();return r.rayon.toLowerCase().includes(q)||r.gbProduct.toLowerCase().includes(q)||r.tgProduct.toLowerCase().includes(q)||r.tgResponsible.toLowerCase().includes(q)||r.defaultResponsible.toLowerCase().includes(q)}),[activeWeekRows,familyFilter,search]);

  const operationCount=activeWeekRows.filter((r)=>r.gbProduct||r.tgProduct||r.tgQuantity||r.tgMechanic).length;
  const tgAssignedCount=activeWeekRows.filter((r)=>r.tgResponsible).length;
  const groupedOverview=useMemo(()=>({sale:activeWeekRows.filter((r)=>r.family==="Sale"),sucre:activeWeekRows.filter((r)=>r.family==="Sucre")}),[activeWeekRows]);
  const overloaded=useMemo(()=>{const m=new Map<string,number>();activeWeekRows.forEach((r)=>{if(!(r.gbProduct||r.tgProduct||r.tgQuantity||r.tgMechanic))return;const owner=r.tgResponsible||r.defaultResponsible;if(!owner)return;m.set(owner,(m.get(owner)||0)+1);});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);},[activeWeekRows]);

  useEffect(()=>{saveTgRayons(orderedRayons);},[orderedRayons]);
  useEffect(()=>{saveTgDefaultAssignments(assignments);},[assignments]);
  useEffect(()=>{saveTgWeekPlans(normalizePlans(plans,orderedRayons,assignmentMap));},[assignmentMap,orderedRayons,plans]);
  useEffect(()=>{
    const refresh=()=>{
      const nextRayons = resequence(loadTgRayons());
      const nextAssignments = loadTgDefaultAssignments();
      const nextPlans = normalizePlans(loadTgWeekPlans(), nextRayons, new Map(nextAssignments.map((item)=>[item.rayon,item.employee])));
      setRayons(nextRayons);
      setAssignments(nextAssignments);
      setPlans(nextPlans);
      setCustomMechanics(loadTgCustomMechanics());
    };
    void syncTgFromSupabase().then((synced)=>{
      if(synced) refresh();
    });
    const eventName = getTgUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return ()=>window.removeEventListener(eventName, refresh);
  },[]);

  const updateSelectedRow=(patch:Partial<TgWeekPlanRow>)=>{ if(!selectedRow)return; setPlans((cur)=>cur.map((r)=>{if(r.weekId!==activeWeek.id||r.rayon!==selectedRow.rayon)return r;const n={...r,...patch};return {...n,hasOperation:Boolean(n.gbProduct||n.tgProduct||n.tgQuantity||n.tgMechanic)};})); };
  const addCustomMechanic=()=>{ const v=mecaCustomInput.trim().toUpperCase(); if(!v||allMechanics.includes(v)){setMecaCustomInput("");setShowMecaInput(false);return;} const next=[...customMechanics,v]; setCustomMechanics(next); saveTgCustomMechanics(next); updateSelectedRow({tgMechanic:v}); setMecaCustomInput(""); setShowMecaInput(false); };
  const applyRangeForSelectedRayon=()=>{ if(!selectedRow)return; const from=weekOrder.get(activeWeek.id)??0; const to=weekOrder.get(rangeEndWeekId)??from; const [start,end]=from<=to?[from,to]:[to,from]; setPlans((cur)=>cur.map((r)=>{const i=weekOrder.get(r.weekId)??-1; if(r.rayon!==selectedRow.rayon||i<start||i>end)return r; const n={...r,gbProduct:selectedRow.gbProduct,tgResponsible:selectedRow.tgResponsible,tgProduct:selectedRow.tgProduct,tgQuantity:selectedRow.tgQuantity,tgMechanic:selectedRow.tgMechanic}; return {...n,hasOperation:Boolean(n.gbProduct||n.tgProduct||n.tgQuantity||n.tgMechanic)};})); };
  const copyPreviousWeek=()=>{ const prev=tgWeeks[activeWeekIndex-1]; if(!prev)return; const prevMap=new Map(plans.filter((r)=>r.weekId===prev.id).map((r)=>[r.rayon,r])); setPlans((cur)=>cur.map((r)=>{if(r.weekId!==activeWeek.id)return r; const s=prevMap.get(r.rayon); if(!s)return r; return {...r,gbProduct:s.gbProduct,tgResponsible:s.tgResponsible,tgProduct:s.tgProduct,tgQuantity:s.tgQuantity,tgMechanic:s.tgMechanic,hasOperation:s.hasOperation};})); };
  const clearSelectedRow=()=>updateSelectedRow({gbProduct:"",tgProduct:"",tgQuantity:"",tgMechanic:"",tgResponsible:selectedRow?.defaultResponsible??""});
  const goPrev=()=>{const p=tgWeeks[activeWeekIndex-1]; if(!p)return; setActiveWeekId(p.id); setRangeEndWeekId(p.id);};
  const goNext=()=>{const n=tgWeeks[activeWeekIndex+1]; if(!n)return; setActiveWeekId(n.id); setRangeEndWeekId(n.id);};

  const addRayon=()=>{const name=newRayonName.trim().toUpperCase(); if(!name||orderedRayons.some((r)=>r.rayon===name))return; const startWeekId=newRayonStartWeekId||activeWeek.id; const item:TgRayon={rayon:name,family:newRayonFamily,order:"0",active:true,startWeekId}; const list=[...orderedRayons]; if(newRayonPositionMode==="end"||!newRayonAnchor) list.push(item); else {const idx=list.findIndex((r)=>r.rayon===newRayonAnchor); if(idx<0) list.push(item); else list.splice(newRayonPositionMode==="before"?idx:idx+1,0,item);} const rs=resequence(list); const as=newRayonResponsible?[...assignments.filter((i)=>i.rayon!==name),{employee:newRayonResponsible,rayon:name}]:assignments; const map=new Map(as.map((i)=>[i.rayon,i.employee])); setRayons(rs); setAssignments(as); setPlans(normalizePlans(plans,rs,map)); setSelectedRayon(name); setNewRayonName(""); setNewRayonResponsible(""); setNewRayonStartWeekId(activeWeek.id); };
  const deleteSelectedRayon=()=>{ if(!selectedRow)return; const del=selectedRow.rayon; const confirmed=window.confirm(`Supprimer le rayon "${del}" ?\n\nCette action supprimera ce rayon sur toute l'année (toutes les semaines), y compris ses données TG/GB.`); if(!confirmed)return; const rs=resequence(orderedRayons.filter((r)=>r.rayon!==del)); const as=assignments.filter((i)=>i.rayon!==del); const map=new Map(as.map((i)=>[i.rayon,i.employee])); setRayons(rs); setAssignments(as); setPlans(normalizePlans(plans.filter((p)=>p.rayon!==del),rs,map)); setSelectedRayon(rs[0]?.rayon??""); };
  const moveRayon=(rayonName:string,dir:-1|1)=>{const list=[...orderedRayons]; const idx=list.findIndex((r)=>r.rayon===rayonName); const target=idx+dir; if(idx<0||target<0||target>=list.length)return; const [item]=list.splice(idx,1); list.splice(target,0,item); const rs=resequence(list); const map=new Map(assignments.map((i)=>[i.rayon,i.employee])); setRayons(rs); setPlans(normalizePlans(plans,rs,map)); };

  return <section style={{display:"grid",gap:"14px",marginTop:"20px"}}>
    <ModuleHeader compact moduleKey="plantg" title="Plan TG / GB manager" description="Pilotage hebdomadaire des têtes de gondole et gondoles basses. Affectation dynamique des collaborateurs selon la charge." />

    <Card><div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",justifyContent:"space-between"}}>
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
        <button type="button" onClick={goPrev} disabled={activeWeekIndex<=0} style={{...chipStyle(false,theme.color,theme.medium),opacity:activeWeekIndex<=0?0.5:1}}>←</button>
        <select value={activeWeek.id} onChange={(e)=>{setActiveWeekId(e.target.value);setRangeEndWeekId(e.target.value);}} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px",fontSize:"12px"}}>{tgWeeks.map((w)=><option key={w.id} value={w.id}>{formatWeekLabel(w.id)}</option>)}</select>
        <button type="button" onClick={goNext} disabled={activeWeekIndex>=tgWeeks.length-1} style={{...chipStyle(false,theme.color,theme.medium),opacity:activeWeekIndex>=tgWeeks.length-1?0.5:1}}>→</button>
        {(["ALL","Sale","Sucre"] as const).map((v)=><button key={v} type="button" style={chipStyle(familyFilter===v,theme.color,theme.medium)} onClick={()=>setFamilyFilter(v)}>{v==="ALL"?"Tous rayons":v}</button>)}
      </div>
      <button type="button" style={chipStyle(false,theme.color,theme.medium)} onClick={copyPreviousWeek}>Copier semaine précédente</button>
    </div><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Recherche rayon / produit / responsable..." style={{marginTop:"10px",minHeight:"36px",width:"100%",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 12px",fontSize:"12px",color:"#1e293b"}}/></Card>

    <KPIRow><KPI moduleKey="plantg" value={formatWeekLabel(activeWeek.id)} label="Semaine active" size="sm"/><KPI moduleKey="plantg" value={filteredRows.length} label="Rayons visibles"/><KPI moduleKey="plantg" value={operationCount} label="Rayons avec opérations"/><KPI moduleKey="plantg" value={tgAssignedCount} label="TG affectées"/></KPIRow>

    <button type="button" onClick={()=>setPlanVisible((v)=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"7px 0",borderRadius:"10px",border:`1px solid ${planVisible?theme.color:"#dbe3eb"}`,background:planVisible?theme.medium:"#fff",color:planVisible?theme.color:"#64748b",fontWeight:600,fontSize:"12px",cursor:"pointer"}}><span style={{fontSize:"10px"}}>{planVisible?"▲":"▼"}</span>Vue d&apos;ensemble plan<span style={{fontSize:"10px"}}>{planVisible?"▲":"▼"}</span></button>

    {planVisible&&<Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}><div><Kicker moduleKey="plantg" label="Vue d&apos;ensemble"/><span style={{fontSize:"12px",color:"#64748b",marginLeft:"10px"}}>{formatWeekLabel(activeWeek.id)} — Cliquer sur un rayon pour l&apos;éditer</span></div></div>
      <div style={{marginBottom:"16px"}}><div style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.06em",color:"#1d5fa0",textTransform:"uppercase",marginBottom:"8px"}}>SALÉ — {groupedOverview.sale.length} rayons</div><div style={{display:"grid",gridTemplateColumns:"repeat(10, minmax(0, 1fr))",gap:"6px"}}>{groupedOverview.sale.map((r)=><RayonCardPlan key={r.rayon} row={r} isSelected={r.rayon===effectiveSelectedRayon} onClick={()=>setSelectedRayon(r.rayon)} theme={theme}/>)}</div></div>
      <div><div style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.06em",color:"#C8001A",textTransform:"uppercase",marginBottom:"8px"}}>SUCRÉ — {groupedOverview.sucre.length} rayons</div><div style={{display:"grid",gridTemplateColumns:"repeat(10, minmax(0, 1fr))",gap:"6px"}}>{groupedOverview.sucre.map((r)=><RayonCardPlan key={r.rayon} row={r} isSelected={r.rayon===effectiveSelectedRayon} onClick={()=>setSelectedRayon(r.rayon)} theme={theme}/>)}</div></div>
    </Card>}

    <div style={{display:"grid",gap:"12px",gridTemplateColumns:"1.2fr 1fr"}}>
      <Card><Kicker moduleKey="plantg" label="Vue rayons"/><h2 style={{marginTop:"6px",fontSize:"18px",color:"#0f172a"}}>Saisie rapide semaine</h2><div style={{marginTop:"10px",display:"grid",gap:"8px",maxHeight:"560px",overflowY:"auto",paddingRight:"2px"}}>{filteredRows.map((r)=>{const active=r.rayon===effectiveSelectedRayon;const hasTG=Boolean(r.tgProduct);const hasGB=Boolean(r.gbProduct);const hasData=hasTG||hasGB;const rayonIndex=orderedRayons.findIndex((x)=>x.rayon===r.rayon);return <div key={r.rayon} role="button" tabIndex={0} onClick={()=>setSelectedRayon(r.rayon)} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedRayon(r.rayon);}}} style={{textAlign:"left",borderRadius:"12px",border:`1px solid ${active?theme.color:"#dbe3eb"}`,background:active?theme.light:"#fff",padding:"10px 12px",cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",gap:"8px",alignItems:"flex-start"}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><strong style={{fontSize:"13px",color:"#0f172a"}}>{r.rayon}</strong><span style={{fontSize:"10px",fontWeight:700,borderRadius:"999px",padding:"3px 8px",background:r.family==="Sale"?"#dcfce7":"#fef3c7",color:r.family==="Sale"?"#166534":"#92400e"}}>{r.family}</span></div><div style={{display:"flex",alignItems:"center",gap:6}}><button type="button" onClick={(e)=>{e.stopPropagation();moveRayon(r.rayon,-1);}} disabled={rayonIndex<=0} style={{border:"1px solid #dbe3eb",background:"#fff",borderRadius:6,padding:"1px 6px",fontSize:11,cursor:rayonIndex<=0?"not-allowed":"pointer",opacity:rayonIndex<=0?0.4:1}}>↑</button><button type="button" onClick={(e)=>{e.stopPropagation();moveRayon(r.rayon,1);}} disabled={rayonIndex>=orderedRayons.length-1} style={{border:"1px solid #dbe3eb",background:"#fff",borderRadius:6,padding:"1px 6px",fontSize:11,cursor:rayonIndex>=orderedRayons.length-1?"not-allowed":"pointer",opacity:rayonIndex>=orderedRayons.length-1?0.4:1}}>↓</button><span style={{width:10,height:10,borderRadius:"50%",background:hasData?"#15803d":"#cbd5e1",display:"inline-block"}}/></div></div><div style={{marginTop:"5px",fontSize:"12px",color:"#64748b"}}>Resp. base: <strong style={{color:"#334155"}}>{r.defaultResponsible||"Non défini"}</strong></div><div style={{marginTop:"4px",fontSize:"12px",color:"#475569",display:"grid",gap:2}}>{hasTG?<div><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#dc3545",marginRight:6}}/>TG : {r.tgProduct}{r.tgQuantity?` · ${r.tgQuantity}`:""}{r.tgMechanic?` · ${r.tgMechanic}`:""}</div>:null}{hasGB?<div><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#1d5fa0",marginRight:6}}/>GB : {r.gbProduct}</div>:null}{!hasData?<div style={{color:"#94a3b8",fontStyle:"italic"}}>Aucune opération saisie</div>:null}</div></div>;})}</div></Card>

      <Card><Kicker moduleKey="plantg" label="Edition rayon"/><h2 style={{marginTop:"6px",fontSize:"18px",color:"#0f172a"}}>{selectedRow?selectedRow.rayon:"Sélectionner un rayon"}</h2>{selectedRow?<div style={{display:"grid",gap:"10px",marginTop:"10px"}}>
        <label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Produit GB (gondole basse)</span><textarea value={selectedRow.gbProduct} onChange={(e)=>updateSelectedRow({gbProduct:e.target.value})} rows={2} style={{borderRadius:"10px",border:"1px solid #dbe3eb",padding:"8px 10px",resize:"vertical",fontFamily:"inherit"}}/></label>
        <label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Responsable TG</span><select value={selectedRow.tgResponsible||selectedRow.defaultResponsible} onChange={(e)=>updateSelectedRow({tgResponsible:e.target.value})} style={{minHeight:"36px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}>{[...new Set([selectedRow.defaultResponsible,...employees].filter(Boolean))].map((emp)=><option key={emp} value={emp}>{emp}</option>)}</select></label>
        <label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Produit TG</span><textarea value={selectedRow.tgProduct} onChange={(e)=>updateSelectedRow({tgProduct:e.target.value})} rows={3} style={{borderRadius:"10px",border:"1px solid #dbe3eb",padding:"8px 10px",resize:"vertical",fontFamily:"inherit"}}/></label>
        <div style={{display:"grid",gap:"8px",gridTemplateColumns:"1fr 1fr"}}>
          <label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Quantité</span><input value={selectedRow.tgQuantity} onChange={(e)=>updateSelectedRow({tgQuantity:e.target.value})} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}/></label>
          <label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Mécanique</span><select value={selectedRow.tgMechanic} onChange={(e)=>{if(e.target.value==="__custom__")setShowMecaInput(true);else{updateSelectedRow({tgMechanic:e.target.value});setShowMecaInput(false);}}} style={{minHeight:"36px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px",fontFamily:"inherit",fontSize:"12px"}}><option value="">— Choisir —</option>{allMechanics.map((m)=><option key={m} value={m}>{m}</option>)}<option value="__custom__">+ Créer une nouvelle…</option></select>{showMecaInput&&<div style={{display:"flex",gap:"6px",marginTop:"4px"}}><input autoFocus value={mecaCustomInput} onChange={(e)=>setMecaCustomInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter")addCustomMechanic(); if(e.key==="Escape"){setShowMecaInput(false);setMecaCustomInput("");}}} placeholder="Ex : 2EME 45%" style={{flex:1,minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px",fontSize:"12px",fontFamily:"inherit"}}/><button type="button" onClick={addCustomMechanic} style={{padding:"0 14px",borderRadius:"10px",border:"none",background:theme.color,color:"#fff",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>Ajouter</button></div>}</label>
        </div>
        <div style={{display:"grid",gap:"8px",gridTemplateColumns:"1fr auto"}}><label style={{display:"grid",gap:"4px",fontSize:"12px",color:"#64748b"}}><span>Appliquer jusqu’à la semaine</span><select value={rangeEndWeekId} onChange={(e)=>setRangeEndWeekId(e.target.value)} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px",fontSize:"12px"}}>{tgWeeks.map((w)=><option key={w.id} value={w.id}>{formatWeekLabel(w.id)}</option>)}</select></label><button type="button" style={chipStyle(false,theme.color,theme.medium)} onClick={applyRangeForSelectedRayon}>Appliquer la plage</button></div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}><button type="button" style={chipStyle(false,theme.color,theme.medium)} onClick={clearSelectedRow}>Vider le rayon</button><button type="button" style={{...chipStyle(false,"#b91c1c","#fee2e2"),borderColor:"#fecaca",color:"#b91c1c"}} onClick={deleteSelectedRayon}>Supprimer le rayon</button></div>
      </div>:<p style={{marginTop:"10px",color:"#64748b",fontSize:"12px"}}>Sélectionne un rayon pour éditer son plan TG/GB.</p>}</Card>
    </div>

    <Card><Kicker moduleKey="plantg" label="Paramètres rayons"/><h2 style={{marginTop:"6px",fontSize:"18px",color:"#0f172a"}}>Ajouter un rayon</h2><div style={{display:"grid",marginTop:"10px",gap:"8px",gridTemplateColumns:"1.1fr 0.8fr 1fr 1fr 0.8fr 1fr auto"}}>
      <input value={newRayonName} onChange={(e)=>setNewRayonName(e.target.value)} placeholder="Nom du rayon (ex: SNACK SALES)" style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}/>
      <select value={newRayonFamily} onChange={(e)=>setNewRayonFamily(e.target.value as TgFamily)} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}><option value="Sale">Salé</option><option value="Sucre">Sucré</option></select>
      <select value={newRayonResponsible} onChange={(e)=>setNewRayonResponsible(e.target.value)} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}><option value="">Responsable (optionnel)</option>{employees.map((emp)=><option key={emp} value={emp}>{emp}</option>)}</select>
      <select value={newRayonStartWeekId} onChange={(e)=>setNewRayonStartWeekId(e.target.value)} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}>{tgWeeks.map((w)=><option key={w.id} value={w.id}>A partir de {formatWeekLabel(w.id)}</option>)}</select>
      <select value={newRayonPositionMode} onChange={(e)=>setNewRayonPositionMode(e.target.value as PositionMode)} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}><option value="end">Fin de liste</option><option value="before">Avant</option><option value="after">Après</option></select>
      <select value={newRayonAnchor} onChange={(e)=>setNewRayonAnchor(e.target.value)} disabled={newRayonPositionMode==="end"} style={{minHeight:"34px",borderRadius:"10px",border:"1px solid #dbe3eb",padding:"0 10px"}}><option value="">Rayon de référence</option>{orderedRayons.map((r)=><option key={r.rayon} value={r.rayon}>{r.rayon}</option>)}</select>
      <button type="button" style={chipStyle(false,theme.color,theme.medium)} onClick={addRayon}>Ajouter</button>
    </div></Card>

    <Card><Kicker moduleKey="plantg" label="Charge équipe"/><h2 style={{marginTop:"6px",fontSize:"18px",color:"#0f172a"}}>Répartition des opérations</h2><div style={{marginTop:"10px",display:"grid",gap:"8px",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))"}}>{overloaded.map(([e,c])=><div key={e} style={{borderRadius:"12px",border:"1px solid #dbe3eb",background:"#fff",padding:"10px 12px"}}><strong style={{fontSize:"13px",color:"#0f172a"}}>{e}</strong><div style={{marginTop:"4px",fontSize:"12px",color:"#64748b"}}>{c} rayon(s) avec opération</div></div>)}{overloaded.length===0?<p style={{fontSize:"12px",color:"#64748b"}}>Aucune charge détectée sur cette semaine.</p>:null}</div></Card>
  </section>;
}

