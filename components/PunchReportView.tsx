
import React, { useMemo, useState } from 'react';
import { PunchLog, UserAccount, BilletData, ApprovalRecord, UserRole } from '../types';
import { Clock, Calendar, User, ChevronRight, Timer, History, LogIn, LogOut, ShieldCheck, ArrowLeft, ArrowRight, Truck, Layers, CalendarRange, Users, Briefcase, Printer, FileText, MapPin, HardHat, Construction, Trash2 } from 'lucide-react';

interface Props {
  logs: PunchLog[];
  users: UserAccount[];
  history: BilletData[];
  approvals: ApprovalRecord[];
  onBack: () => void;
  onDeletePunch: (id: string) => void;
}

type NavStep = 'groups' | 'weeks' | 'employees' | 'employee_history';

const PunchReportView: React.FC<Props> = ({ logs, users, history, approvals, onBack, onDeletePunch }) => {
  const [step, setStep] = useState<NavStep>('groups');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const parseTimestamp = (ts: string) => {
    if (!ts) return 0;
    const cleanTs = ts.replace(',', '').trim();
    const parts = cleanTs.split(/\s+/);
    if (parts.length < 2) return 0;
    
    const [datePart, timePart] = parts;
    let d, m, y;
    if (datePart.includes('/')) {
      const dateComponents = datePart.split('/');
      [d, m, y] = dateComponents.map(Number);
    } else {
      const dateComponents = datePart.split('-');
      [y, m, d] = dateComponents.map(Number);
    }

    const timeParts = timePart.split(':').map(Number);
    const hour = timeParts[0] || 0;
    const min = timeParts[1] || 0;
    const sec = timeParts[2] || 0;
    
    return new Date(y, m - 1, d, hour, min, sec).getTime();
  };

  const getSundayKey = (timestamp: string) => {
    const cleanTs = timestamp.replace(',', '').trim();
    const [datePart] = cleanTs.split(/\s+/);
    let d, m, y;
    if (datePart.includes('/')) {
        const components = datePart.split('/');
        [d, m, y] = components.map(Number);
    } else {
        const components = datePart.split('-');
        [y, m, d] = components.map(Number);
    }
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = dateObj.getDay();
    const diff = dateObj.getDate() - dayOfWeek;
    const sunday = new Date(dateObj.setDate(diff));
    return sunday.toISOString().split('T')[0];
  };

  const formatWeekRange = (sundayKey: string) => {
    const sun = new Date(sundayKey + 'T12:00:00');
    const sat = new Date(new Date(sun).setDate(sun.getDate() + 6));
    const sunMonth = sun.toLocaleDateString('fr-FR', { month: 'short' });
    const satMonth = sat.toLocaleDateString('fr-FR', { month: 'short' });
    return `DU ${sun.getDate()} ${sunMonth.toUpperCase()} AU ${sat.getDate()} ${satMonth.toUpperCase()} ${sat.getFullYear()}`;
  };

  const formatMs = (ms: number) => {
    if (isNaN(ms) || ms < 0) return "0h 00m";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const processedData = useMemo(() => {
    const sortedLogs = [...logs].sort((a, b) => {
      const timeA = parseTimestamp(a.timestamp);
      const timeB = parseTimestamp(b.timestamp);
      if (timeA !== timeB) return timeA - timeB;
      if (a.type === 'out' && b.type === 'in') return -1;
      if (a.type === 'in' && b.type === 'out') return 1;
      return 0;
    });

    const weeklyMap: Record<string, any> = {};
    const openPunch: Record<string, { ms: number, id: string, project?: string, dateKey: string }> = {};

    sortedLogs.forEach(log => {
      const employee = log.employeeName;
      const user = users.find(u => u.name === employee);
      const group = user?.group || 'Non classé';
      const role = user?.role || 'user';
      const timestamp = log.timestamp;
      const weekKey = getSundayKey(timestamp);
      const dateMapKey = timestamp.split(/[ ,]+/)[0];
      const ms = parseTimestamp(timestamp);

      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { totalMs: 0, groups: {} };
      if (!weeklyMap[weekKey].groups[group]) weeklyMap[weekKey].groups[group] = { totalMs: 0, employees: {} };
      if (!weeklyMap[weekKey].groups[group].employees[employee]) {
        weeklyMap[weekKey].groups[group].employees[employee] = { totalMs: 0, days: {}, role };
      }

      const empData = weeklyMap[weekKey].groups[group].employees[employee];
      if (!empData.days[dateMapKey]) {
        empData.days[dateMapKey] = { total: 0, sessions: [], lunchMins: 0 };
      }

      if (log.type === 'in') {
        if (openPunch[employee]) {
           const prev = openPunch[employee];
           const prevDay = empData.days[prev.dateKey];
           const sessionToClose = prevDay.sessions.find((s: any) => s.inId === prev.id && s.out === null);
           if (sessionToClose) {
              sessionToClose.out = timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || "--:--";
              sessionToClose.duration = ms - prev.ms;
           }
        }
        
        const timeStr = timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || "--:--";
        const newSession = { 
          in: timeStr, 
          out: null, 
          project: log.plaque, 
          inMs: ms, 
          inId: log.id, 
          outId: null,
          duration: null,
          isApproved: false
        };
        empData.days[dateMapKey].sessions.push(newSession);
        openPunch[employee] = { ms, id: log.id, project: log.plaque, dateKey: dateMapKey };
      } 
      else if (log.type === 'out') {
        if (log.lunchMinutes) empData.days[dateMapKey].lunchMins = log.lunchMinutes;
        
        if (openPunch[employee]) {
          const lastIn = openPunch[employee];
          const duration = ms - lastIn.ms;
          
          const sessionDay = empData.days[lastIn.dateKey];
          if (sessionDay) {
              const session = sessionDay.sessions.find((s: any) => s.inId === lastIn.id && s.out === null);
              if (session) {
                session.out = timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || "--:--";
                session.duration = duration;
                session.outId = log.id;
              }
          }
          delete openPunch[employee];
        }
      }
    });

    Object.keys(weeklyMap).forEach(wk => {
      Object.keys(weeklyMap[wk].groups).forEach(grp => {
        Object.keys(weeklyMap[wk].groups[grp].employees).forEach(emp => {
          const e = weeklyMap[wk].groups[grp].employees[emp];
          let weeklyApprovedTotal = 0;

          Object.keys(e.days).forEach(dKey => {
            const day = e.days[dKey];
            let dayTotalMs = 0;

            day.sessions.forEach((s: any) => {
              // Defined constant for auto-approval roles, correctly typed with UserRole.
              const AUTO_APPROVE_ROLES: UserRole[] = ['chauffeur', 'gestionnaire_chauffeur', 'admin', 'surintendant', 'chargée_de_projet'];
              const isAutoApproved = AUTO_APPROVE_ROLES.includes(e.role);
              
              const approval = approvals.find(a => a.sessionInId === s.inId && a.sessionOutId === s.outId);
              
              if (approval) {
                s.isApproved = true;
                s.duration = approval.totalMs;
                dayTotalMs += approval.totalMs;
                const inLog = logs.find(l => l.id === s.inId);
                const outLog = logs.find(l => l.id === s.outId);
                if (inLog) s.in = inLog.timestamp.split(/[ ,]+/)[1]?.slice(0, 5);
                if (outLog) s.out = outLog.timestamp.split(/[ ,]+/)[1]?.slice(0, 5);
              } else if (isAutoApproved) {
                s.isApproved = true;
                if (s.duration) dayTotalMs += s.duration;
              } else {
                s.isApproved = false;
              }
            });

            const finalDayNet = Math.max(0, dayTotalMs - (day.lunchMins * 60000));
            day.total = finalDayNet;
            weeklyApprovedTotal += finalDayNet;
          });

          e.totalMs = weeklyApprovedTotal;
          weeklyMap[wk].groups[grp].totalMs += weeklyApprovedTotal;
          weeklyMap[wk].totalMs += weeklyApprovedTotal;
        });
      });
    });

    return weeklyMap;
  }, [logs, users, approvals]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePunchDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeletePunch(id);
  };

  if (step === 'groups') {
    return (
      <div className="bg-slate-50 min-h-screen pb-20 animate-in fade-in duration-500">
        <div className="bg-black text-white p-6 shadow-md mb-8 border-b-4 border-[#76a73c] flex flex-col items-center text-center">
          <div className="w-full flex justify-start mb-6">
            <button onClick={onBack} className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"><ArrowLeft className="w-3 h-3" /> Retour Consultation</button>
          </div>
          <Briefcase className="w-10 h-10 text-[#76a73c] mb-3" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2">Pointage Heures</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choisir une Division</p>
        </div>

        <div className="px-5 space-y-4">
          <button 
            onClick={() => { setSelectedGroup('DDL Excavation'); setStep('weeks'); }}
            className="w-full group bg-white p-8 rounded-[3rem] border-2 border-slate-200 hover:border-black shadow-sm flex items-center justify-between transition-all active:scale-95"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                <HardHat className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-black uppercase italic leading-none tracking-tight">DDL Excavation</h3>
                <p className="text-[10px] font-bold text-[#76a73c] uppercase mt-2">Division Chantier</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-black" />
          </button>

          <button 
            onClick={() => { setSelectedGroup('DDL Logistiques'); setStep('weeks'); }}
            className="w-full group bg-white p-8 rounded-[3rem] border-2 border-slate-200 hover:border-[#76a73c] shadow-sm flex items-center justify-between transition-all active:scale-95"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center group-hover:bg-[#76a73c] group-hover:text-white transition-all">
                <Truck className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-black uppercase italic leading-none tracking-tight">DDL Logistiques</h3>
                <p className="text-[10px] font-bold text-[#76a73c] uppercase mt-2">Division Transport</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-black" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'weeks' && selectedGroup) {
    const weeksWithData = Object.keys(processedData).filter(w => processedData[w].groups[selectedGroup]).sort((a, b) => b.localeCompare(a));

    return (
      <div className="bg-slate-50 min-h-screen pb-20 animate-in slide-in-from-right duration-300">
        <div className="bg-black text-white p-6 shadow-md mb-6 border-b-4 border-[#76a73c]">
          <button onClick={() => setStep('groups')} className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg mb-6 active:scale-95 transition-transform"><ArrowLeft className="w-3 h-3" /> Retour Divisions</button>
          <div className="flex items-center gap-3 mb-2">
            <CalendarRange className="w-6 h-6 text-[#76a73c]" />
            <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">{selectedGroup}</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choisir une période</p>
        </div>
        <div className="px-4 space-y-3">
          {weeksWithData.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <History className="w-10 h-10 text-slate-200 mx-auto mb-3 opacity-20" />
              <p className="text-[10px] font-black text-slate-400 uppercase">Aucun pointage disponible pour ce groupe.</p>
            </div>
          ) : (
            weeksWithData.map(weekKey => (
              <button key={weekKey} onClick={() => { setSelectedWeek(weekKey); setStep('employees'); }} className="w-full bg-white p-6 rounded-3xl border-2 border-slate-200 hover:border-[#76a73c] flex items-center justify-between shadow-sm active:scale-95 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-[#76a73c]/10 transition-colors"><Calendar className="w-5 h-5 text-black" /></div>
                  <div className="text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1 block">Semaine</span>
                    <h3 className="text-sm font-black text-black uppercase italic">{formatWeekRange(weekKey)}</h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black mt-1" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step === 'employees' && selectedWeek && selectedGroup) {
    const groupData = processedData[selectedWeek]?.groups[selectedGroup];
    const employees = groupData ? Object.keys(groupData.employees).sort() : [];

    return (
      <div className="bg-slate-50 min-h-screen pb-20 animate-in slide-in-from-right duration-300">
        <div className="bg-black text-white p-6 shadow-md mb-6 border-b-4 border-[#76a73c]">
          <button onClick={() => setStep('weeks')} className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg mb-6 active:scale-95 transition-transform"><ArrowLeft className="w-3 h-3" /> Retour périodes</button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#76a73c] p-3 rounded-2xl text-black">
                {selectedGroup === 'DDL Logistiques' ? <Truck className="w-6 h-6" /> : <HardHat className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{selectedGroup}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatWeekRange(selectedWeek)}</p>
              </div>
            </div>
            {groupData && (
              <div className="text-right">
                <div className="text-[8px] font-black text-[#76a73c] uppercase leading-none mb-1">Total Division</div>
                <div className="text-base font-black text-white font-mono">{formatMs(groupData.totalMs)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <User className="w-10 h-10 text-slate-100 mx-auto mb-3" />
               <p className="text-[10px] font-black text-slate-400 uppercase italic">Aucun pointage trouvé pour cette sélection.</p>
            </div>
          ) : (
            employees.map(emp => {
              const empData = groupData.employees[emp];
              return (
                <button 
                  key={emp} 
                  onClick={() => { setSelectedEmployee(emp); setStep('employee_history'); }} 
                  className="w-full bg-white p-5 rounded-3xl border-2 border-slate-200 hover:border-[#76a73c] flex items-center justify-between shadow-sm active:scale-95 group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-[#76a73c]/10 text-black">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-black uppercase italic">{emp}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{empData.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-[#76a73c] uppercase leading-none mb-1">H. Approuvées</div>
                    <div className="text-sm font-black text-black font-mono">{formatMs(empData.totalMs)}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (step === 'employee_history' && selectedWeek && selectedGroup && selectedEmployee) {
    const groupData = processedData[selectedWeek].groups[selectedGroup];
    const empData = groupData.employees[selectedEmployee];
    const daysKeys = Object.keys(empData.days).sort((a, b) => {
      const dateA = a.split(/[ /]+/).map(Number);
      const dateB = b.split(/[ /]+/).map(Number);
      return new Date(dateA[2], dateA[1] - 1, dateA[0]).getTime() - new Date(dateB[2], dateB[1] - 1, dateB[0]).getTime();
    });

    return (
      <div className="bg-slate-50 min-h-screen pb-20 animate-in slide-in-from-right duration-300">
        <div className="print:hidden">
          <div className="bg-black text-white p-6 shadow-md mb-6 border-b-4 border-[#76a73c]">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep('employees')} className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"><ArrowLeft className="w-3 h-3" /> Retour employés</button>
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 text-[10px] font-black uppercase bg-[#76a73c] text-black px-4 py-2 rounded-xl shadow-lg active:scale-95 hover:bg-[#8bc546] transition-all"
              >
                <Printer className="w-4 h-4" /> Export Paie PDF
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-[#76a73c] p-3 rounded-2xl text-black"><User className="w-6 h-6" /></div>
                <div><h2 className="text-xl font-black uppercase italic tracking-tighter">{selectedEmployee}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatWeekRange(selectedWeek)}</p></div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black text-[#76a73c] uppercase mb-1">Total Semaine</div>
                <div className="text-lg font-black text-white font-mono leading-none">{formatMs(empData.totalMs)}</div>
              </div>
            </div>
          </div>

          <div className="px-4 space-y-6">
            {daysKeys.map(dateStr => {
              const day = empData.days[dateStr];
              return (
                <div key={dateStr} className="bg-white rounded-[2rem] border-2 border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                     <h4 className="text-[11px] font-black text-black uppercase italic">{dateStr}</h4>
                     <div className="flex items-center gap-3">
                        {day.lunchMins > 0 && <span className="text-[9px] font-bold text-orange-500 uppercase">Dîner: {day.lunchMins}m</span>}
                        <span className="text-[10px] font-black text-[#76a73c]">{formatMs(day.total)}</span>
                     </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {day.sessions.map((session: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                               <MapPin className="w-3 h-3 text-blue-600" />
                               <span className="text-[9px] font-black text-blue-700 uppercase">{session.project || 'GÉNÉRAL'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {!session.isApproved && <span className="text-[7px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full uppercase">En attente</span>}
                                <div className="text-[9px] font-black text-slate-400 font-mono italic">
                                   {session.duration ? formatMs(session.duration) : 'Session Active'}
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                               <div className="flex items-center gap-2">
                                  <LogIn className="w-3.5 h-3.5 text-[#76a73c]" />
                                  <span className="text-[11px] font-black text-black uppercase tracking-tight">Arrivée: <span className="font-mono">{session.in}</span></span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-[11px] font-black text-black uppercase tracking-tight">Sortie: <span className="font-mono">{session.out || '--:--'}</span></span>
                               </div>
                            </div>
                            <button 
                               onClick={(e) => handlePunchDelete(e, session.inId)}
                               className="p-1.5 text-red-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                               title="Supprimer cette session"
                            >
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden print:block p-0 bg-white text-black font-sans print:w-full print:h-[26.5cm] print:max-h-[26.5cm] text-[10px] leading-tight w-full overflow-hidden flex flex-col">
          <div className="flex justify-between items-end border-b-8 border-black pb-4 mb-4">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter leading-none text-black">
                GROUPE <span className="text-[#76a73c]">DDL</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1 text-slate-400">FEUILLE DE TEMPS • LOGISTIQUE</p>
            </div>
            <div className="text-right">
              <div className="bg-black text-white px-4 py-1.5 mb-1 inline-block">
                <h2 className="text-lg font-black uppercase italic tracking-widest leading-none">RAPPORT DE PAIE</h2>
              </div>
              <p className="text-[8px] font-black uppercase text-slate-500">Document généré électroniquement • Format US Letter</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0 border-4 border-black mb-4 shrink-0">
            <div className="p-4 border-r-4 border-black">
               <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">IDENTIFICATION DE L'EMPLOYÉ</span>
               <div className="text-3xl font-black uppercase italic tracking-tight">{selectedEmployee}</div>
               <div className="text-xs font-bold text-[#76a73c] uppercase mt-1">{selectedGroup} • {empData.role}</div>
            </div>
            <div className="bg-slate-50 p-4 flex flex-col justify-center items-end">
               <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">TOTAL CUMULÉ NET (APPROUVÉ)</span>
               <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-black text-black font-mono leading-none tracking-tighter">{formatMs(empData.totalMs)}</div>
                  <div className="text-xl font-black text-slate-300 uppercase">H. NET</div>
               </div>
               <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                  Période du rapport : {formatWeekRange(selectedWeek)}
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-2 text-left uppercase border-r border-white/20 font-black">DATE / JOURNÉE</th>
                  <th className="p-2 text-center uppercase border-r border-white/20 font-black">ENTRÉE</th>
                  <th className="p-2 text-center uppercase border-r border-white/20 font-black">SORTIE</th>
                  <th className="p-2 text-center uppercase border-r border-white/20 font-black">DÎNER</th>
                  <th className="p-2 text-left uppercase border-r border-white/20 font-black">PROJET / CHANTIER</th>
                  <th className="p-2 text-right uppercase font-black">CUMUL NET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {daysKeys.map((dateStr, dIdx) => {
                  const day = empData.days[dateStr];
                  const approvedSessions = day.sessions.filter((s: any) => s.isApproved);
                  
                  return approvedSessions.map((session: any, sIdx: number) => (
                    <tr key={`${dateStr}-${sIdx}`} className={`${sIdx === 0 && dIdx > 0 ? 'border-t-2 border-black/10' : ''} hover:bg-slate-50`}>
                      <td className="p-1.5 font-black uppercase italic text-[11px]">{sIdx === 0 ? dateStr : ''}</td>
                      <td className="p-1.5 text-center font-mono font-bold text-[11px]">{session.in}</td>
                      <td className="p-1.5 text-center font-mono font-bold text-[11px]">{session.out || '--:--'}</td>
                      <td className="p-1.5 text-center text-orange-600 font-black text-[11px]">
                         {sIdx === 0 ? (day.lunchMins > 0 ? `${day.lunchMins}m` : '0m') : ''}
                      </td>
                      <td className="p-1.5 uppercase text-black font-black text-[10px] truncate max-w-[200px]">
                        {session.project || 'GÉNÉRAL / DIVERS'}
                      </td>
                      <td className="p-1.5 text-right font-black font-mono bg-slate-50 text-[12px]">
                         {session.duration ? formatMs(session.duration) : '--:--'}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-slate-900 text-white flex justify-between items-center rounded-sm shrink-0">
             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#76a73c]">SYNTHÈSE DE PAIE HEBDOMADAIRE</div>
             <div className="flex gap-10">
                <div className="text-right border-l-2 border-white/20 pl-10">
                   <div className="text-[10px] font-black uppercase text-[#76a73c] mb-0.5">NET TOTAL À PAYER</div>
                   <div className="text-3xl font-black font-mono leading-none tracking-tighter">{formatMs(empData.totalMs)}</div>
                </div>
             </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-32 shrink-0">
             <div className="flex flex-col">
               <div className="h-12 border-b-2 border-black"></div>
               <div className="mt-1.5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">SIGNATURE DE L'EMPLOYÉ</div>
             </div>
             <div className="flex flex-col text-right">
               <div className="h-12 border-b-2 border-black"></div>
               <div className="mt-1.5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">VALIDATION DIRECTION</div>
             </div>
          </div>

          <div className="mt-auto text-center pt-4 border-t border-slate-100 shrink-0">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">LOGIVRAC • GROUPE DDL EXCAVATION INC.</p>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
            }
          }
        `}} />
      </div>
    );
  }

  return null;
};

export default PunchReportView;
