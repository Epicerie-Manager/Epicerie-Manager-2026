"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getAbsencesUpdatedEventName,
  loadAbsenceRequests,
  syncAbsencesFromSupabase,
  syncPlanningStatusToAbsenceInSupabase,
} from "@/lib/absences-store";
import {
  getRhEmployeeRoleLabel,
  getRhEmployeeRoleMeta,
  isRhEmployeeCoordinatorRole,
} from "@/lib/rh-status";
import { defaultRhCycles, defaultRhEmployees } from "@/lib/rh-store";
import {
  defaultPlanningOverrides,
  defaultPlanningBinomes,
  defaultPlanningTriData,
  dismissPlanningUndo,
  formatPlanningDate,
  getPlanningUndoUpdatedEventName,
  loadPlanningHorairePresets,
  getPlanningMonthKey,
  loadLatestPlanningUndo,
  getPlanningUpdatedEventName,
  loadPlanningBinomes,
  loadPlanningOverrides,
  loadPlanningTriData,
  loadPlanningSyncStatus,
  normalizePlanningHoraireValue,
  savePlanningBinomeToSupabase,
  savePlanningOverridesToSupabase,
  savePlanningTriPairToSupabase,
  syncPlanningFromSupabase,
  undoLastPlanningAction,
  getPlanningSyncStatusUpdatedEventName,
} from "@/lib/planning-store";
import { getPlanningPresenceCountsForDate, getPlanningShiftBuckets } from "@/lib/planning-presence";
import {
  getPresenceCountLevel,
  getPresenceThresholdLevel,
} from "@/lib/presence-thresholds";
import {
  getPresenceThresholdsUpdatedEventName,
  loadPresenceThresholds,
  syncPresenceThresholdsFromSupabase,
} from "@/lib/presence-thresholds-store";
import { getRhUpdatedEventName, loadRhCycles, loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";
import { useUserRole } from "@/lib/use-user-role";

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

const MORNING_COORDINATOR_NAMES=new Set(["ABDOU"]);
const MORNING_GREEN_HIGHLIGHT_NAMES=new Set(["ABDOU"]);
const MORNING_BLUE_HIGHLIGHT_NAMES=new Set(["CECILE"]);
const AFTERNOON_COORDINATOR_NAMES=new Set(["MASSIMO"]);

const MONTH_SECTION_META = {
  morningCoordinators:{
    label:"Coordinateurs matin",
    desc:"Repères et responsables du matin",
    row:"#e8f7ec",
    sticky:"#d9f0df",
    border:"#b7dfc0",
    accent:"#2f8f57",
    text:"#2b7a49",
    nameBg:"rgba(255,255,255,0.66)",
    nameText:"#1f6b40",
    presentBg:"#cfeeda",
    presentBgStrong:"#b4e2c3",
    presentText:"#1f6b40",
    presentBorder:"#73b98c",
    count:"#2b7a49",
  },
  morningCollaborators:{
    label:"Collaborateurs matin",
    desc:"Équipe opérationnelle du matin",
    row:"#f4f9ff",
    sticky:"#edf6ff",
    border:"#d7e6f6",
    accent:V.mc,
    text:V.body,
    nameBg:"rgba(255,255,255,0.5)",
    nameText:"#1d5fa0",
    presentBg:"#dbeafe",
    presentBgStrong:"#bfdbfe",
    presentText:"#1d5fa0",
    presentBorder:"#89b5e3",
    count:V.mc,
  },
  afternoonCoordinators:{
    label:"Coordinateurs après-midi",
    desc:"Repères et responsables de l'après-midi",
    row:"#fff1e8",
    sticky:"#ffe8d7",
    border:"#f7cfae",
    accent:"#c2410c",
    text:"#9a3412",
    nameBg:"rgba(255,255,255,0.62)",
    nameText:"#9a3412",
    presentBg:"#ffedd5",
    presentBgStrong:"#fed7aa",
    presentText:"#9a3412",
    presentBorder:"#f59e0b",
    count:"#c2410c",
  },
  afternoonCollaborators:{
    label:"Collaborateurs après-midi",
    desc:"Équipe opérationnelle de l'après-midi",
    row:"#fff8f2",
    sticky:"#fff1e6",
    border:"#f5dec2",
    accent:V.orange,
    text:"#9a3412",
    nameBg:"rgba(255,255,255,0.56)",
    nameText:"#9a3412",
    presentBg:"#ffedd5",
    presentBgStrong:"#fed7aa",
    presentText:"#9a3412",
    presentBorder:"#f59e0b",
    count:"#c2410c",
  },
  students:{
    label:"Étudiants",
    desc:"Renforts et contrats étudiants",
    row:"#f8fafc",
    sticky:"#f1f5f9",
    border:"#dde5ee",
    accent:"#64748b",
    text:"#475569",
    nameBg:"rgba(255,255,255,0.58)",
    nameText:"#475569",
    presentBg:"#e2e8f0",
    presentBgStrong:"#cbd5e1",
    presentText:"#475569",
    presentBorder:"#94a3b8",
    count:"#475569",
  },
};
const MONTH_SECTION_ORDER=["morningCoordinators","morningCollaborators","afternoonCoordinators","afternoonCollaborators","students"];

const ST = {
  PRESENT:{c:"#166534",bg:"#dcfce7",l:"Présent",short:"P"},
  RH:{c:"#5b21b6",bg:"#ede9fe",l:"Repos hebdo",short:"RH"},
  CP:{c:"#b45309",bg:"#fef3c7",l:"Congé payé",short:"CP"},
  DEPLACEMENT_RH:{c:"#4338ca",bg:"#eef2ff",l:"Déplacement RH",short:"DEP RH"},
  MAL:{c:"#b91c1c",bg:"#fee2e2",l:"Maladie",short:"MAL"},
  ABS:{c:"#be185d",bg:"#fce7f3",l:"Absence",short:"ABS"},
  FORM:{c:"#1d4ed8",bg:"#dbeafe",l:"Formation",short:"FOR"},
  FERIE:{c:"#334155",bg:"#e2e8f0",l:"Jour férié",short:"FÉR"},
  X:{c:"#94a3b8",bg:"#f3f4f6",l:"Non travaillé",short:"X"},
  CONGE_MAT:{c:"#c2410c",bg:"#ffedd5",l:"Congé mat.",short:"C.M"},
};

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */
function getPlanningFallbackEmployees(){
  return defaultRhEmployees.map((employee)=>({
    n:employee.n,
    t:employee.t,
    hs:employee.hs,
    hm:employee.hm,
    obs:employee.obs||"",
    actif:Boolean(employee.actif),
  }));
}

function normalizePlanningEmployeeName(name){
  return String(name||"").trim().toUpperCase();
}

function getPlanningEmployeeRoleMeta(emp){
  return getRhEmployeeRoleMeta(emp?.obs,emp?.t);
}

function getPlanningEmployeeRoleLabel(emp){
  return getRhEmployeeRoleLabel(emp?.obs,emp?.t);
}

function isCoordinatorEmployee(emp){
  return isRhEmployeeCoordinatorRole(emp?.obs,emp?.t);
}

function isAbsenceStatus(status){
  return ["CP","MAL","CONGE_MAT","FORM","FERIE","DEPLACEMENT_RH","X","ABS"].includes(String(status||"").toUpperCase());
}

function isApprovedAbsenceStatus(status){
  return ["CP","MAL","CONGE_MAT","FORM","FERIE","DEPLACEMENT_RH","ABS"].includes(String(status||"").toUpperCase());
}

function comparePlanningEmployees(a,b){
  const nameA=normalizePlanningEmployeeName(a?.n);
  const nameB=normalizePlanningEmployeeName(b?.n);
  const rankA=nameA==="ABDOU"?0:nameA==="CECILE"?1:a?.t==="M"?2:nameA==="MASSIMO"?3:a?.t==="S"?4:a?.t==="E"?5:6;
  const rankB=nameB==="ABDOU"?0:nameB==="CECILE"?1:b?.t==="M"?2:nameB==="MASSIMO"?3:b?.t==="S"?4:b?.t==="E"?5:6;
  if(rankA!==rankB) return rankA-rankB;
  return nameA.localeCompare(nameB,"fr");
}

function sortPlanningEmployees(employees){
  return [...employees].sort(comparePlanningEmployees);
}

function matchesPlanningFilter(emp,filter){
  if(filter==="ALL") return true;
  if(filter==="M") return emp?.t==="M";
  if(filter==="S") return emp?.t==="S";
  if(filter==="E") return emp?.t==="E";
  return true;
}

function getPlanningMonthSectionId(emp){
  const name=normalizePlanningEmployeeName(emp?.n);
  if(emp?.t==="M"){
    return MORNING_COORDINATOR_NAMES.has(name)||isCoordinatorEmployee(emp) ? "morningCoordinators" : "morningCollaborators";
  }
  if(emp?.t==="S"){
    return AFTERNOON_COORDINATOR_NAMES.has(name)||isCoordinatorEmployee(emp) ? "afternoonCoordinators" : "afternoonCollaborators";
  }
  return "students";
}

function getPlanningMonthSections(filter){
  const grouped={
    morningCoordinators:[],
    morningCollaborators:[],
    afternoonCoordinators:[],
    afternoonCollaborators:[],
    students:[],
  };
  sortPlanningEmployees(EMPS.filter((emp)=>matchesPlanningFilter(emp,filter))).forEach((emp)=>{
    grouped[getPlanningMonthSectionId(emp)].push(emp);
  });
  return MONTH_SECTION_ORDER
    .map((id)=>({id,...MONTH_SECTION_META[id],employees:grouped[id]}))
    .filter((section)=>section.employees.length>0);
}

function getAllEmpNames(){
  return sortPlanningEmployees(EMPS.filter((e)=>e.t!=="E")).map((e)=>e.n);
}

let EMPS=getPlanningFallbackEmployees();
let CYCLE=Object.fromEntries(Object.entries(defaultRhCycles).map(([name, cycle])=>[name,[...cycle]]));

function syncPlanningDataFromRh(){
  const rhEmployees=loadRhEmployees();
  const rhCycles=loadRhCycles();
  if(Array.isArray(rhEmployees)&&rhEmployees.length){
    EMPS=rhEmployees.map((e)=>({
      n:e.n,
      t:e.t,
      hs:e.hs,
      hm:e.hm,
      obs:e.obs||"",
      actif:Boolean(e.actif),
    }));
  }
  if(rhCycles&&typeof rhCycles==="object"){
    CYCLE=rhCycles;
  }
}

const JL=["DIM","LUN","MAR","MER","JEU","VEN","SAM"];
const JL_FULL=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MOIS_FR=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JC_SHORT=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

function cloneTriDataForInit(){
  return Object.fromEntries(
    Object.entries(defaultPlanningTriData).map(([key, pair]) => [Number(key), [pair[0], pair[1]]]),
  );
}

function cloneBinomesForInit(){
  return defaultPlanningBinomes.map((pair)=>[pair[0],pair[1]]);
}

function cloneOverridesForInit(){
  return Object.fromEntries(
    Object.entries(defaultPlanningOverrides).map(([key, value]) => [key, { ...value }]),
  );
}

function getISOWeek(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-(t.getDay()+6)%7);const w=new Date(t.getFullYear(),0,4);return 1+Math.round(((t-w)/864e5-3+(w.getDay()+6)%7)/7);}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}

