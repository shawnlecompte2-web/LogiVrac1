
import React, { useMemo, useState, useEffect } from 'react';
import { PunchLog, UserAccount } from '../types';
import { ArrowLeft, Clock, Search, ChevronDown, Filter, Calendar, Zap, AlertCircle, Building2 } from 'lucide-react';

interface Props {
  logs: PunchLog[];
  users: UserAccount[];
  onBack: () => void;
}

const DashboardView: React.FC<Props> = ({ logs, users, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parseTimestamp = (ts: string) => {
    if (!ts) return 0;
    const cleanTs = ts.replace(',', '').trim();
    const parts = cleanTs.split(/\s+/);
    if (parts.length < 2) return 0;
    const [datePart, timePart] = parts;
    const [d, m, y] = datePart.split('/').map(Number);
    const [hh, mm, ss] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, ss || 0).getTime();
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day; // Dimanche
    return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
  };

  const teamActivities = useMemo(() => {
    const weekStart = getWeekStart();
    const sortedLogs = [...logs].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
    const data: Record<string, any> = {};

    users.forEach(u => {
      data[u.name] = {
        user: u,
        status: 'offline',
        lastPunch: null,
        weekMs: 0,
        currentSessionStart: null,
        lastProject: '(no description)'
      };
    });

    sortedLogs.forEach(log => {
      const emp = log.employeeName;
      if (!data[emp]) return;

      const logMs = parseTimestamp(log.timestamp);
      
      if (logMs >= weekStart) {
        if (log.type === 'in') {
          data[emp].currentSessionStart = logMs;
        } else if (log.type === 'out' && data[emp].currentSessionStart) {
          data[emp].weekMs += (logMs - data[emp].currentSessionStart);
          data[emp].currentSessionStart = null;
        }
      }

      data[emp].status = log.type === 'in' ? 'in_progress' : 'offline';
      data[emp].lastPunch = log;
      if (log.plaque) data[emp].lastProject = log.plaque;
    });

    return Object.values(data).sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        return a.user.name.localeCompare(b.user.name);
    });
  }, [logs, users]);

  const filteredTeam = teamActivities.filter(item => 
    item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="max-w-6xl mx-auto md:space-y-6 space-y-4 animate-in fade-in duration-500 pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 md:pb-6 pb-3">
        <div>
          <h2 className="md:text-3xl text-xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Dashboard</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Activité en direct</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 font-black text-[9px] uppercase">
                <Calendar className="w-3 h-3" />
                Semaine
                <ChevronDown className="w-2.5 h-2.5" />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 md:px-6 px-3 py-2 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Zap className="w-3.5 h-3.5 text-blue-600" />
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Activités Équipe</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                <th className="md:px-6 px-3 md:py-4 py-2">Membre</th>
                <th className="md:px-6 px-3 md:py-4 py-2">Dernière Activité / Début</th>
                <th className="md:px-6 px-3 md:py-4 py-2">H. Semaine</th>
                <th className="md:px-6 px-3 md:py-4 py-2 text-right">Progression (40h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeam.map((item, idx) => {
                const isActive = item.status === 'in_progress';
                const currentSessionDuration = isActive ? currentTime.getTime() - item.currentSessionStart : 0;
                const totalWeekMs = item.weekMs + currentSessionDuration;
                const progressPercent = Math.min(100, (totalWeekMs / (40 * 3600000)) * 100);
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="md:px-6 px-3 md:py-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`md:w-10 md:h-10 w-8 h-8 rounded-lg shrink-0 ${getAvatarColor(item.user.name)} text-white flex items-center justify-center font-black text-[11px] shadow-sm`}>
                          {getInitials(item.user.name)}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <div className="text-xs font-black text-slate-800 leading-none truncate">{item.user.name}</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">
                             {item.user.role}
                          </div>
                          {item.user.group && (
                            <div className="flex items-center gap-1 text-[7px] font-black text-[#76a73c] uppercase mt-0.5 truncate opacity-80">
                               <Building2 className="w-2 h-2" /> {item.user.group}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="md:px-6 px-3 md:py-3 py-2">
                       <div className="space-y-0.5">
                          <div className="text-[10px] font-black text-slate-700 uppercase italic truncate max-w-[140px]">
                             {item.lastProject}
                          </div>
                          <div className="flex flex-col gap-0.5">
                             {isActive ? (
                               <>
                                 <div className="flex items-center gap-1.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                   <span className="text-[9px] font-black text-blue-600 font-mono">
                                     {formatDuration(currentSessionDuration)}
                                   </span>
                                 </div>
                                 <div className="text-[8px] font-bold text-slate-400 uppercase italic">
                                    Punch In: <span className="text-black">{item.lastPunch?.timestamp.split(/[ ,]+/)[1]?.slice(0, 5) || '--:--'}</span>
                                 </div>
                               </>
                             ) : (
                               <div className="flex items-center gap-1.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                                   {item.lastPunch ? `${item.lastPunch.timestamp.split(/[ ,]+/)[0]} ${item.lastPunch.timestamp.split(/[ ,]+/)[1]?.slice(0, 5)}` : 'Hors ligne'}
                                 </span>
                               </div>
                             )}
                          </div>
                       </div>
                    </td>
                    <td className="md:px-6 px-3 md:py-3 py-2">
                       <div className="text-[11px] font-black text-slate-800 font-mono leading-none">
                         {formatDuration(totalWeekMs)}
                       </div>
                    </td>
                    <td className="md:px-6 px-3 md:py-3 py-2">
                       <div className="flex flex-col items-end gap-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden max-w-[120px]">
                             <div 
                               className={`h-full rounded-full transition-all duration-1000 ${isActive ? 'bg-[#76a73c]' : 'bg-orange-500'}`}
                               style={{ width: `${progressPercent}%` }}
                             ></div>
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase">{Math.round(progressPercent)}%</span>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
         <div className="bg-blue-600 md:p-6 p-4 rounded-2xl text-white shadow-lg">
            <div className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-70">Effectif Actif</div>
            <div className="md:text-4xl text-2xl font-black italic">{teamActivities.filter(a => a.status === 'in_progress').length} <span className="text-sm opacity-50">/ {teamActivities.length}</span></div>
         </div>
         
         <div className="bg-black p-4 md:p-6 rounded-2xl text-white shadow-lg flex flex-col justify-center">
            <div className="text-[8px] font-black uppercase tracking-widest mb-0.5 text-[#76a73c]">Heures Semaine (Cumul)</div>
            <div className="md:text-4xl text-2xl font-black italic font-mono leading-none">
               {Math.floor(teamActivities.reduce((acc, cur) => acc + cur.weekMs, 0) / 3600000)}h
            </div>
         </div>

         <div className="bg-white md:p-6 p-3 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-center">
            <button onClick={onBack} className="w-full md:py-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-black font-black uppercase text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2">
               <ArrowLeft className="w-3.5 h-3.5" /> Menu
            </button>
         </div>
      </div>
    </div>
  );
};

export default DashboardView;
