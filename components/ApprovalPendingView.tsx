
import React, { useMemo, useState, useEffect } from 'react';
import { PunchLog, UserAccount, ApprovalRecord, UserRole } from '../types';
import { ArrowLeft, Clock, User, CheckCircle2, LogIn, LogOut, Timer, Coffee, MapPin, ChevronDown, ChevronRight, Edit3, HardHat, Truck, UserCircle, Briefcase } from 'lucide-react';

interface Props {
  logs: PunchLog[];
  users: UserAccount[];
  approvals: ApprovalRecord[];
  onApprove: (
    employeeName: string, 
    date: string, 
    totalMs: number, 
    lunchMs?: number, 
    project?: string, 
    sessionInId?: string, 
    sessionOutId?: string,
    modifiedInTime?: string,
    modifiedOutTime?: string
  ) => void;
  onBack: () => void;
  currentUser: UserAccount | null;
}

const ApprovalPendingView: React.FC<Props> = ({ logs, users, approvals, onApprove, onBack, currentUser }) => {
  const [lunchTimes, setLunchTimes] = useState<Record<string, number>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [timeOverrides, setTimeOverrides] = useState<Record<string, { in: string, out: string }>>({});

  const parseTimestamp = (ts: string) => {
    if (!ts) return 0;
    const cleanTs = ts.replace(',', '').trim();
    const parts = cleanTs.split(/\s+/);
    if (parts.length < 2) return 0;
    const [datePart, timePart] = parts;
    const [d, m, y] = datePart.split('/').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };

  const timeToMs = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 3600 + m * 60) * 1000;
  };

  const formatMs = (ms: number) => {
    const totalMs = Math.max(0, ms);
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const groupedPendingData = useMemo(() => {
    const sortedLogs = [...logs].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
    
    const getAllowedRoles = (role: UserRole | undefined): UserRole[] => {
      const all: UserRole[] = ['chauffeur', 'mécano', 'manoeuvre', 'operateur', 'opérateur_cour', 'contremaitre', 'gestionnaire_cour', 'gestionnaire_mécano', 'gestionnaire_chauffeur', 'surintendant', 'chargée_de_projet', 'user', 'admin'];
      if (['admin', 'surintendant', 'chargée_de_projet'].includes(role || '')) return all;
      if (role === 'gestionnaire_cour') return ['opérateur_cour'];
      if (role === 'contremaitre') return ['operateur', 'manoeuvre'];
      if (role === 'gestionnaire_mécano') return ['mécano'];
      if (role === 'gestionnaire_chauffeur') return ['chauffeur'];
      return [];
    };

    const allowed = getAllowedRoles(currentUser?.role);
    // Structure: Record<Role, Record<Project, Session[]>>
    const nestedData: Record<string, Record<string, any[]>> = {};
    const openPunches: Record<string, { ms: number, id: string, project?: string, log: PunchLog }> = {};

    sortedLogs.forEach(log => {
      const ms = parseTimestamp(log.timestamp);
      const dateParts = log.timestamp.split(/[ ,]+/)[0].split('/');
      const dateKey = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      const employee = log.employeeName;
      const user = users.find(u => u.name === employee);
      
      if (!user || !allowed.includes(user.role)) return;

      if (log.type === 'in') {
        openPunches[employee] = { ms, id: log.id, project: log.plaque || "NON SPÉCIFIÉ", log };
      } 
      else if (log.type === 'out' && openPunches[employee]) {
        const inLog = openPunches[employee].log;
        const duration = ms - openPunches[employee].ms;
        const project = openPunches[employee].project || "NON SPÉCIFIÉ";
        const role = user.role;
        
        const isApproved = approvals.some(a => a.sessionInId === inLog.id && a.sessionOutId === log.id);
        
        if (!isApproved) {
           if (!nestedData[role]) nestedData[role] = {};
           if (!nestedData[role][project]) nestedData[role][project] = [];
           
           nestedData[role][project].push({
             date: dateKey,
             employeeName: employee,
             project: project,
             totalMs: duration,
             declaredLunch: log.lunchMinutes ? log.lunchMinutes * 60000 : 0,
             role: role,
             origIn: inLog.timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || '08:00',
             origOut: log.timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || '17:00',
             sessionInId: inLog.id,
             sessionOutId: log.id
           });
        }
        delete openPunches[employee];
      }
    });

    return nestedData;
  }, [logs, users, approvals, currentUser]);

  useEffect(() => {
    const initialL: Record<string, number> = {};
    const initialT: Record<string, { in: string, out: string }> = {};
    Object.values(groupedPendingData).forEach(projects => {
      Object.values(projects).flat().forEach((item: any) => {
        const key = `${item.employeeName}-${item.sessionInId}`;
        if (item.declaredLunch !== undefined && lunchTimes[key] === undefined) initialL[key] = item.declaredLunch;
        if (timeOverrides[key] === undefined) initialT[key] = { in: item.origIn, out: item.origOut };
      });
    });
    if (Object.keys(initialL).length > 0) setLunchTimes(prev => ({ ...prev, ...initialL }));
    if (Object.keys(initialT).length > 0) setTimeOverrides(prev => ({ ...prev, ...initialT }));
  }, [groupedPendingData]);

  const handleTimeChange = (key: string, field: 'in' | 'out', val: string) => {
    setTimeOverrides(prev => ({
        ...prev,
        [key]: { ...prev[key], [field]: val }
    }));
  };

  const sortedRoles = Object.keys(groupedPendingData).sort();

  const getRoleIcon = (role: string) => {
    if (role.includes('chauffeur')) return <Truck className="w-5 h-5" />;
    if (role.includes('operateur')) return <Briefcase className="w-5 h-5" />;
    if (role.includes('mécano')) return <Clock className="w-5 h-5" />;
    return <UserCircle className="w-5 h-5" />;
  };

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-black font-black uppercase text-[10px] bg-slate-200 px-3 py-1.5 rounded-lg mb-4 active:scale-95 transition-transform">
        <ArrowLeft className="w-3 h-3" /> Retour Menu
      </button>

      <div className="bg-orange-500 p-6 rounded-3xl shadow-xl text-white border-b-4 border-black/20">
        <Clock className="w-8 h-8 mb-2" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Validation des Sessions</h2>
        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">Approuvez par rôle et par chantier</p>
      </div>

      <div className="space-y-10">
        {sortedRoles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase">Rien à approuver pour le moment.</p>
          </div>
        ) : sortedRoles.map(role => (
          <div key={role} className="space-y-4">
            {/* NIVEAU 1 : RÔLE */}
            <div className="flex items-center gap-3 px-2 border-b-2 border-slate-200 pb-2">
              <div className="bg-black text-white p-2 rounded-xl">
                {getRoleIcon(role)}
              </div>
              <h3 className="text-lg font-black uppercase italic text-black tracking-tight">{role.replace('_', ' ')}</h3>
              <div className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-lg">
                {Object.values(groupedPendingData[role]).flat().length} SESSIONS
              </div>
            </div>

            {/* NIVEAU 2 : PROJETS POUR CE RÔLE */}
            <div className="space-y-4 pl-2 md:pl-6 border-l-2 border-slate-100">
              {Object.keys(groupedPendingData[role]).sort().map(proj => {
                const projKey = `${role}-${proj}`;
                return (
                  <div key={proj} className="space-y-3">
                    <button 
                      onClick={() => setCollapsedProjects(prev => ({ ...prev, [projKey]: !prev[projKey] }))} 
                      className="w-full flex items-center justify-between bg-white text-black border-2 border-black px-5 py-4 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <h4 className="text-[11px] font-black uppercase italic tracking-tight">{proj}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{groupedPendingData[role][proj].length}</span>
                        {collapsedProjects[projKey] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* NIVEAU 3 : SESSIONS INDIVIDUELLES */}
                    {!collapsedProjects[projKey] && groupedPendingData[role][proj].map((item, idx) => {
                      const key = `${item.employeeName}-${item.sessionInId}`;
                      const currentLunch = lunchTimes[key] !== undefined ? lunchTimes[key] : item.declaredLunch;
                      const overrides = timeOverrides[key] || { in: item.origIn, out: item.origOut };
                      
                      const totalMs = timeToMs(overrides.out) - timeToMs(overrides.in);
                      const netTotal = totalMs - currentLunch;

                      return (
                        <div key={idx} className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm space-y-5 hover:border-orange-500 transition-colors animate-in slide-in-from-top-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-100 p-3 rounded-2xl text-black">
                                <User className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-base font-black uppercase italic text-black leading-none">{item.employeeName}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.date}</p>
                                
                                <div className="flex gap-4 mt-3">
                                    <div className="flex flex-col">
                                        <label className="text-[8px] font-black text-slate-400 uppercase">Arrivée</label>
                                        <input 
                                            type="time" 
                                            value={overrides.in} 
                                            onChange={(e) => handleTimeChange(key, 'in', e.target.value)}
                                            className="text-[11px] font-black bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-black outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[8px] font-black text-slate-400 uppercase">Sortie</label>
                                        <input 
                                            type="time" 
                                            value={overrides.out} 
                                            onChange={(e) => handleTimeChange(key, 'out', e.target.value)}
                                            className="text-[11px] font-black bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-black outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-black text-orange-500 uppercase leading-none">Net Segment</div>
                              <div className="text-lg font-black font-mono text-black leading-none mt-1">{formatMs(netTotal)}</div>
                              {currentLunch > 0 && (
                                  <div className="text-[8px] font-bold text-slate-300 uppercase mt-1">Dîner : -{currentLunch/60000}m</div>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Coffee className="w-3 h-3 text-orange-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase italic">Dîner sur ce segment :</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[0, 15, 30, 45, 60].map(m => (
                                <button key={m} onClick={() => setLunchTimes(prev => ({ ...prev, [key]: m * 60000 }))} className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${currentLunch === m * 60000 ? 'bg-black text-orange-500 border-black shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>
                                  {m} min
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => onApprove(
                              item.employeeName, 
                              item.date, 
                              netTotal, 
                              currentLunch, 
                              item.project, 
                              item.sessionInId, 
                              item.sessionOutId,
                              overrides.in, // Nouveau : on envoie l'heure modifiée
                              overrides.out // Nouveau : on envoie l'heure modifiée
                            )} 
                            className="w-full py-4 bg-orange-500 text-white font-black uppercase italic rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform hover:bg-orange-600"
                          >
                            <CheckCircle2 className="w-5 h-5" /> Valider session {role}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalPendingView;