function getDefaultHoraire(emp,date){
  const dow=date.getDay();
  if(dow===2) return emp.hm;
  if(dow===6&&emp.t==="E") return "14h-21h30";
  return emp.hs;
}

function getStatus(emp,date,overrides){
  const key=`${emp.n}_${formatPlanningDate(date)}`;
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
  const key=`${emp.n}_${formatPlanningDate(date)}`;
  if(overrides[key]?.h) return overrides[key].h;
  return getDefaultHoraire(emp,date);
}

function isHoraireOverride(emp,date,overrides){
  const displayedHoraire=getHoraire(emp,date,overrides);
  const defaultHoraire=getDefaultHoraire(emp,date);
  return displayedHoraire!==defaultHoraire;
}

function isTriCaddie(name,dow,triData){const p=triData[dow];return p&&p.includes(name);}

function getPlanningDayPresence(date,overrides){
  return getPlanningPresenceCountsForDate(date,overrides,[],EMPS);
}

function getPlanningDayLevel(date,counts,thresholds){
  if(date.getDay()===0) return "ok";
  return getPresenceThresholdLevel({morning:counts.morningCount,afternoon:counts.afternoonCount},thresholds);
}

function getPlanningLevelColor(level){
  if(level==="critical") return V.red;
  if(level==="warning") return V.amber;
  return V.mc;
}

function getPlanningCountLevel(count,shift,thresholds){
  if(shift==="afternoon"){
    return getPresenceCountLevel(count,thresholds.warningAfternoon,thresholds.criticalAfternoon);
  }
  return getPresenceCountLevel(count,thresholds.warningMorning,thresholds.criticalMorning);
}

function getPendingPlanningStatus(absenceType){
  const upper=String(absenceType||"").toUpperCase().trim();
  if(upper==="CP") return "CP";
  if(upper==="MAL") return "MAL";
  if(upper==="CONGE_MAT") return "CONGE_MAT";
  if(upper==="FORM") return "FORM";
  if(upper==="FERIE") return "FERIE";
  if(upper==="DEPLACEMENT_RH") return "DEPLACEMENT_RH";
  return "ABS";
}

function listPendingPlanningDates(startDate,endDate){
  const current=new Date(`${startDate}T00:00:00`);
  const end=new Date(`${endDate||startDate}T00:00:00`);
  if(Number.isNaN(current.getTime())||Number.isNaN(end.getTime())) return [];
  const dates=[];
  while(current<=end){
    if(current.getDay()!==0) dates.push(formatPlanningDate(current));
    current.setDate(current.getDate()+1);
  }
  return dates;
}

function getPendingPlanningEmployees(employeeName){
  const normalized=normalizePlanningEmployeeName(employeeName);
  if(!normalized) return [];
  if(normalized==="TOUS") return EMPS.map((emp)=>normalizePlanningEmployeeName(emp.n));
  return [normalized];
}

function buildPendingAbsenceLookup(requests){
  const lookup=new Map();
  requests.forEach((request)=>{
    if(request?.status!=="en_attente") return;
    const status=getPendingPlanningStatus(request.type);
    const employees=getPendingPlanningEmployees(request.employee);
    const dates=listPendingPlanningDates(request.startDate,request.endDate);
    employees.forEach((employeeName)=>{
      dates.forEach((date)=>{
        lookup.set(`${employeeName}_${date}`,status);
      });
    });
  });
  return lookup;
}

function getPendingAbsenceStatusForDate(emp,date,pendingAbsenceLookup){
  return pendingAbsenceLookup.get(`${normalizePlanningEmployeeName(emp?.n)}_${formatPlanningDate(date)}`) || null;
}

function hasBlockingApprovedAbsence(emp,date,status,overrides){
  if(isApprovedAbsenceStatus(status)) return true;
  if(String(status||"").toUpperCase()!=="X") return false;
  const key=`${emp.n}_${formatPlanningDate(date)}`;
  return String(overrides[key]?.s||"").toUpperCase()==="X";
}

function getPendingCellStyles(statusConfig){
  return {
    color:statusConfig.c,
    background:`repeating-linear-gradient(135deg,rgba(255,255,255,0.72) 0px,rgba(255,255,255,0.72) 6px,rgba(255,255,255,0.16) 6px,rgba(255,255,255,0.16) 12px), ${statusConfig.bg}`,
    border:`1px dashed ${statusConfig.c}66`,
    boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.32)",
  };
}

function loadPendingAbsenceRequests(){
  return loadAbsenceRequests().filter((request)=>request.status==="en_attente");
}

function doesRequestOverlapPlanningRange(request,startIso,endIso){
  const requestStart=String(request?.startDate||"");
  const requestEnd=String(request?.endDate||requestStart);
  if(!requestStart) return false;
  return requestStart<=endIso&&requestEnd>=startIso;
}

function splitPlanningItemsInColumns(items,columnCount=2){
  const columnSize=Math.ceil(items.length/columnCount);
  return Array.from({length:columnCount},(_,index)=>items.slice(index*columnSize,(index+1)*columnSize));
}

function getDayGroups(date, overrides){
  const grouped={matin:[],soir:[],etu:[],absRH:[],absCP:[],absMAL:[],absOther:[]};
  EMPS.forEach((e)=>{
    const s=getStatus(e,date,overrides);
    if(s==="PRESENT"){
      if(e.t==="M") grouped.matin.push(e);
      else if(e.t==="S") grouped.soir.push(e);
      else grouped.etu.push(e);
      return;
    }
    if(s==="RH"){ grouped.absRH.push(e); return; }
    if(s==="CP"){ grouped.absCP.push(e); return; }
    if(s==="MAL"){ grouped.absMAL.push(e); return; }
    if(s!=="X") grouped.absOther.push({...e,statut:s});
  });
  grouped.matin=sortPlanningEmployees(grouped.matin);
  grouped.soir=sortPlanningEmployees(grouped.soir);
  grouped.etu=sortPlanningEmployees(grouped.etu);
  grouped.absRH=sortPlanningEmployees(grouped.absRH);
  grouped.absCP=sortPlanningEmployees(grouped.absCP);
  grouped.absMAL=sortPlanningEmployees(grouped.absMAL);
  grouped.absOther=sortPlanningEmployees(grouped.absOther);
  return grouped;
}

function getDayShiftGroups(date, overrides){
  const grouped={
    morning:[],
    morningStudents:[],
    afternoon:[],
    afternoonStudents:[],
    presentStudents:[],
    absRH:[],
    absCP:[],
    absMAL:[],
    absOther:[],
  };

  EMPS.forEach((e)=>{
    const status=getStatus(e,date,overrides);
    if(status==="PRESENT"){
      const horaire=getHoraire(e,date,overrides);
      const shifts=getPlanningShiftBuckets(horaire);
      const isStudent=e.t==="E";

      if(isStudent){
        grouped.presentStudents.push(e);
      }
      if(shifts.morning){
        (isStudent ? grouped.morningStudents : grouped.morning).push(e);
      }
      if(shifts.afternoon){
        (isStudent ? grouped.afternoonStudents : grouped.afternoon).push(e);
      }
      return;
    }
    if(status==="RH"){ grouped.absRH.push(e); return; }
    if(status==="CP"){ grouped.absCP.push(e); return; }
    if(status==="MAL"){ grouped.absMAL.push(e); return; }
    if(status!=="X") grouped.absOther.push({...e,statut:status});
  });

  grouped.morning=sortPlanningEmployees(grouped.morning);
  grouped.morningStudents=sortPlanningEmployees(grouped.morningStudents);
  grouped.afternoon=sortPlanningEmployees(grouped.afternoon);
  grouped.afternoonStudents=sortPlanningEmployees(grouped.afternoonStudents);
  grouped.presentStudents=sortPlanningEmployees(grouped.presentStudents);
  grouped.absRH=sortPlanningEmployees(grouped.absRH);
  grouped.absCP=sortPlanningEmployees(grouped.absCP);
  grouped.absMAL=sortPlanningEmployees(grouped.absMAL);
  grouped.absOther=sortPlanningEmployees(grouped.absOther);
  return grouped;
}

