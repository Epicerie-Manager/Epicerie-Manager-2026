"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { getRhUpdatedEventName, syncRhFromSupabase } from "@/lib/rh-store";
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
  saveTgConfigToSupabase,
  saveTgEntryToSupabase,
  saveTgRayons,
  saveTgWeekPlans,
  syncTgFromSupabase,
} from "@/lib/tg-store";
import { moduleThemes } from "@/lib/theme";

type FamilyFilter = "ALL" | TgFamily;
type PositionMode = "end" | "before" | "after";

const BASE_MECHANICS = ["2EME 60%","2EME 50%","2EME 40%","2EME 30%","2EME 60% COC","2EME 40% COC","2EME 30% COC","COC 25%","COC 2EME 30%","RI 25%","RI 30%","RI 34%","35+15","85+35","2+1","15% OFFERT","GRATUITÉ EN PACK"];

const chipStyle = (active:boolean,color:string,medium:string):React.CSSProperties => ({ borderRadius:"999px", border:`1px solid ${active ? color : "#dbe3eb"}`, background:active?medium:"#fff", color:active?color:"#64748b", fontWeight:active?700:500, fontSize:"12px", padding:"7px 12px" });

function buildAssignmentMap(assignments:TgDefaultAssignment[]){
  return new Map(assignments.map((item)=>[item.rayon,item.employee]));
}

function hasOperationData(row:Pick<TgWeekPlanRow,"gbProduct"|"tgProduct"|"tgQuantity"|"tgMechanic">){
  return Boolean(row.gbProduct||row.tgProduct||row.tgQuantity||row.tgMechanic);
}

function withOperationState(row:TgWeekPlanRow){
  return {...row,hasOperation:hasOperationData(row)};
}

function getISOWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getCurrentWeekId() {
  if (!tgWeeks.length) return "";
  const isoWeek = getISOWeekNumber(new Date());
  const padded = String(isoWeek).padStart(2, "0");
  const exact = tgWeeks.find((week) => week.id.startsWith(`${padded} `));
  if (exact) return exact.id;

  const parsed = tgWeeks
    .map((week) => {
      const match = week.id.match(/^(\d{1,2})\s/);
      if (!match) return null;
      return { id: week.id, num: Number(match[1]) };
    })
    .filter((row): row is { id: string; num: number } => row !== null);
  if (!parsed.length) return tgWeeks[0].id;
  parsed.sort((a, b) => Math.abs(a.num - isoWeek) - Math.abs(b.num - isoWeek));
  return parsed[0].id;
}

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

function sortRayonsByOrder(rayons:TgRayon[]){
  return [...rayons].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
}

function assignSequentialRayonOrders(rayons:TgRayon[]){
  return rayons.map((rayon,index)=>({...rayon,order:String((index+1)*10)}));
}

function normalizePlans(plans:TgWeekPlanRow[], rayons:TgRayon[], map:Map<string,string>){
  const byKey=new Map(plans.map((r)=>[`${r.weekId}__${r.rayon}`,r]));
  const out:TgWeekPlanRow[]=[];
  const weekOrder=new Map(tgWeeks.map((w,i)=>[w.id,i]));
  tgWeeks.forEach((w)=>rayons.forEach((rayon)=>{
    const startIndex=weekOrder.get(rayon.startWeekId??tgWeeks[0]?.id??"")??0;
    const currentIndex=weekOrder.get(w.id)??0;
    if(currentIndex<startIndex) return;
    const key=`${w.id}__${rayon.rayon}`;
    const existing=byKey.get(key);
    if(existing){
      out.push(withOperationState({
        ...existing,
        family:rayon.family,
        defaultResponsible:map.get(rayon.rayon)??existing.defaultResponsible??"",
      }));
      return;
    }
    out.push({
      weekId:w.id,
      rayon:rayon.rayon,
      family:rayon.family,
      defaultResponsible:map.get(rayon.rayon)??"",
      gbProduct:"",
      tgResponsible:map.get(rayon.rayon)??"",
      tgProduct:"",
      tgQuantity:"",
      tgMechanic:"",
      hasOperation:false,
    });
  }));
  return out;
}

