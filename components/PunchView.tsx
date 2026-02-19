import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, PunchLog, UserAccount, BilletData } from '../types';
import { Clock, ArrowLeft, LogIn, LogOut, Search, Truck, Activity, User as UserIcon, MapPin, Coffee, ArrowLeftRight, X, Plus, Trash2, Edit3, Check, UserCircle, LayoutDashboard, RefreshCw } from 'lucide-react';

interface Props {
  settings: AppSettings;
  logs: PunchLog[];
  history: BilletData[];
  onPunch: (log: PunchLog) => void;
  onBack: () => void;
  currentUser: UserAccount | null;
  onAddProject: (type: 'provenances' | 'plaques', project: string) => void;
  onRemoveProject: (type: 'provenances' | 'plaques', project: string) => void;
}

const PunchView: React.FC<Props> = ({ settings, logs, history, onPunch, onBack, currentUser, onAddProject, onRemoveProject }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.name === 'Shawn Lecompte';
  const canSelectOthers = isAdmin || ['surintendant', 'chargée_de_projet'].includes(currentUser?.role || '');
  
  const [selectedEmployee, setSelectedEmployee] = useState(currentUser?.name || '');
  const [search, setSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [plaque, setPlaque] = useState('');
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);
  const [workNature, setWorkNature] = useState<'standard' | 'transport'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingList, setIsEditingList] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimestamp = (date = new Date()) => {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '');
  };

  const parseDate = (str: string) => {
    if (!str) return 0;
    const cleanTs = str.replace(',', '').trim();
    const parts = cleanTs.split(/\s+/);
    if (parts.length < 2) return 0;
    const [d, m, y] = parts[0].split('/').map(Number);
    const timeParts = parts[1].split(':').map(Number);
    const hh = timeParts[0] || 0;
    const mm = timeParts[1] || 0;
    const ss = timeParts[2] || 0;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  };

  const punchableUsers = settings.users.filter(u => u.permissions.includes('punch'));
  
  const filteredEmployees = useMemo(() => {
    if (!search) return [];
    return punchableUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, punchableUsers]);

  const punchingUser = useMemo(() => settings.users.find(u => u.name === selectedEmployee), [settings.users, selectedEmployee]);
  const role = punchingUser?.role;
  const isPlaqueRole = role === 'chauffeur' || role === 'gestionnaire_chauffeur';
  const isNoInputRole = role === 'mécano' || role === 'gestionnaire_mécano';
  
  const showTransportOption = !isPlaqueRole;

  const activePlaque = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('fr-FR');
    const userLogs = logs.filter(l => l.employeeName === selectedEmployee && l.timestamp.includes(todayStr));
    const sorted = [...userLogs].sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
    const lastIn = sorted.find(l => l.type === 'in');
    return lastIn?.plaque;
  }, [logs, selectedEmployee]);

  const dailyWorkDuration = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('fr-FR');
    const userLogs = logs.filter(l => l.employeeName === selectedEmployee && l.timestamp.includes(todayStr));
    
    const sortedLogs = [...userLogs].sort((a, b) => parseDate(a.timestamp) - parseDate(b.timestamp));
    let totalMs = 0;
    let currentInTime: number | null = null;

    sortedLogs.forEach(log => {
      const logMs = parseDate(log.timestamp);
      if (log.type === 'in') currentInTime = logMs;
      else if (log.type === 'out' && currentInTime !== null) {
        totalMs += (logMs - currentInTime);
        currentInTime = null;
      }
    });

    if (currentInTime !== null) totalMs += (currentTime.getTime() - currentInTime);

    const seconds = Math.floor((totalMs / 1000) % 60);
    const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
    const hours = Math.floor((totalMs / (1000 * 60 * 60)));

    return {
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      isActive: currentInTime !== null
    };
  }, [logs, selectedEmployee, currentTime]);

  const handlePunch = (type: 'in' | 'out') => {
    if (!selectedEmployee || isProcessing) return;
    setIsProcessing(true);
    
    const finalPlaque = type === 'in' ? (workNature === 'transport' ? 'TRANSPORT' : plaque) : undefined;

    const newLog: PunchLog = {
      id: `${type.toUpperCase()}-${Date.now()}`,
      employeeName: selectedEmployee,
      type,
      timestamp: getTimestamp(),
      plaque: finalPlaque,
      lunchMinutes: type === 'out' ? lunchMinutes : undefined,
      isTransport: type === 'in' ? (workNature === 'transport') : undefined
    };
    
    onPunch(newLog);
    
    setTimeout(() => {
      setPlaque('');
      setProjectSearch('');
      setIsSwitchingProject(false);
      setWorkNature('standard');
      setIsProcessing(false);
      setIsEditingList(false);
    }, 500);
  };

  const handleSwitchProject = () => {
    if (!selectedEmployee || isProcessing) return;
    setIsProcessing(true);

    const now = new Date();
    const outLog: PunchLog = {
      id: `OUT-SWITCH-${Date.now()}`,
      employeeName: selectedEmployee,
      type: 'out',
      timestamp: getTimestamp(now),
      lunchMinutes: 0
    };
    onPunch(outLog);

    setTimeout(() => {
      const switchInTime = new Date();
      const finalPlaque = workNature === 'transport' ? 'TRANSPORT' : plaque;
      const inLog: PunchLog = {
        id: `IN-SWITCH-${Date.now()}`,
        employeeName: selectedEmployee,
        type: 'in',
        timestamp: getTimestamp(switchInTime),
        plaque: finalPlaque,
        isTransport: workNature === 'transport'
      };
      onPunch(inLog);
      
      setIsSwitchingProject(false);
      setProjectSearch('');
      setPlaque('');
      setWorkNature('standard');
      setIsProcessing(false);
    }, 1000); // 1 seconde complète pour garantir un horodatage distinct
  };

  const availableProjects = useMemo(() => {
    const list = isPlaqueRole ? settings.plaques : settings.provenances;
    return list.filter(p => p.toLowerCase().includes(projectSearch.toLowerCase())).sort();
  }, [settings.plaques, settings.provenances, projectSearch, isPlaqueRole]);

  const handleQuickAdd = () => {
    if (!projectSearch.trim()) return;
    const type = isPlaqueRole ? 'plaques' : 'provenances';
    onAddProject(type, projectSearch.trim().toUpperCase());
    setPlaque(projectSearch.trim().toUpperCase());
    setProjectSearch(projectSearch.trim().toUpperCase());
  };

  const handleRemoveItem = (p: string) => {
    const type = isPlaqueRole ? 'plaques' : 'provenances';
    if (window.confirm(`Voulez-vous supprimer "${p}" de la liste globale ?`)) {
        onRemoveProject(type, p);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-2xl mx-auto pb-20 px-2 sm:px-0">
      <div className="flex justify-start">
        <button onClick={onBack} className="flex items-center gap-1 text-black font-black uppercase text-[10px] bg-white px-3 py-1.5 rounded-lg border border-slate-200 active:scale-95 transition-transform shadow-sm">
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl shadow-xl border-b-8 border-blue-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-white">Pointage Mobile</h2>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mt-1">Gérez votre temps et vos projets</p>
          </div>
        </div>
      </div>

      {canSelectOthers && (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Rechercher un employé</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Nom de l'employé" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm uppercase transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && filteredEmployees.length > 0 && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
              {filteredEmployees.map(u => (
                <button 
                  key={u.id} 
                  onClick={() => { setSelectedEmployee(u.name); setSearch(''); }}
                  className="w-full px-5 py-4 text-left hover:bg-blue-50 border-b-2 border-slate-50 last:border-0 font-black text-xs uppercase flex items-center justify-between group"
                >
                  <span className="text-slate-800 group-hover:text-blue-600 transition-colors">{u.name}</span>
                  <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded uppercase">{u.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-md space-y-6">
        <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-blue-500 shadow-sm">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Employé sélectionné</div>
              <div className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedEmployee || 'SÉLECTIONNEZ UN MEMBRE'}</div>
              <div className="text-[8px] font-black text-[#76a73c] uppercase mt-1 tracking-widest">{role || '---'} • {punchingUser?.group || '---'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100 text-center flex flex-col justify-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Statut actuel</div>
            <div className={`flex items-center justify-center gap-2 text-xs font-black uppercase italic ${dailyWorkDuration.isActive ? 'text-[#76a73c]' : 'text-slate-500'}`}>
               <div className={`w-2 h-2 rounded-full ${dailyWorkDuration.isActive ? 'bg-[#76a73c] animate-pulse' : 'bg-slate-300'}`}></div>
               {dailyWorkDuration.isActive ? 'POINTÉ' : 'DÉPOINTÉ'}
            </div>
          </div>
          <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100 text-center flex flex-col justify-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Temps du jour</div>
            <div className={`text-xl font-black font-mono leading-none ${dailyWorkDuration.isActive ? 'text-blue-600' : 'text-slate-800'}`}>
              {dailyWorkDuration.formatted}
            </div>
          </div>
        </div>

        {!dailyWorkDuration.isActive ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {showTransportOption && (
              <div className="flex gap-2 p-1">
                <button 
                  onClick={() => setWorkNature('standard')}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase italic border-2 transition-all flex flex-col items-center justify-center gap-1 ${workNature === 'standard' ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-100' : 'bg-slate-50 border-slate-100 text-slate-400 scale-[0.98]'}`}
                >
                   STANDARD
                </button>
                <button 
                  onClick={() => { setWorkNature('transport'); setPlaque(''); setProjectSearch(''); }}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase italic border-2 transition-all flex flex-col items-center justify-center gap-1 ${workNature === 'transport' ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-100' : 'bg-slate-50 border-slate-100 text-slate-400 scale-[0.98]'}`}
                >
                   TRANSPORT
                </button>
              </div>
            )}

            {!isNoInputRole && workNature === 'standard' && (
              <div className="space-y-3 p-1 animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {isPlaqueRole ? 'Camion / Plaque' : 'Chantier / Nature du travail'}
                  </label>
                  <button 
                    onClick={() => setIsEditingList(!isEditingList)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase italic bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3 h-3" /> {isEditingList ? 'Fermer' : 'Gérer la liste'}
                  </button>
                </div>
                
                <div className="flex gap-2 relative">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500" />
                      <input 
                        type="text" 
                        placeholder={isPlaqueRole ? "Entrez ou cherchez un camion..." : "Entrer ou chercher chantier"}
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm uppercase transition-all"
                        value={projectSearch}
                        onChange={(e) => { setProjectSearch(e.target.value); setPlaque(e.target.value); }}
                      />
                  </div>
                  <button 
                    onClick={handleQuickAdd}
                    disabled={!projectSearch.trim()}
                    className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90 disabled:opacity-50 transition-all"
                    title="Ajouter à la liste"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                {isEditingList ? (
                  <div className="bg-slate-900 rounded-3xl p-5 space-y-3 animate-in slide-in-from-top-4 duration-300 border-b-4 border-blue-600">
                    <div className="text-[9px] font-black text-[#76a73c] uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Edit3 className="w-3 h-3" /> Modification de la liste globale
                    </div>
                    <div className="grid gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        {availableProjects.map(p => (
                          <div key={p} className="flex items-center justify-between bg-white/10 p-3 rounded-xl group border border-white/5">
                            <span className="text-xs font-black text-white uppercase">{p}</span>
                            <button onClick={() => handleRemoveItem(p)} className="p-1.5 text-red-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableProjects.slice(0, 12).map(p => (
                        <button 
                          key={p} 
                          onClick={() => { setPlaque(p); setProjectSearch(p); }}
                          className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex items-center gap-2 ${plaque === p ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-sm'}`}
                        >
                          <MapPin className={`w-3 h-3 ${plaque === p ? 'text-blue-200' : 'text-blue-500'}`} />
                          {p}
                        </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {workNature === 'transport' && (
              <div className="bg-blue-50 p-6 rounded-3xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95 duration-300">
                <Truck className="w-10 h-10 text-blue-500" />
                <div>
                  <p className="text-sm font-black text-blue-800 uppercase italic">Mode Transport Sélectionné</p>
                  <p className="text-[9px] font-bold text-blue-400 uppercase">Le segment sera automatiquement approuvé comme transport général.</p>
                </div>
              </div>
            )}

            <button 
              disabled={!selectedEmployee || (!isNoInputRole && workNature === 'standard' && !plaque.trim()) || isProcessing}
              onClick={() => handlePunch('in')}
              className="w-full py-6 bg-[#b2d392] text-white font-black uppercase italic text-2xl rounded-3xl shadow-[0_10px_30px_rgba(178,211,146,0.3)] hover:brightness-105 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale border-b-8 border-[#76a73c]"
            >
              <LogIn className="w-8 h-8" /> Pointer (In)
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Segment actif sur</div>
                       <div className="text-lg font-black text-blue-800 uppercase italic tracking-tighter leading-none">{activePlaque || 'GÉNÉRAL'}</div>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsSwitchingProject(!isSwitchingProject)}
                   className={`p-3 rounded-xl border-2 transition-all active:scale-95 flex items-center gap-2 ${isSwitchingProject ? 'bg-black text-white border-black' : 'bg-white text-blue-600 border-blue-200'}`}
                 >
                   <RefreshCw className={`w-4 h-4 ${isSwitchingProject ? 'animate-spin' : ''}`} />
                   <span className="text-[9px] font-black uppercase">{isSwitchingProject ? 'Annuler' : 'Changer'}</span>
                 </button>
              </div>

              {isSwitchingProject && (
                <div className="pt-4 border-t border-blue-200 space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setWorkNature('standard')}
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${workNature === 'standard' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-300'}`}
                    >
                      CHANTIER
                    </button>
                    <button 
                      onClick={() => { setWorkNature('transport'); setPlaque(''); setProjectSearch(''); }}
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${workNature === 'transport' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-300'}`}
                    >
                      TRANSPORT
                    </button>
                  </div>

                  {workNature === 'standard' && (
                    <div className="space-y-3">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input 
                          type="text" 
                          placeholder="Chercher nouveau projet..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-blue-100 bg-white outline-none font-bold text-xs uppercase"
                          value={projectSearch}
                          onChange={(e) => { setProjectSearch(e.target.value); setPlaque(e.target.value); }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableProjects.slice(0, 8).map(p => (
                          <button 
                            key={p} 
                            onClick={() => { setPlaque(p); setProjectSearch(p); }}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${plaque === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-50 text-blue-400'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={workNature === 'standard' && !plaque.trim()}
                    onClick={handleSwitchProject}
                    className="w-full py-4 bg-blue-600 text-white font-black uppercase italic rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Confirmer le changement
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-5 rounded-[2.5rem] border-2 border-slate-100 space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase italic px-1">
                     <Coffee className="w-4 h-4 text-orange-500" /> Temps de dîner à déduire
                   </div>
                   <div className="grid grid-cols-5 gap-2">
                     {[0, 15, 30, 45, 60].map(m => (
                       <button key={m} onClick={() => setLunchMinutes(m)} className={`py-3 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${lunchMinutes === m ? 'bg-black text-orange-500 border-black shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-orange-200'}`}>
                         {m}m
                       </button>
                     ))}
                   </div>
                </div>

                <button 
                  onClick={() => handlePunch('out')}
                  className="w-full py-6 bg-red-500 text-white font-black uppercase italic text-2xl rounded-3xl shadow-[0_10px_30px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-8 border-red-900"
                >
                  <LogOut className="w-8 h-8" /> Dépointer (Out)
                </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center opacity-30 mt-8">
         <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-800">Logivrac Logistique Mobile</p>
      </div>
    </div>
  );
};

export default PunchView;