/* ═══════════════════════════════════════════════════════════
   UI PRIMITIVES
   ═══════════════════════════════════════════════════════════ */
const Card=({children,style})=>(<div style={{background:V.card,backdropFilter:"blur(12px)",border:`1px solid ${V.border}`,borderRadius:20,boxShadow:V.shadow,padding:22,...style}}>{children}</div>);
const Kicker=({label,icon})=>(<div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:10,background:V.mM,color:V.mD,fontSize:11,fontWeight:700,letterSpacing:"0.04em"}}>{icon}<span>{label}</span></div>);
const KPI=({value,label,color,gradient})=>(<div style={{borderRadius:16,padding:"16px 12px",textAlign:"center",background:gradient}}><strong style={{display:"block",fontSize:28,lineHeight:1,marginBottom:4,fontWeight:800,color}}>{value}</strong><span style={{fontSize:11,fontWeight:600,color:color+"99"}}>{label}</span></div>);
const Chev=({dir,onClick})=>(<button onClick={onClick} style={{width:36,height:36,borderRadius:10,background:V.mL,border:`1px solid ${V.mc}15`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={dir==="l"?"15 18 9 12 15 6":"9 18 15 12 9 6"}/></svg></button>);
const CalIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const CartIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
const LinkIcon=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.mc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const EditIcon=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const RoleDot=({emp,size=8,ringColor})=>{
  const roleMeta=getPlanningEmployeeRoleMeta(emp);
  return <span title={`Statut RH : ${roleMeta.label}`} style={{width:size,height:size,borderRadius:99,background:roleMeta.color,boxShadow:ringColor?`0 0 0 2px ${ringColor}`:"none",flexShrink:0}}/>;
};

const Legend=()=>(<div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 0"}}>{Object.entries(ST).filter(([k])=>k!=="X").map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}><div style={{width:10,height:10,borderRadius:3,background:v.c,opacity:0.8}}/>{v.l}</div>))}<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}><div style={{width:14,height:12,borderRadius:4,...getPendingCellStyles({c:"#475569",bg:"#f8fafc"})}}/>Demande en attente</div><div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:12,borderRadius:4,background:`${V.amber}12`,border:`1px solid ${V.amber}30`}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={V.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></span>Tri caddie</div></div>);

const EditScopeOption=({value,label,desc,scope,setScope})=>(
  <label onClick={()=>setScope(value)} style={{
    display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,cursor:"pointer",
    background:scope===value?"#f8fafc":"transparent",
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

/* ═══════════════════════════════════════════════════════════
   EDIT CELL MODAL — statut + horaire ponctuel
   ═══════════════════════════════════════════════════════════ */
const EditCellModal=({empName,date,currentStatut,currentHoraire,defaultHoraire,monthLabel,horaireOptions,onSave,onClose})=>{
  const [s,setS]=useState(currentStatut);
  const [h,setH]=useState(()=>normalizePlanningHoraireValue(currentHoraire||""));
  const [scope,setScope]=useState("default"); // "default" | "jour" | "mois"
  const dn=date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  const normalizedHoraireOptions=useMemo(()=>{
    const values = new Set();
    (horaireOptions||[]).forEach((value)=>{
      const normalized = normalizePlanningHoraireValue(value);
      if(normalized) values.add(normalized);
    });
    [defaultHoraire,currentHoraire].forEach((value)=>{
      const normalized = normalizePlanningHoraireValue(value);
      if(normalized) values.add(normalized);
    });
    return Array.from(values);
  },[horaireOptions,defaultHoraire,currentHoraire]);
  const normalizedSelectedHoraire=normalizePlanningHoraireValue(h);
  const selectedPresetValue=normalizedHoraireOptions.includes(normalizedSelectedHoraire)?normalizedSelectedHoraire:"";
  const applyHoraireValue=(value)=>{
    setH(value);
    if(normalizePlanningHoraireValue(value)&&s==="X") setS("PRESENT");
  };

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
              <EditScopeOption value="default" scope={scope} setScope={setScope}
                label="Garder l'horaire par défaut"
                desc="L'horaire RH s'applique normalement"/>
              <EditScopeOption value="jour" scope={scope} setScope={setScope}
                label="Modifier pour ce jour uniquement"
                desc={`Exception ponctuelle le ${dn}`}/>
              <EditScopeOption value="mois" scope={scope} setScope={setScope}
                label={`Modifier pour tout ${monthLabel}`}
                desc="Applique le nouvel horaire sur tous les jours présent du mois"/>
            </div>

            {(scope==="jour"||scope==="mois")&&(
              <div style={{marginTop:10}}>
                <div style={{display:"grid",gap:8}}>
                  <select
                    value={selectedPresetValue}
                    onChange={e=>applyHoraireValue(e.target.value)}
                    style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`2px solid ${V.line}`,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",background:"#fff",color:selectedPresetValue?V.body:V.light}}
                  >
                    <option value="">Choisir un créneau déjà utilisé</option>
                    {normalizedHoraireOptions.map((value)=>(
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <input
                    value={h}
                    onChange={e=>applyHoraireValue(e.target.value)}
                    placeholder="Saisir un nouveau créneau si besoin"
                    style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`2px solid ${V.mc}30`,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",background:"#fff"}}
                  />
                </div>
                <div style={{fontSize:10,color:V.light,marginTop:4}}>
                  Le créneau saisi sera normalisé et réutilisable ensuite dans la liste.
                </div>
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

const UndoToast=({snapshot,busy,onUndo,onDismiss})=>{
  if(!snapshot) return null;
  return(
    <>
      <div style={{
        position:"fixed",
        left:"50%",
        bottom:24,
        transform:"translateX(-50%)",
        zIndex:90,
        width:"min(520px, calc(100vw - 32px))",
        borderRadius:18,
        background:"rgba(15,23,42,0.95)",
        color:"#fff",
        boxShadow:"0 18px 42px rgba(15,23,42,0.28)",
        overflow:"hidden",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:14,justifyContent:"space-between",padding:"14px 16px 12px"}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"#f8fafc"}}>Planning modifié</div>
            <div style={{marginTop:4,fontSize:12,color:"rgba(226,232,240,0.92)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{snapshot.label}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <button type="button" onClick={onUndo} disabled={busy} style={{border:"none",background:"transparent",color:"#f87171",fontSize:13,fontWeight:800,cursor:busy?"default":"pointer",padding:0}}>
              {busy?"Annulation...":"Annuler"}
            </button>
            <button type="button" onClick={onDismiss} style={{border:"none",background:"transparent",color:"rgba(226,232,240,0.7)",fontSize:18,lineHeight:1,cursor:"pointer",padding:0}}>
              ×
            </button>
          </div>
        </div>
        <div style={{height:3,background:"rgba(255,255,255,0.08)"}}>
          <div style={{
            height:"100%",
            width:"100%",
            background:"linear-gradient(90deg,#d40511,#fb7185)",
            transformOrigin:"left center",
            animation:"planningUndoCountdown 15s linear forwards",
          }}/>
        </div>
      </div>
      <style jsx>{`
        @keyframes planningUndoCountdown {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   VUE MOIS — with hours displayed
   ═══════════════════════════════════════════════════════════ */
const VueMois=({year,month,filter,overrides,triData,pendingAbsenceLookup,presenceThresholds,onEdit,readOnly})=>{
  const days=daysInMonth(year,month);
  const dates=Array.from({length:days},(_,i)=>new Date(year,month,i+1));
  const sections=getPlanningMonthSections(filter);
  const todayS=formatPlanningDate(new Date());
  const totalColumns=dates.length+2;
  const [selectedEmployeeName,setSelectedEmployeeName]=useState(null);
  const [hoveredDayIso,setHoveredDayIso]=useState(null);

  const getCellHighlightStyle=(isRowSelected,isColumnHovered)=>({
    boxShadow:[
      isRowSelected?"inset 0 0 0 9999px rgba(37,99,235,0.16)":null,
      isColumnHovered?"inset 0 0 0 9999px rgba(14,116,144,0.10)":null,
    ].filter(Boolean).join(","),
  });

  return(
    <div style={{overflowX:"auto"}} onMouseLeave={()=>setHoveredDayIso(null)}>
      <table style={{borderCollapse:"collapse",width:"100%",minWidth:1200}}>
        <thead>
          <tr style={{background:"#f8fafc"}}>
            <th style={{padding:"8px 8px",fontSize:11,fontWeight:700,color:V.light,textAlign:"left",borderBottom:`2px solid ${V.line}`,position:"sticky",left:0,background:"#f8fafc",zIndex:3,minWidth:85}}>Employé</th>
            {dates.map(d=>{
              const dayIso=formatPlanningDate(d);
              const dow=d.getDay();const isWeekend=dow===0||dow===6;const isT=dayIso===todayS;
              const isHovered=hoveredDayIso===dayIso;
              return(<th key={d.getDate()} onMouseEnter={()=>setHoveredDayIso(dayIso)} style={{
                padding:"6px 2px",
                fontSize:10,
                fontWeight:isT?800:700,
                textAlign:"center",
                borderBottom:isT?"2px solid #16a34a":`2px solid ${V.line}`,
                borderTop:isT?"2px solid #16a34a":"2px solid transparent",
                borderLeft:isT?"2px solid #16a34a":"none",
                borderRight:isT?"2px solid #16a34a":"none",
                minWidth:68,
                color:isT?V.mc:isWeekend?V.mc+"90":V.light,
                background:isHovered?"rgba(14,116,144,0.08)":"transparent",
                boxShadow:isHovered?"inset 0 0 0 1px rgba(14,116,144,0.16)":"none",
              }}>
                <div style={{fontSize:9,color:isT?V.mc:isWeekend?V.mc+"70":V.light,fontWeight:700}}>{JC_SHORT[dow]}</div>{d.getDate()}
              </th>);
            })}
            <th style={{padding:"8px 4px",fontSize:10,fontWeight:700,color:V.mc,textAlign:"center",borderBottom:`2px solid ${V.line}`,position:"sticky",right:0,background:"#f8fafc",zIndex:3,minWidth:30}}>Jrs</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{background:"#f8fafc"}}>
            <td style={{padding:"6px 8px",fontSize:10,fontWeight:800,borderTop:`2px solid ${V.line}`,borderBottom:`1px solid ${V.line}`,position:"sticky",left:0,background:"#f8fafc",zIndex:2,color:V.mc,minWidth:128}}>
              <div style={{display:"grid",gridTemplateColumns:"auto auto",columnGap:8,rowGap:3,alignItems:"center",lineHeight:1}}>
                <span style={{gridRow:"1 / span 2",fontSize:10,fontWeight:800,color:V.mc}}>EFFECTIF</span>
                <span style={{fontSize:9,fontWeight:800,color:V.mc}}>matin</span>
                <span style={{fontSize:9,fontWeight:800,color:V.purple}}>après-midi</span>
              </div>
            </td>
            {dates.map(date=>{
              const dayIso=formatPlanningDate(date);
              const isT=dayIso===todayS;
              const isHovered=hoveredDayIso===dayIso;
              const counts=getPlanningDayPresence(date,overrides);
              const dayLevel=getPlanningDayLevel(date,counts,presenceThresholds);
              const morningLevel=getPlanningCountLevel(counts.morningCount,"morning",presenceThresholds);
              const afternoonLevel=getPlanningCountLevel(counts.afternoonCount,"afternoon",presenceThresholds);
              return(<td key={date.getDate()} onMouseEnter={()=>setHoveredDayIso(dayIso)} style={{
                textAlign:"center",
                padding:"4px 0",
                borderTop:isT?"2px solid #16a34a":`2px solid ${V.line}`,
                borderBottom:isT?"2px solid #16a34a":`1px solid ${V.line}`,
                borderLeft:isT?"2px solid #16a34a":"none",
                borderRight:isT?"2px solid #16a34a":"none",
                background:dayLevel==="critical"?"#fef2f2":dayLevel==="warning"?"#fff7ed":"#f8fafc",
                ...getCellHighlightStyle(false,isHovered),
              }}>
                <div style={{fontSize:11,fontWeight:800,color:getPlanningLevelColor(morningLevel),lineHeight:1.05}}>{counts.morningCount}</div>
                <div style={{fontSize:10,fontWeight:800,color:getPlanningLevelColor(afternoonLevel),lineHeight:1.05,marginTop:4}}>{counts.afternoonCount}</div>
              </td>);
            })}
            <td style={{borderTop:`2px solid ${V.line}`,borderBottom:`1px solid ${V.line}`,position:"sticky",right:0,background:"#f8fafc"}}/>
          </tr>
          {sections.map((section)=>(
            <Fragment key={section.id}>
              <tr>
                <td colSpan={totalColumns} style={{
                  padding:"7px 10px",
                  fontSize:10,
                  fontWeight:800,
                  letterSpacing:"0.04em",
                  color:section.text,
                  background:section.sticky,
                  borderTop:`2px solid ${section.border}`,
                  borderBottom:`1px solid ${section.border}`,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{width:8,height:8,borderRadius:99,background:section.accent,flexShrink:0}}/>
                    <span>{section.label.toUpperCase()}</span>
                    <span style={{fontSize:10,fontWeight:600,color:`${section.text}B5`}}>{section.desc}</span>
                  </div>
                </td>
              </tr>
              {section.employees.map((emp)=>{
                let presCount=0;
                const isRowSelected=selectedEmployeeName===emp.n;
                const isCoordinator=isCoordinatorEmployee(emp);
                const isCoordinatorSection=section.id==="morningCoordinators"||section.id==="afternoonCoordinators";
                const normalizedEmployeeName=normalizePlanningEmployeeName(emp.n);
                const isMorningGreenHighlight=MORNING_GREEN_HIGHLIGHT_NAMES.has(normalizedEmployeeName);
                const isMorningBlueHighlight=MORNING_BLUE_HIGHLIGHT_NAMES.has(normalizedEmployeeName);
                const rowBackground=section.row;
                const stickyBackground=section.sticky;
                const rowBorder=section.border;
                const roleMeta=getPlanningEmployeeRoleMeta(emp);
                const highlightedNameMeta=isMorningGreenHighlight
                  ? MONTH_SECTION_META.morningCoordinators
                  : isMorningBlueHighlight
                    ? {
                      nameBg:"linear-gradient(135deg,#dbeafe,#bfdbfe)",
                      nameText:"#143f6b",
                      border:"#7aa2d6",
                    }
                    : section;
                return(
                  <tr key={emp.n} style={{opacity:emp.actif?1:0.5,background:rowBackground}}>
                    <td style={{padding:"6px 8px",fontSize:11,fontWeight:700,borderBottom:`1px solid ${rowBorder}`,position:"sticky",left:0,background:isRowSelected?"#d8eafe":stickyBackground,zIndex:2,whiteSpace:"nowrap"}}>
                      <button
                        type="button"
                        onClick={()=>setSelectedEmployeeName((current)=>current===emp.n?null:emp.n)}
                        style={{
                        display:"flex",
                        alignItems:"center",
                        gap:7,
                        padding:isCoordinatorSection||isCoordinator?"4px 8px":"3px 6px",
                        borderRadius:8,
                        background:isRowSelected?"linear-gradient(135deg,#93c5fd,#60a5fa)":highlightedNameMeta.nameBg,
                        color:isRowSelected?"#0b3b75":highlightedNameMeta.nameText,
                        border:`1px solid ${isRowSelected?V.mc:(isMorningGreenHighlight||isMorningBlueHighlight)?highlightedNameMeta.border:rowBorder}`,
                        boxShadow:isRowSelected?"0 0 0 3px rgba(29,95,160,0.22), 0 6px 14px rgba(29,95,160,0.12)":isMorningBlueHighlight?"0 0 0 1px rgba(255,255,255,0.45) inset":"none",
                        width:"100%",
                        textAlign:"left",
                        cursor:"pointer",
                        outline:"none",
                        fontSize:"inherit",
                        fontWeight:700,
                        fontFamily:"inherit",
                      }} title={`Statut RH : ${roleMeta.label}`}>
                        <RoleDot emp={emp} size={7} ringColor={rowBackground}/>
                        {emp.n}
                      </button>
                    </td>
                    {dates.map(date=>{
                      const dow=date.getDay();
                      const dayIso=formatPlanningDate(date);
                      const s=getStatus(emp,date,overrides);
                      const sc=ST[s]||ST.X;
                      const pendingStatus=getPendingAbsenceStatusForDate(emp,date,pendingAbsenceLookup);
                      const hasPendingDisplay=Boolean(pendingStatus)&&!hasBlockingApprovedAbsence(emp,date,s,overrides);
                      const pendingConfig=hasPendingDisplay?(ST[pendingStatus]||ST.ABS):null;
                      const h=s==="PRESENT"?getHoraire(emp,date,overrides):null;
                      const isCustomH=s==="PRESENT"&&isHoraireOverride(emp,date,overrides);
                      const triC=isTriCaddie(emp.n,dow,triData);
                      const isT=dayIso===todayS;
                      const isColumnHovered=hoveredDayIso===dayIso;
                      if(s==="PRESENT") presCount++;

                      return(
                        <td key={date.getDate()} onMouseEnter={()=>setHoveredDayIso(dayIso)} onClick={readOnly?undefined:()=>onEdit(emp,date)} style={{
                          padding:"4px 2px",textAlign:"center",borderBottom:`1px solid ${rowBorder}`,cursor:readOnly?"default":"pointer",
                          background:rowBackground,position:"relative",
                          borderLeft:isT?"2px solid #16a34a":"none",
                          borderRight:isT?"2px solid #16a34a":"none",
                          ...getCellHighlightStyle(isRowSelected,isColumnHovered),
                        }}>
                          {hasPendingDisplay?(
                            <div title={`Demande en attente — ${pendingConfig.l}`} style={{
                              fontSize:8,fontWeight:800,borderRadius:6,padding:"4px 2px",lineHeight:1.2,
                              ...getPendingCellStyles(pendingConfig),
                            }}>
                              {pendingConfig.short}
                            </div>
                          ):s==="PRESENT"?(
                            <div style={{
                              fontSize:8,fontWeight:700,color:section.presentText,
                              background:isCustomH?section.presentBgStrong:section.presentBg,
                              borderRadius:6,padding:"4px 2px",lineHeight:1.2,
                              border:triC?`1px solid ${V.amber}70`:isCustomH?`1px solid ${section.presentBorder}7a`:`1px solid ${section.presentBorder}42`,
                              boxShadow:isT?`0 0 0 1px ${section.presentBorder}1f`:isCustomH?"inset 0 0 0 1px rgba(255,255,255,0.35)":"none",
                            }}>
                              {h||"P"}
                              {triC&&(
                                <span style={{
                                  display:"inline-flex",
                                  alignItems:"center",
                                  justifyContent:"center",
                                  width:14,
                                  height:10,
                                  margin:"2px auto 0",
                                  borderRadius:4,
                                  background:`${V.amber}12`,
                                  border:`1px solid ${V.amber}30`,
                                }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={V.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="9" cy="21" r="1"/>
                                    <circle cx="20" cy="21" r="1"/>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                                  </svg>
                                </span>
                              )}
                            </div>
                          ):(
                            <div style={{
                              fontSize:8,fontWeight:800,color:sc.c,
                              background:sc.bg,borderRadius:6,padding:"4px 2px",
                              border:`1px solid ${sc.c}35`,lineHeight:1.2,
                            }}>
                              {sc.short}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{padding:"4px 4px",fontSize:11,fontWeight:800,textAlign:"center",borderBottom:`1px solid ${rowBorder}`,color:section.count,position:"sticky",right:0,background:isRowSelected?"#d8eafe":stickyBackground,zIndex:2}}>
                      {presCount||""}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VUE SEMAINE
   ═══════════════════════════════════════════════════════════ */
const VueSemaine=({weekStart,overrides,triData,presenceThresholds,onEdit,readOnly})=>{
  const days=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const todayS=formatPlanningDate(new Date());

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>
      {days.map(date=>{
        const dow=date.getDay();const isT=formatPlanningDate(date)===todayS;
        const presentEmployees=sortPlanningEmployees(EMPS.filter(e=>getStatus(e,date,overrides)==="PRESENT"));
        const matP=presentEmployees.filter(e=>getPlanningShiftBuckets(getHoraire(e,date,overrides)).morning);
        const apmP=presentEmployees.filter(e=>getPlanningShiftBuckets(getHoraire(e,date,overrides)).afternoon);
        const absents=sortPlanningEmployees(EMPS.filter(e=>e.actif&&!["PRESENT","X"].includes(getStatus(e,date,overrides))));
        const triPair=triData[dow];
        const counts=getPlanningDayPresence(date,overrides);
        const dayLevel=getPlanningDayLevel(date,counts,presenceThresholds);
        const alert=dayLevel!=="ok";
        const morningLevel=getPlanningCountLevel(counts.morningCount,"morning",presenceThresholds);
        const afternoonLevel=getPlanningCountLevel(counts.afternoonCount,"afternoon",presenceThresholds);

        return(
          <Card key={date.getDate()} style={{padding:12,borderTop:isT?`3px solid ${V.mc}`:alert?`3px solid ${getPlanningLevelColor(dayLevel)}`:`3px solid transparent`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:isT?V.mc:V.body}}>{JL_FULL[dow]}</div>
                <div style={{fontSize:20,fontWeight:800,color:isT?V.mc:V.body}}>{date.getDate()}</div>
              </div>
              {isT&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:V.mc,padding:"2px 8px",borderRadius:6}}>Auj.</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:8}}>
              <div style={{borderRadius:6,padding:"5px",background:V.mG,textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:getPlanningLevelColor(morningLevel)}}>{counts.morningCount}</div>
                <div style={{fontSize:8,fontWeight:700,color:V.light}}>MATIN</div>
              </div>
              <div style={{borderRadius:6,padding:"5px",background:"linear-gradient(135deg,#f5f2fe,#faf8ff)",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:getPlanningLevelColor(afternoonLevel)}}>{counts.afternoonCount}</div>
                <div style={{fontSize:8,fontWeight:700,color:V.light}}>APRÈS-MIDI</div>
              </div>
            </div>
            {/* Présents */}
            <div style={{fontSize:9,fontWeight:700,color:V.light,marginBottom:3}}>PRÉSENTS</div>
            <div style={{display:"grid",gap:4,marginBottom:6}}>
              {[{label:"MATIN",list:matP,color:V.mc,bg:"#eff6ff"},{label:"APRÈS-MIDI",list:apmP,color:V.purple,bg:"#f5f3ff"}].map(group=>(
                <div key={group.label}>
                  <div style={{fontSize:8,fontWeight:700,color:group.color,marginBottom:3}}>{group.label}</div>
                  {group.list.length?(
                    <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                      {group.list.map(e=>{
                        const roleMeta=getPlanningEmployeeRoleMeta(e);
                        return(
                        <span key={`${group.label}-${e.n}`} onClick={readOnly?undefined:()=>onEdit(e,date)} style={{
                          display:"inline-flex",alignItems:"center",gap:4,
                          fontSize:8,fontWeight:600,color:isCoordinatorEmployee(e)?V.mc:V.body,background:isCoordinatorEmployee(e)?"#e7f0fb":group.bg,padding:"2px 5px",borderRadius:4,cursor:readOnly?"default":"pointer",
                          border:isTriCaddie(e.n,dow,triData)?`1px solid ${V.amber}`:"1px solid transparent",
                        }} title={`Statut RH : ${roleMeta.label}`}><RoleDot emp={e} size={6}/>{e.n}</span>
                      );})}
                    </div>
                  ):(
                    <div style={{fontSize:8,color:V.light}}>Aucun présent</div>
                  )}
                </div>
              ))}
            </div>
            {absents.length>0&&(<>
              <div style={{fontSize:9,fontWeight:700,color:V.red,marginBottom:3}}>ABSENTS</div>
              <div style={{display:"flex",flexDirection:"column",gap:1,marginBottom:6}}>
                {absents.slice(0,4).map(e=>{const s=getStatus(e,date,overrides);const sc=ST[s];const roleMeta=getPlanningEmployeeRoleMeta(e);return(
                  <div key={e.n} style={{fontSize:8,padding:"2px 5px",borderRadius:4,background:sc.bg,color:sc.c,fontWeight:700,display:"flex",justifyContent:"space-between"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}} title={`Statut RH : ${roleMeta.label}`}><RoleDot emp={e} size={6}/>{e.n}</span><span>{sc.short}</span>
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
const VueJour=({date,overrides,triData,binomes,presenceThresholds,onEdit,readOnly})=>{
  const dow=date.getDay();const dayLabel=date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const todayS=formatPlanningDate(new Date());const isT=formatPlanningDate(date)===todayS;
  const grouped=getDayShiftGroups(date,overrides);
  const triPair=triData[dow];
  const counts=getPlanningDayPresence(date,overrides);
  const dayLevel=getPlanningDayLevel(date,counts,presenceThresholds);
  const alert=dayLevel!=="ok";
  const morningLevel=getPlanningCountLevel(counts.morningCount,"morning",presenceThresholds);
  const afternoonLevel=getPlanningCountLevel(counts.afternoonCount,"afternoon",presenceThresholds);

  const EmpCard=({e,horaire,tri})=>{
    const isCoordinator=isCoordinatorEmployee(e);
    return(
    <div onClick={readOnly?undefined:()=>onEdit(e,date)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:isCoordinator?"#f3f8ff":"rgba(248,250,252,0.6)",border:`1px solid ${isCoordinator?`${V.mc}25`:V.border}`,cursor:readOnly?"default":"pointer",borderLeft:tri?`3px solid ${V.amber}`:isCoordinator?`3px solid ${V.mc}`:"3px solid transparent"}}
      onMouseEnter={readOnly?undefined:(ev=>ev.currentTarget.style.background=isCoordinator?"#eaf3fe":V.mL)} onMouseLeave={readOnly?undefined:(ev=>ev.currentTarget.style.background=isCoordinator?"#f3f8ff":"rgba(248,250,252,0.6)")}>
      <div style={{width:32,height:32,borderRadius:10,background:isCoordinator?"#dbeafe":V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:V.mc}}>{e.n.substring(0,2)}</div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:isCoordinator?V.mc:V.body}}>
          <RoleDot emp={e} size={8}/>
          <span>{e.n}</span>
        </div>
        <div style={{fontSize:11,color:V.muted}}>{getPlanningEmployeeRoleLabel(e)}{tri?" — Tri caddie":""}</div>
      </div>
      {horaire&&<span style={{fontSize:12,fontWeight:700,color:V.mc,background:V.mL,padding:"4px 10px",borderRadius:8}}>{horaire}</span>}
    </div>
  );};

  const renderTeamSection=({label,employees,students,triEnabled=false})=>(
    <Card style={{marginTop:label==="ÉQUIPE MATIN"?0:14}}>
      <Kicker label={label} icon={CalIcon}/>
      <div style={{display:"grid",gap:6,marginTop:12}}>
        {employees.map(e=><EmpCard key={`${label}-${e.n}`} e={e} horaire={getHoraire(e,date,overrides)} tri={triEnabled&&isTriCaddie(e.n,dow,triData)}/>)}
        {students.length>0&&(
          <div style={{marginTop:employees.length?8:0}}>
            <div style={{fontSize:10,fontWeight:700,color:V.cyan,letterSpacing:"0.05em",marginBottom:6}}>ÉTUDIANTS</div>
            <div style={{display:"grid",gap:6}}>
              {students.map(e=><EmpCard key={`${label}-student-${e.n}`} e={e} horaire={getHoraire(e,date,overrides)}/>)}
            </div>
          </div>
        )}
        {employees.length===0&&students.length===0&&(
          <div style={{padding:16,textAlign:"center",color:V.light}}>Aucun présent sur ce créneau</div>
        )}
      </div>
    </Card>
  );

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
        <div style={{fontSize:22,fontWeight:800,color:isT?V.mc:V.body}}>{dayLabel}</div>
        {isT&&<span style={{fontSize:11,fontWeight:700,color:"#fff",background:V.mc,padding:"4px 12px",borderRadius:8}}>Aujourd&apos;hui</span>}
        {alert&&<span style={{fontSize:11,fontWeight:700,color:getPlanningLevelColor(dayLevel),background:dayLevel==="critical"?"#fef2f2":"#fff7ed",padding:"4px 12px",borderRadius:8}}>{dayLevel==="critical"?"Seuil critique":"Sous-effectif"}</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <KPI value={counts.morningCount} label="Matin" color={getPlanningLevelColor(morningLevel)} gradient={morningLevel==="ok"?V.mG:"linear-gradient(135deg,#fef1f2,#fff8f8)"}/>
        <KPI value={counts.afternoonCount} label="Après-midi" color={getPlanningLevelColor(afternoonLevel)} gradient={afternoonLevel==="ok"?"linear-gradient(135deg,#f5f2fe,#faf8ff)":"linear-gradient(135deg,#fff7ed,#fffaf5)"}/>
        <KPI value={grouped.presentStudents.length} label="Étudiants" color={grouped.presentStudents.length>0?V.cyan:"#9ca3af"} gradient={grouped.presentStudents.length>0?"linear-gradient(135deg,#effcfd,#f7feff)":"linear-gradient(135deg,#f5f7fa,#fafbfc)"}/>
        <KPI value={grouped.absRH.length+grouped.absCP.length+grouped.absMAL.length+grouped.absOther.length} label="Absents" color={V.red} gradient="linear-gradient(135deg,#fef1f2,#fff8f8)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <div>
          {renderTeamSection({label:"ÉQUIPE MATIN",employees:grouped.morning,students:grouped.morningStudents,triEnabled:true})}
          {renderTeamSection({label:"ÉQUIPE APRÈS-MIDI",employees:grouped.afternoon,students:grouped.afternoonStudents})}
        </div>
        <div>
          <Card><Kicker label="ABSENTS DU JOUR" icon={CalIcon}/>
            <div style={{display:"grid",gap:6,marginTop:12}}>
              {[{l:"Repos hebdo",list:grouped.absRH,sc:ST.RH},{l:"Congés",list:grouped.absCP,sc:ST.CP},{l:"Maladie",list:grouped.absMAL,sc:ST.MAL},{l:"Autres",list:grouped.absOther,sc:ST.ABS}].filter(g=>g.list.length>0).map(g=>(
                <div key={g.l}>
                  <div style={{fontSize:10,fontWeight:700,color:g.sc.c,marginBottom:3}}>{g.l.toUpperCase()}</div>
                  {g.list.map(e=>(<div key={e.n} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:10,background:g.sc.bg,marginBottom:2,border:`1px solid ${g.sc.c}15`}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:V.body}}><RoleDot emp={e} size={7}/>{e.n}</span><span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:g.sc.c}}>{g.sc.l}</span></div>))}
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
  const { isReadOnly, loading: roleLoading } = useUserRole();
  const searchParams = useSearchParams();
  const [,setRhVersion]=useState(0);
  const [view,setView]=useState("mois");  const [year,setYear]=useState(null);
  const [month,setMonth]=useState(null);
  const [selectedDate,setSelectedDate]=useState(null);  const [filter,setFilter]=useState("ALL");
  const [overrides,setOverrides]=useState(()=>cloneOverridesForInit()); // key: "NAME_2026-03-20" → {s:"CP",h:"6h-13h"}
  const [editing,setEditing]=useState(null);
  const [triData,setTriData]=useState(()=>cloneTriDataForInit());
  const [binomes,setBinomes]=useState(()=>cloneBinomesForInit());
  const [editTri,setEditTri]=useState(null); // dow number
  const [editBinome,setEditBinome]=useState(null); // index
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [undoToast,setUndoToast]=useState(()=>loadLatestPlanningUndo());
  const [undoBusy,setUndoBusy]=useState(false);
  const [pendingRequests,setPendingRequests]=useState(()=>loadPendingAbsenceRequests());
  const [presenceThresholds,setPresenceThresholds]=useState(()=>loadPresenceThresholds());
  const [planningBootReady,setPlanningBootReady]=useState(()=>loadRhEmployees().length>0);
  const [planningSyncStatus,setPlanningSyncStatus]=useState(()=>loadPlanningSyncStatus());
  const activeMonthKey=useMemo(()=>{
    if(year===null || month===null) return getPlanningMonthKey(new Date());
    return getPlanningMonthKey(new Date(year,month,1));
  },[year,month]);

  useEffect(()=>{
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(now);
  },[]);

  useEffect(()=>{
    const requestedView = searchParams.get("view");
    const requestedDate = searchParams.get("date");
    if(!requestedView && !requestedDate) return;

    if(requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)){
      const parsedDate = new Date(`${requestedDate}T12:00:00`);
      if(!Number.isNaN(parsedDate.getTime())){
        setSelectedDate(parsedDate);
        setYear(parsedDate.getFullYear());
        setMonth(parsedDate.getMonth());
      }
    }

    if(requestedView==="mois"||requestedView==="semaine"||requestedView==="jour"){
      setView(requestedView);
    }
  },[searchParams]);

  useEffect(()=>{
    if(!selectedDate || view==="mois") return;
    const nextYear=selectedDate.getFullYear();
    const nextMonth=selectedDate.getMonth();
    setYear((current)=>current===nextYear?current:nextYear);
    setMonth((current)=>current===nextMonth?current:nextMonth);
  },[selectedDate,view]);

  useEffect(()=>{
    setOverrides(loadPlanningOverrides());
    syncPlanningDataFromRh();
    setRhVersion((v)=>v+1);
    const eventName=getRhUpdatedEventName();
    const onRhUpdate=()=>{
      syncPlanningDataFromRh();
      setRhVersion((v)=>v+1);
    };
    window.addEventListener(eventName,onRhUpdate);
    return ()=>window.removeEventListener(eventName,onRhUpdate);
  },[]);

  useEffect(()=>{
    let cancelled=false;
    if(loadRhEmployees().length>0){
      setPlanningBootReady(true);
      return;
    }
    setPlanningBootReady(false);
    void syncRhFromSupabase().then((synced)=>{
      if(cancelled) return;
      if(synced){
        syncPlanningDataFromRh();
        setRhVersion((v)=>v+1);
      }
      setPlanningBootReady(true);
    }).catch(()=>{
      if(cancelled) return;
      setPlanningBootReady(true);
    });
    return ()=>{ cancelled=true; };
  },[]);

  useEffect(()=>{
    if(year===null || month===null) return;
    const refreshPlanningState=()=>{
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(activeMonthKey));
      setBinomes(loadPlanningBinomes(activeMonthKey));
      setPlanningSyncStatus(loadPlanningSyncStatus(activeMonthKey));
    };
    refreshPlanningState();
    const eventName=getPlanningUpdatedEventName();
    window.addEventListener(eventName,refreshPlanningState);
    return ()=>window.removeEventListener(eventName,refreshPlanningState);
  },[activeMonthKey,year,month]);

  useEffect(()=>{
    if(year===null || month===null) return;
    const refreshSyncStatus=()=>{
      setPlanningSyncStatus(loadPlanningSyncStatus(activeMonthKey));
    };
    refreshSyncStatus();
    const eventName=getPlanningSyncStatusUpdatedEventName();
    window.addEventListener(eventName,refreshSyncStatus);
    return ()=>window.removeEventListener(eventName,refreshSyncStatus);
  },[activeMonthKey,year,month]);

  useEffect(()=>{
    const refreshUndoToast=()=>{
      setUndoToast(loadLatestPlanningUndo());
    };
    refreshUndoToast();
    const eventName=getPlanningUndoUpdatedEventName();
    window.addEventListener(eventName,refreshUndoToast);
    return ()=>window.removeEventListener(eventName,refreshUndoToast);
  },[]);

  useEffect(()=>{
    if(!undoToast) return;
    const remainingMs=Math.max(0,undoToast.expiresAt-Date.now());
    if(remainingMs===0){
      dismissPlanningUndo(undoToast.id);
      return;
    }
    const timer=window.setTimeout(()=>{
      dismissPlanningUndo(undoToast.id);
    },remainingMs);
    return ()=>window.clearTimeout(timer);
  },[undoToast]);

  useEffect(()=>{
    if(year===null || month===null) return;
    void syncPlanningFromSupabase(activeMonthKey).then((synced)=>{
      setPlanningSyncStatus(loadPlanningSyncStatus(activeMonthKey));
      if(!synced) return;
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(activeMonthKey));
      setBinomes(loadPlanningBinomes(activeMonthKey));
      syncPlanningDataFromRh();
      setRhVersion((v)=>v+1);
    });
  },[activeMonthKey,year,month]);

  useEffect(()=>{
    const refreshPendingAbsences=()=>{
      setPendingRequests(loadPendingAbsenceRequests());
    };
    refreshPendingAbsences();
    void syncAbsencesFromSupabase().then((synced)=>{
      if(synced) refreshPendingAbsences();
    });
    const eventName=getAbsencesUpdatedEventName();
    window.addEventListener(eventName,refreshPendingAbsences);
    return ()=>window.removeEventListener(eventName,refreshPendingAbsences);
  },[]);

  useEffect(()=>{
    const refreshPresenceThresholds=()=>{
      setPresenceThresholds(loadPresenceThresholds());
    };
    refreshPresenceThresholds();
    void syncPresenceThresholdsFromSupabase();
    const eventName=getPresenceThresholdsUpdatedEventName();
    window.addEventListener(eventName,refreshPresenceThresholds);
    return ()=>window.removeEventListener(eventName,refreshPresenceThresholds);
  },[]);

  const weekStart=useMemo(()=>{
    if(!selectedDate) return null;
    const d=new Date(selectedDate);
    d.setDate(d.getDate()-((d.getDay()+6)%7));
    return d;
  },[selectedDate]);
  const weekLabel=weekStart
    ? `${weekStart.getDate()} ${MOIS_FR[weekStart.getMonth()].substring(0,3)} → ${new Date(weekStart.getTime()+6*864e5).getDate()} ${MOIS_FR[new Date(weekStart.getTime()+6*864e5).getMonth()].substring(0,3)}`
    : "";

  const nav=(dir)=>{
    if(year===null || month===null || !selectedDate) return;
    if(view==="mois"){if(dir<0){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}else{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}}
    else if(view==="semaine"){setSelectedDate(d=>{const n=new Date(d);n.setDate(n.getDate()+(dir*7));return n;});}
    else{setSelectedDate(d=>{const n=new Date(d);n.setDate(n.getDate()+dir);return n;});}
  };

  const handleEdit=(emp,date)=>{
    if(isReadOnly) return;
    const s=getStatus(emp,date,overrides);
    const h=getHoraire(emp,date,overrides);
    const dh=getDefaultHoraire(emp,date);
    setEditing({emp,date,s,h,dh});
  };

  const saveEdit=async(s,h,scope)=>{
    if(isReadOnly) return;
    if(!editing)return;
    const normalizedHoraire=scope!=="default"?normalizePlanningHoraireValue(h):null;
    const effectiveStatus=normalizedHoraire&&s==="X"?"PRESENT":s;
    if(scope!=="default"&&!normalizedHoraire){
      setError("Choisissez ou saisissez un horaire valide.");
      return;
    }
    setBusy(true);
    setError("");
    const selectedEmployeeName=editing.emp.n;
    const selectedDateIso=formatPlanningDate(editing.date);
    try {
      const nextOverrides={...overrides};
      const mutations=[];
      if(scope==="mois"&&normalizedHoraire){
        const emp=editing.emp;
        const d=editing.date;
        const y=d.getFullYear();const m=d.getMonth();
        const days=daysInMonth(y,m);
        for(let day=1;day<=days;day++){
          const dt=new Date(y,m,day);
          const dow=dt.getDay();
          if(dow===0) continue;
          const curS=getStatus(emp,dt,overrides);
          if(curS==="PRESENT"){
            const iso=formatPlanningDate(dt);
            const key=`${emp.n}_${iso}`;
            nextOverrides[key]={s:"PRESENT",h:normalizedHoraire};
            mutations.push({employeeName:emp.n,date:iso,status:"PRESENT",horaire:normalizedHoraire});
          }
        }
        const iso=formatPlanningDate(editing.date);
        const key=`${emp.n}_${iso}`;
        nextOverrides[key]={s:effectiveStatus,h:normalizedHoraire};
        mutations.push({employeeName:emp.n,date:iso,status:effectiveStatus,horaire:normalizedHoraire});
      } else {
        const iso=formatPlanningDate(editing.date);
        const key=`${editing.emp.n}_${iso}`;
        nextOverrides[key]={s:effectiveStatus,h:normalizedHoraire};
        mutations.push({employeeName:editing.emp.n,date:iso,status:effectiveStatus,horaire:normalizedHoraire});
      }

      await savePlanningOverridesToSupabase(mutations,nextOverrides);
      if(isAbsenceStatus(editing.s) || isAbsenceStatus(effectiveStatus)){
        await syncPlanningStatusToAbsenceInSupabase({
          employeeName:selectedEmployeeName,
          date:selectedDateIso,
          status:effectiveStatus,
        });
      }
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(activeMonthKey));
      setBinomes(loadPlanningBinomes(activeMonthKey));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Supabase.");
      await syncPlanningFromSupabase(activeMonthKey);
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(activeMonthKey));
      setBinomes(loadPlanningBinomes(activeMonthKey));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo=async()=>{
    if(isReadOnly) return;
    if(!undoToast) return;
    try{
      setUndoBusy(true);
      setError("");
      await undoLastPlanningAction(undoToast.id);
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(activeMonthKey));
      setBinomes(loadPlanningBinomes(activeMonthKey));
    }catch(err){
      setError(err instanceof Error ? err.message : "Impossible d'annuler la modification.");
    }finally{
      setUndoBusy(false);
    }
  };

  const kpiGroups=useMemo(()=>{
    if(!selectedDate) {
      return {matin:[],soir:[],etu:[],absRH:[],absCP:[],absMAL:[],absOther:[]};
    }
    const kpiDate=view==="jour"?selectedDate:new Date();
    return getDayGroups(kpiDate,overrides);
  },[selectedDate,view,overrides]);
  const eCount=kpiGroups.etu.length;
  const absCount=kpiGroups.absRH.length+kpiGroups.absCP.length+kpiGroups.absMAL.length+kpiGroups.absOther.length;
  const pendingAbsenceLookup=buildPendingAbsenceLookup(pendingRequests);
  const monthMetrics=useMemo(()=>{
    if(year===null||month===null){
      return {
        pendingMonthRequests:[],
        pendingRiskRequests:[],
        alertDays:[],
        criticalDays:[],
        pendingCriticalRiskCount:0,
      };
    }
    const totalDays=daysInMonth(year,month);
    const monthStartIso=formatPlanningDate(new Date(year,month,1));
    const monthEndIso=formatPlanningDate(new Date(year,month,totalDays));
    const monthlyPlanningDays=Array.from({length:totalDays},(_,index)=>{
      const date=new Date(year,month,index+1);
      const counts=getPlanningDayPresence(date,overrides);
      return {
        dayIso:formatPlanningDate(date),
        date,
        morningCount:counts.morningCount,
        afternoonCount:counts.afternoonCount,
        level:getPlanningDayLevel(date,counts,presenceThresholds),
      };
    });
    const monitoredDays=monthlyPlanningDays.filter((day)=>day.date.getDay()!==0);
    const alertDays=monitoredDays.filter((day)=>day.level==="warning");
    const criticalDays=monitoredDays.filter((day)=>day.level==="critical");
    const riskDays=monitoredDays.filter((day)=>day.level!=="ok");
    const criticalDaySet=new Set(criticalDays.map((day)=>day.dayIso));
    const pendingMonthRequests=pendingRequests
      .filter((request)=>doesRequestOverlapPlanningRange(request,monthStartIso,monthEndIso))
      .sort((a,b)=>a.startDate.localeCompare(b.startDate));
    const pendingRiskRequests=pendingMonthRequests
      .map((request)=>{
        const overlappingRiskDays=riskDays.filter((day)=>request.startDate<=day.dayIso&&request.endDate>=day.dayIso);
        if(!overlappingRiskDays.length) return null;
        return {
          request,
          highestLevel:overlappingRiskDays.some((day)=>criticalDaySet.has(day.dayIso))?"critical":"warning",
        };
      })
      .filter(Boolean)
      .sort((a,b)=>
        (a.highestLevel==="critical"?-1:1)-(b.highestLevel==="critical"?-1:1)||
        a.request.startDate.localeCompare(b.request.startDate),
      );
    return {
      pendingMonthRequests,
      pendingRiskRequests,
      alertDays,
      criticalDays,
      pendingCriticalRiskCount:pendingRiskRequests.filter((item)=>item.highestLevel==="critical").length,
    };
  },[year,month,overrides,presenceThresholds,pendingRequests]);
  const currentPresenceCounts=useMemo(()=>{
    const targetDate=selectedDate&&view==="jour"?selectedDate:new Date();
    return getPlanningDayPresence(targetDate,overrides);
  },[overrides,selectedDate,view]);
  const triColumns=splitPlanningItemsInColumns(
    Object.entries(triData).sort(([a],[b])=>Number(a)-Number(b)),
    2,
  );
  const binomeColumns=splitPlanningItemsInColumns(
    binomes.map((pair,index)=>({pair,index})),
    2,
  );
  const horaireOptions=loadPlanningHorairePresets();
  const syncErrorMessage=planningSyncStatus.state==="error"
    ? planningSyncStatus.message||"Synchronisation planning indisponible."
    : "";

  if(roleLoading || year===null || month===null || !selectedDate || !weekStart || !planningBootReady){
    return(
      <div style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        Chargement...
      </div>
    );
  }

  return(
    <div data-planning-root style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:V.body,minHeight:"100vh",background:`radial-gradient(circle at top left,rgba(29,95,160,0.06),transparent 24%),linear-gradient(180deg,#f9fbfd 0%,${V.bg} 100%)`}}>
      <div data-planning-screen style={{maxWidth:1600,margin:"0 auto",padding:18}}>

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
            {isReadOnly&&(
              <span style={{fontSize:11,fontWeight:700,color:V.mc,background:"#eff6ff",border:`1px solid ${V.mc}22`,padding:"6px 10px",borderRadius:999}}>
                Lecture seule
              </span>
            )}
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
        {(error||syncErrorMessage||busy)&&(
          <div style={{marginBottom:14,padding:"12px 14px",borderRadius:14,border:`1px solid ${((error||syncErrorMessage)?V.red:V.mc)}22`,background:(error||syncErrorMessage)?"#fff5f5":"#eff6ff",color:(error||syncErrorMessage)?V.red:V.mc,fontSize:13,fontWeight:600}}>
            {error||syncErrorMessage||"Enregistrement en cours..."}
          </div>
        )}

        {/* KPIs */}
        {view==="mois"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <KPI
              value={monthMetrics.criticalDays.length}
              label="Jours critiques"
              color={monthMetrics.criticalDays.length?V.red:V.green}
              gradient={monthMetrics.criticalDays.length?"linear-gradient(135deg,#fef2f2,#fee2e2)":"linear-gradient(135deg,#ecfdf5,#f0fdf4)"}
            />
            <KPI
              value={monthMetrics.alertDays.length}
              label="Jours en alerte"
              color={monthMetrics.alertDays.length?V.amber:V.green}
              gradient={monthMetrics.alertDays.length?"linear-gradient(135deg,#fff7ed,#ffedd5)":"linear-gradient(135deg,#f0fdf4,#f7fee7)"}
            />
            <KPI
              value={monthMetrics.pendingMonthRequests.length}
              label="Demandes en attente"
              color={monthMetrics.pendingMonthRequests.length?V.mc:V.light}
              gradient={monthMetrics.pendingMonthRequests.length?"linear-gradient(135deg,#eff6ff,#dbeafe)":"linear-gradient(135deg,#f8fafc,#f1f5f9)"}
            />
            <KPI
              value={monthMetrics.pendingRiskRequests.length}
              label="Demandes à risque"
              color={monthMetrics.pendingRiskRequests.length?(monthMetrics.pendingCriticalRiskCount?V.red:V.amber):V.green}
              gradient={monthMetrics.pendingRiskRequests.length
                ? monthMetrics.pendingCriticalRiskCount
                  ? "linear-gradient(135deg,#fff1f2,#ffe4e6)"
                  : "linear-gradient(135deg,#fff7ed,#ffedd5)"
                : "linear-gradient(135deg,#ecfdf5,#f0fdf4)"}
            />
          </div>
        )}
        {view==="semaine"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <KPI value={currentPresenceCounts.morningCount} label="Matin aujourd'hui" color={getPlanningLevelColor(getPlanningCountLevel(currentPresenceCounts.morningCount,"morning",presenceThresholds))} gradient={getPlanningCountLevel(currentPresenceCounts.morningCount,"morning",presenceThresholds)==="ok"?V.mG:"linear-gradient(135deg,#fef1f2,#fff8f8)"}/>
            <KPI value={currentPresenceCounts.afternoonCount} label="Après-midi" color={getPlanningLevelColor(getPlanningCountLevel(currentPresenceCounts.afternoonCount,"afternoon",presenceThresholds))} gradient={getPlanningCountLevel(currentPresenceCounts.afternoonCount,"afternoon",presenceThresholds)==="ok"?"linear-gradient(135deg,#f5f2fe,#faf8ff)":"linear-gradient(135deg,#fff7ed,#fffaf5)"}/>
            <KPI value={eCount} label="Étudiants" color={eCount>0?V.cyan:"#9ca3af"} gradient={eCount>0?"linear-gradient(135deg,#effcfd,#f7feff)":"linear-gradient(135deg,#f5f7fa,#fafbfc)"}/>
            <KPI value={absCount} label="Absents" color={absCount>3?V.red:V.amber} gradient={absCount>3?"linear-gradient(135deg,#fef1f2,#fff8f8)":"linear-gradient(135deg,#fffbeb,#fffef5)"}/>
          </div>
        )}

        {/* VIEWS */}
        <Card style={view==="semaine"?{padding:14}:{}}>
          {view!=="semaine"&&<Legend/>}
          {view!=="semaine"&&<div style={{height:1,background:`linear-gradient(90deg,transparent,${V.line},transparent)`,margin:"8px 0 12px"}}/>}
          {view==="mois"&&<VueMois year={year} month={month} filter={filter} overrides={overrides} triData={triData} pendingAbsenceLookup={pendingAbsenceLookup} presenceThresholds={presenceThresholds} onEdit={handleEdit} readOnly={isReadOnly}/>}
          {view==="semaine"&&<VueSemaine weekStart={weekStart} overrides={overrides} triData={triData} presenceThresholds={presenceThresholds} onEdit={handleEdit} readOnly={isReadOnly}/>}
          {view==="jour"&&<VueJour date={selectedDate} overrides={overrides} triData={triData} binomes={binomes} presenceThresholds={presenceThresholds} onEdit={handleEdit} readOnly={isReadOnly}/>}
        </Card>

        {/* TRI CADDIE + BINÔMES (month view) */}
        {view==="mois"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
            <Card style={{padding:18}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <div>
                  <Kicker label={isReadOnly?"TRI CADDIE":"TRI CADDIE — cliquer pour modifier"} icon={CartIcon}/>
                  <div style={{marginTop:10,fontSize:16,fontWeight:800,color:V.text}}>
                    Rotation {MOIS_FR[month].toLowerCase()}
                  </div>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:V.light,paddingTop:6}}>
                  {Object.keys(triData).length} jours
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:12}}>
                {triColumns.map((column,columnIndex)=>(
                  <div key={`tri-col-${columnIndex}`} style={{display:"grid",gap:6}}>
                    {column.map(([dow,pair])=>(
                      <div key={dow} onClick={isReadOnly?undefined:()=>setEditTri(parseInt(dow))} style={{
                        display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,
                        background:"rgba(248,250,252,0.72)",border:`1px solid ${V.border}`,cursor:isReadOnly?"default":"pointer",transition:"all 0.15s",
                        minHeight:44,
                      }}
                        onMouseEnter={isReadOnly?undefined:(e=>e.currentTarget.style.borderColor=V.amber+"40")} onMouseLeave={isReadOnly?undefined:(e=>e.currentTarget.style.borderColor="rgba(226,232,240,0.5)")}>
                        <span style={{fontSize:11,fontWeight:800,color:V.mc,minWidth:40,letterSpacing:"0.03em"}}>{JL[dow]}</span>
                        <span style={{fontSize:12,fontWeight:600,color:V.body,flex:1,lineHeight:1.25}}>{pair.join(" + ")}</span>
                        {!isReadOnly&&<span style={{color:V.light,display:"flex",alignItems:"center",justifyContent:"center"}}>{EditIcon}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{padding:18}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <div>
                  <Kicker label={isReadOnly?"BINÔMES REPOS":"BINÔMES REPOS — cliquer pour modifier"} icon={LinkIcon}/>
                  <div style={{marginTop:10,fontSize:16,fontWeight:800,color:V.text}}>Paires fixes</div>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:V.light,paddingTop:6}}>
                  {binomes.length} binômes
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:12}}>
                {binomeColumns.map((column,columnIndex)=>(
                  <div key={`binome-col-${columnIndex}`} style={{display:"grid",gap:6}}>
                    {column.map(({pair,index})=>(
                      <div key={index} onClick={isReadOnly?undefined:()=>setEditBinome(index)} style={{
                        display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,
                        background:"rgba(248,250,252,0.72)",border:`1px solid ${V.border}`,cursor:isReadOnly?"default":"pointer",transition:"all 0.15s",
                        minHeight:44,
                      }}
                        onMouseEnter={isReadOnly?undefined:(e=>e.currentTarget.style.borderColor=V.mc+"40")} onMouseLeave={isReadOnly?undefined:(e=>e.currentTarget.style.borderColor="rgba(226,232,240,0.5)")}>
                        <span style={{width:24,height:24,borderRadius:8,background:V.mIG,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:V.mc,flexShrink:0}}>{index+1}</span>
                        <span style={{fontSize:12,fontWeight:600,color:V.body,flex:1,lineHeight:1.25}}>{pair.join(" + ")}</span>
                        {!isReadOnly&&<span style={{color:V.light,display:"flex",alignItems:"center",justifyContent:"center"}}>{EditIcon}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODALS */}
      {!isReadOnly&&editing&&<EditCellModal empName={editing.emp.n} date={editing.date} currentStatut={editing.s} currentHoraire={editing.h} defaultHoraire={editing.dh} monthLabel={`${MOIS_FR[editing.date.getMonth()]} ${editing.date.getFullYear()}`} horaireOptions={horaireOptions} onSave={saveEdit} onClose={()=>setEditing(null)}/>}
      {!isReadOnly&&editTri!==null&&<EditTriModal dow={editTri} pair={triData[editTri]} allNames={getAllEmpNames()} onSave={async(pair)=>{
        setBusy(true);
        setError("");
        try{
          const nextTriData={...triData,[editTri]:pair};
          const syncedTriData = await savePlanningTriPairToSupabase(editTri,pair,nextTriData,activeMonthKey);
          setTriData(syncedTriData);
          setEditTri(null);
        }catch(err){
          setError(err instanceof Error ? err.message : "Erreur Supabase.");
        }finally{
          setBusy(false);
        }
      }} onClose={()=>setEditTri(null)}/>}
      {!isReadOnly&&editBinome!==null&&<EditBinomeModal index={editBinome} pair={binomes[editBinome]} allNames={getAllEmpNames()} onSave={async(pair)=>{
        setBusy(true);
        setError("");
        try{
          const nextBinomes=[...binomes];
          nextBinomes[editBinome]=pair;
          const syncedBinomes = await savePlanningBinomeToSupabase(editBinome,pair,nextBinomes,activeMonthKey);
          setBinomes(syncedBinomes);
          setEditBinome(null);
        }catch(err){
          setError(err instanceof Error ? err.message : "Erreur Supabase.");
        }finally{
          setBusy(false);
        }
      }} onClose={()=>setEditBinome(null)}/>}
      {!isReadOnly&&<UndoToast
        snapshot={undoToast}
        busy={undoBusy}
        onUndo={handleUndo}
        onDismiss={()=>undoToast&&dismissPlanningUndo(undoToast.id)}
      />}
    </div>
  );
}