function areStringListsEqual(a:string[],b:string[]){
  return a.length===b.length && a.every((value,index)=>value===b[index]);
}

function areAssignmentsEqual(a:TgDefaultAssignment[],b:TgDefaultAssignment[]){
  return a.length===b.length && a.every((value,index)=>(
    value.employee===b[index]?.employee &&
    value.rayon===b[index]?.rayon
  ));
}

function areRayonsEqual(a:TgRayon[],b:TgRayon[]){
  return a.length===b.length && a.every((value,index)=>(
    value.rayon===b[index]?.rayon &&
    value.family===b[index]?.family &&
    value.order===b[index]?.order &&
    value.active===b[index]?.active &&
    (value.startWeekId ?? "")===(b[index]?.startWeekId ?? "")
  ));
}

function arePlansEqual(a:TgWeekPlanRow[],b:TgWeekPlanRow[]){
  return a.length===b.length && a.every((value,index)=>(
    value.weekId===b[index]?.weekId &&
    value.rayon===b[index]?.rayon &&
    value.family===b[index]?.family &&
    value.defaultResponsible===b[index]?.defaultResponsible &&
    value.gbProduct===b[index]?.gbProduct &&
    value.tgResponsible===b[index]?.tgResponsible &&
    value.tgProduct===b[index]?.tgProduct &&
    value.tgQuantity===b[index]?.tgQuantity &&
    value.tgMechanic===b[index]?.tgMechanic &&
    value.hasOperation===b[index]?.hasOperation
  ));
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
  const initialWeekId = getCurrentWeekId() || tgWeeks[0]?.id || "";
  const [rayons,setRayons]=useState<TgRayon[]>(()=>assignSequentialRayonOrders(sortRayonsByOrder(loadTgRayons())));
  const [assignments,setAssignments]=useState<TgDefaultAssignment[]>(()=>loadTgDefaultAssignments());
  const [plans,setPlans]=useState<TgWeekPlanRow[]>(()=>{
    const rs=assignSequentialRayonOrders(sortRayonsByOrder(loadTgRayons())); const as=loadTgDefaultAssignments();
    return normalizePlans(loadTgWeekPlans(),rs,new Map(as.map((i)=>[i.rayon,i.employee])));
  });
  const [activeWeekId,setActiveWeekId]=useState(initialWeekId);
  const [familyFilter,setFamilyFilter]=useState<FamilyFilter>("ALL");
  const [search,setSearch]=useState("");
  const [selectedRayon,setSelectedRayon]=useState("");
  const [rangeEndWeekId,setRangeEndWeekId]=useState(initialWeekId);
  const [planVisible,setPlanVisible]=useState(false);
  const [customMechanics,setCustomMechanics]=useState<string[]>(()=>loadTgCustomMechanics());
  const [mecaCustomInput,setMecaCustomInput]=useState("");
  const [showMecaInput,setShowMecaInput]=useState(false);
  const [newRayonName,setNewRayonName]=useState("");
  const [newRayonFamily,setNewRayonFamily]=useState<TgFamily>("Sale");
  const [newRayonResponsible,setNewRayonResponsible]=useState("");
  const [newRayonAnchor,setNewRayonAnchor]=useState("");
  const [newRayonPositionMode,setNewRayonPositionMode]=useState<PositionMode>("end");
  const [newRayonStartWeekId,setNewRayonStartWeekId]=useState(initialWeekId);
  const [remoteSaveEnabled,setRemoteSaveEnabled]=useState(false);
  const [tgSaveError,setTgSaveError]=useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const latestRayonsRef = useRef<TgRayon[]>([]);
  const latestAssignmentsRef = useRef<TgDefaultAssignment[]>([]);
  const latestMechanicsRef = useRef<string[]>([]);
  const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
  const hasPendingRemoteSaveRef = useRef(false);
  const pendingRowSavesRef = useRef(new Map<string, TgWeekPlanRow>());
  const rowSaveTimersRef = useRef(new Map<string, number>());
  const rowSaveInFlightRef = useRef(new Set<string>());

  const employees=tgEmployees.filter((e)=>e.active).map((e)=>e.name);
  const assignmentMap=useMemo(()=>buildAssignmentMap(assignments),[assignments]);
  const weekOrder=useMemo(()=>new Map(tgWeeks.map((w,i)=>[w.id,i])),[]);
  const activeWeekIndex=weekOrder.get(activeWeekId)??0;
  const activeWeek=tgWeeks.find((w)=>w.id===activeWeekId)??tgWeeks[0];
  const orderedRayons=useMemo(()=>assignSequentialRayonOrders(sortRayonsByOrder(rayons)),[rayons]);
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

  const flushPersistRow = useCallback(async (key:string) => {
    if (rowSaveInFlightRef.current.has(key)) return;
    const row = pendingRowSavesRef.current.get(key);
    if (!row) return;

    rowSaveInFlightRef.current.add(key);
    pendingRowSavesRef.current.delete(key);

    try{
      setTgSaveError(null);
      await saveTgEntryToSupabase(row);
    } catch (err) {
      setTgSaveError(err instanceof Error ? err.message : "Erreur d'enregistrement TG");
    } finally {
      rowSaveInFlightRef.current.delete(key);
      if (pendingRowSavesRef.current.has(key)) {
        void flushPersistRow(key);
      }
    }
  },[]);

  const persistRow = useCallback((row:TgWeekPlanRow, options?: { immediate?: boolean }) => {
    const key = `${row.weekId}__${row.rayon}`;
    pendingRowSavesRef.current.set(key, row);

    const existingTimer = rowSaveTimersRef.current.get(key);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      rowSaveTimersRef.current.delete(key);
    }

    if (options?.immediate) {
      void flushPersistRow(key);
      return;
    }

    const timer = window.setTimeout(() => {
      rowSaveTimersRef.current.delete(key);
      void flushPersistRow(key);
    }, 250);
    rowSaveTimersRef.current.set(key, timer);
  },[flushPersistRow]);

  useEffect(()=>{
    if(!remoteSaveEnabled) return;
    latestRayonsRef.current = orderedRayons;
    latestAssignmentsRef.current = assignments;
    latestMechanicsRef.current = customMechanics;
    hasPendingRemoteSaveRef.current = true;

    const flushRemoteSave = async () => {
      if(inFlightSaveRef.current){
        await inFlightSaveRef.current;
        if(!hasPendingRemoteSaveRef.current) return true;
      }
      const savePromise = (async ()=>{
        const configSaved = await saveTgConfigToSupabase(
          latestRayonsRef.current,
          latestAssignmentsRef.current,
          latestMechanicsRef.current,
        );
        return configSaved;
      })().finally(()=>{
        inFlightSaveRef.current = null;
      });
      inFlightSaveRef.current = savePromise;
      const saved = await savePromise;
      if(saved){
        hasPendingRemoteSaveRef.current = false;
      }
      return saved;
    };

    if(saveTimeoutRef.current){
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(()=>{
      void flushRemoteSave();
    },250);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if(!hasPendingRemoteSaveRef.current && !inFlightSaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleVisibilityChange = () => {
      if(document.visibilityState === "hidden" && hasPendingRemoteSaveRef.current){
        void flushRemoteSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return ()=>{
      if(saveTimeoutRef.current){
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  },[assignments,customMechanics,orderedRayons,remoteSaveEnabled]);
  useEffect(()=>{
    const refresh=()=>{
      const nextRayons = assignSequentialRayonOrders(sortRayonsByOrder(loadTgRayons()));
      const nextAssignments = loadTgDefaultAssignments();
      const nextPlans = normalizePlans(loadTgWeekPlans(), nextRayons, buildAssignmentMap(nextAssignments));
      const nextMechanics = loadTgCustomMechanics();
      setRayons((current)=>areRayonsEqual(current,nextRayons)?current:nextRayons);
      setAssignments((current)=>areAssignmentsEqual(current,nextAssignments)?current:nextAssignments);
      setPlans((current)=>arePlansEqual(current,nextPlans)?current:nextPlans);
      setCustomMechanics((current)=>areStringListsEqual(current,nextMechanics)?current:nextMechanics);
    };
    void Promise.all([syncTgFromSupabase(), syncRhFromSupabase()]).then(([tgSynced, rhSynced])=>{
      const synced = Boolean(tgSynced || rhSynced);
      if(synced) refresh();
      setRemoteSaveEnabled(true);
    }).catch(()=>{
      setRemoteSaveEnabled(true);
    });
    const tgEventName = getTgUpdatedEventName();
    const rhEventName = getRhUpdatedEventName();
    window.addEventListener(tgEventName, refresh);
    window.addEventListener(rhEventName, refresh);
    return ()=>{
      window.removeEventListener(tgEventName, refresh);
      window.removeEventListener(rhEventName, refresh);
    };
  },[]);

  useEffect(() => {
    const rowSaveTimers = rowSaveTimersRef.current;
    const pendingRowSaves = pendingRowSavesRef.current;
    const rowSaveInFlight = rowSaveInFlightRef.current;
    return () => {
      rowSaveTimers.forEach((timer) => window.clearTimeout(timer));
      rowSaveTimers.clear();
      pendingRowSaves.clear();
      rowSaveInFlight.clear();
    };
  }, []);

  const updateSelectedRow=useCallback((patch:Partial<TgWeekPlanRow>)=>{
    if(!selectedRow) return;
    setPlans((current)=>{
      const next=current.map((row)=>{
        if(row.weekId!==activeWeek.id||row.rayon!==selectedRow.rayon) return row;
        return withOperationState({...row,...patch});
      });
      const updatedRow=next.find((row)=>row.weekId===activeWeek.id&&row.rayon===selectedRow.rayon);
      if(updatedRow) persistRow(updatedRow);
      return next;
    });
  },[activeWeek.id,persistRow,selectedRow]);

  const addCustomMechanic=()=>{
    const value=mecaCustomInput.trim().toUpperCase();
    if(!value||allMechanics.includes(value)){
      setMecaCustomInput("");
      setShowMecaInput(false);
      return;
    }

    const nextMechanics=[...customMechanics,value];
    setCustomMechanics(nextMechanics);
    saveTgCustomMechanics(nextMechanics);
    updateSelectedRow({tgMechanic:value});
    setMecaCustomInput("");
    setShowMecaInput(false);
  };

  const applyRangeForSelectedRayon=()=>{
    if(!selectedRow) return;

    const from=weekOrder.get(activeWeek.id)??0;
    const to=weekOrder.get(rangeEndWeekId)??from;
    const [start,end]=from<=to?[from,to]:[to,from];

    setPlans((current)=>{
      const next=current.map((row)=>{
        const rowIndex=weekOrder.get(row.weekId)??-1;
        if(row.rayon!==selectedRow.rayon||rowIndex<start||rowIndex>end) return row;

        return withOperationState({
          ...row,
          gbProduct:selectedRow.gbProduct,
          tgResponsible:selectedRow.tgResponsible,
          tgProduct:selectedRow.tgProduct,
          tgQuantity:selectedRow.tgQuantity,
          tgMechanic:selectedRow.tgMechanic,
        });
      });

      next
        .filter((row)=>{
          const rowIndex=weekOrder.get(row.weekId)??-1;
          return row.rayon===selectedRow.rayon&&rowIndex>=start&&rowIndex<=end;
        })
        .forEach((row)=>{ persistRow(row, { immediate: true }); });

      return next;
    });
  };

  const copyPreviousWeek=()=>{
    const previousWeek=tgWeeks[activeWeekIndex-1];
    if(!previousWeek) return;

    const previousRowsByRayon=new Map(
      plans
        .filter((row)=>row.weekId===previousWeek.id)
        .map((row)=>[row.rayon,row]),
    );

    setPlans((current)=>{
      const next=current.map((row)=>{
        if(row.weekId!==activeWeek.id) return row;
        const previousRow=previousRowsByRayon.get(row.rayon);
        if(!previousRow) return row;

        return {
          ...row,
          gbProduct:previousRow.gbProduct,
          tgResponsible:previousRow.tgResponsible,
          tgProduct:previousRow.tgProduct,
          tgQuantity:previousRow.tgQuantity,
          tgMechanic:previousRow.tgMechanic,
          hasOperation:previousRow.hasOperation,
        };
      });

      next
        .filter((row)=>row.weekId===activeWeek.id)
        .forEach((row)=>{ persistRow(row, { immediate: true }); });

      return next;
    });
  };

  const clearSelectedRow=()=>updateSelectedRow({gbProduct:"",tgProduct:"",tgQuantity:"",tgMechanic:"",tgResponsible:selectedRow?.defaultResponsible??""});
  const goPrev=()=>{const p=tgWeeks[activeWeekIndex-1]; if(!p)return; setActiveWeekId(p.id); setRangeEndWeekId(p.id);};
  const goNext=()=>{const n=tgWeeks[activeWeekIndex+1]; if(!n)return; setActiveWeekId(n.id); setRangeEndWeekId(n.id);};

  const addRayon=()=>{
    const name=newRayonName.trim().toUpperCase();
    if(!name||orderedRayons.some((row)=>row.rayon===name)) return;

    const startWeekId=newRayonStartWeekId||activeWeek.id;
    const nextRayon:TgRayon={rayon:name,family:newRayonFamily,order:"0",active:true,startWeekId};
    const nextRayons=[...orderedRayons];

    if(newRayonPositionMode==="end"||!newRayonAnchor){
      nextRayons.push(nextRayon);
    } else {
      const anchorIndex=nextRayons.findIndex((row)=>row.rayon===newRayonAnchor);
      if(anchorIndex<0){
        nextRayons.push(nextRayon);
      } else {
        nextRayons.splice(newRayonPositionMode==="before"?anchorIndex:anchorIndex+1,0,nextRayon);
      }
    }

    const resequencedRayons=assignSequentialRayonOrders(nextRayons);
    const nextAssignments=newRayonResponsible
      ? [...assignments.filter((item)=>item.rayon!==name),{employee:newRayonResponsible,rayon:name}]
      : assignments;

    setRayons(resequencedRayons);
    setAssignments(nextAssignments);
    setPlans(normalizePlans(plans,resequencedRayons,buildAssignmentMap(nextAssignments)));
    setSelectedRayon(name);
    setNewRayonName("");
    setNewRayonResponsible("");
    setNewRayonStartWeekId(activeWeek.id);
  };

  const deleteSelectedRayon=()=>{
    if(!selectedRow) return;

    const rayonToDelete=selectedRow.rayon;
    const confirmed=window.confirm(`Supprimer le rayon "${rayonToDelete}" ?\n\nCette action supprimera ce rayon sur toute l'année (toutes les semaines), y compris ses données TG/GB.`);
    if(!confirmed) return;

    const nextRayons=assignSequentialRayonOrders(orderedRayons.filter((row)=>row.rayon!==rayonToDelete));
    const nextAssignments=assignments.filter((item)=>item.rayon!==rayonToDelete);
    const nextPlans=plans.filter((plan)=>plan.rayon!==rayonToDelete);

    setRayons(nextRayons);
    setAssignments(nextAssignments);
    setPlans(normalizePlans(nextPlans,nextRayons,buildAssignmentMap(nextAssignments)));
    setSelectedRayon(nextRayons[0]?.rayon??"");
  };

  const moveRayon=(rayonName:string,dir:-1|1)=>{
    const nextRayons=[...orderedRayons];
    const currentIndex=nextRayons.findIndex((row)=>row.rayon===rayonName);
    const targetIndex=currentIndex+dir;
    if(currentIndex<0||targetIndex<0||targetIndex>=nextRayons.length) return;

    const [movedRayon]=nextRayons.splice(currentIndex,1);
    nextRayons.splice(targetIndex,0,movedRayon);

    const resequencedRayons=assignSequentialRayonOrders(nextRayons);
    setRayons(resequencedRayons);
    setPlans(normalizePlans(plans,resequencedRayons,assignmentMap));
  };

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
        {tgSaveError ? <div style={{marginTop:8,fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"6px 10px"}}>⚠ {tgSaveError}</div> : null}
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

