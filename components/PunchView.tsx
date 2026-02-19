
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, PunchLog, UserAccount, BilletData } from '../types';
import { Clock, ArrowLeft, LogIn, LogOut, Search, Truck, Activity, User as UserIcon, ClipboardList, ChevronDown, MapPin, Coffee, ArrowLeftRight, X, Briefcase, Plus, Trash2, Edit3, Check } from 'lucide-react';

interface Props {
  settings: AppSettings;
  logs: PunchLog[];
  history: BilletData[];
  onPunch: (log: PunchLog) => void;
  onBack: () => void;
  currentUser: UserAccount | null;
  onAddProject: (project: string) => void;
  onRemoveProject: (project: string) => void;
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
    const parts = str.trim().split(/\s+/);
    if (parts.length < 2) return 0;
    const [d, m, y] = parts[0].split('/').map(Number);
    const [h, min, s] = parts[1].split(':').map(Number);
    return new Date(y, m - 1, d, h || 0, min || 0, s || 0).getTime();
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

  const dailyProduction = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const userBillets = history.filter(b => {
      const isToday = b.date === todayStr;
      if (!isToday) return false;

      if (isPlaqueRole && activePlaque) {
        const bPlaque = (b.plaque === 'Autre' ? b.plaqueOther : b.plaque)?.trim().toUpperCase();
        const aPlaque = activePlaque.trim().toUpperCase();
        return bPlaque === aPlaque;
      }
      
      return b.issuerName === selectedEmployee;
    });
    
    const materials: Record<string, { tons: number; trips: number }> = {};
    let totalTons = 0;

    userBillets.forEach(b => {
      const mat = b.typeSol === 'Autre' ? (b.typeSolOther || 'Autre') : (b.typeSol || 'Inconnu');
      const tons = parseFloat(b.quantite === 'Autre' ? (b.quantiteOther || '0') : (b.quantite || '0')) || 0;
      if (!materials[mat]) {
        materials[mat] = { tons: 0, trips: 0 };
      }
      materials[mat].tons += tons;
      materials[mat].trips += 1;
      totalTons += tons;
    });

    return {
      trips: userBillets.length,
      totalTons,
      materials
    };
  }, [history, selectedEmployee, isPlaqueRole, activePlaque]);

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
    if (!selectedEmployee || !plaque.trim() || isProcessing) return;
    setIsProcessing(true);
    
    const now = new Date();
    const nextSec = new Date(now.getTime() + 1000);
    
    const outLog: PunchLog = {
      id: `SWITCH-OUT-${Date.now()}`,
      employeeName: selectedEmployee,
      type: 'out',
      timestamp: getTimestamp(now),
      lunchMinutes: 0
    };
    onPunch(outLog);

    const inLog: PunchLog = {
      id: `SWITCH-IN-${Date.now() + 500}`,
      employeeName: selectedEmployee,
      type: 'in',
      timestamp: getTimestamp(nextSec),
      plaque: plaque,
      isTransport: false
    };
    onPunch(inLog);

    setTimeout(() => {
      setPlaque('');
      setProjectSearch('');
      setIsSwitchingProject(false);
      setWorkNature('standard');
      setIsProcessing(false);
      setIsEditingList(false);
    }, 800);
  };

  const availableProjects = useMemo(() => {
    const list = isPlaqueRole ? settings.plaques : settings.provenances;
    return list.filter(p => p.toLowerCase().includes(projectSearch.toLowerCase())).sort();
  }, [settings.plaques, settings.provenances, projectSearch, isPlaqueRole]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-black font-black uppercase text-[10px] bg-slate-200 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentTime.toLocaleDateString('fr-FR')}</div>
          <div className="text-xl font-black text-black font-mono leading-none">{currentTime.toLocaleTimeString('fr-FR')}</div>
        </div>
      </div>

      <div className="bg-blue-600 p-6 rounded-3xl shadow-xl text-white border-b-4 border-black/20">
        <Clock className="w-8 h-8 mb-2" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Pointage Mobile</h2>
        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">Gérez votre temps et vos projets</p>
      </div>

      {canSelectOthers && (
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
            <Search className="w-3 h-3" /> Rechercher un employé
          </label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all"
            placeholder="Nom de l'employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredEmployees.length > 0 && search && (
            <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 mt-2">
              {filteredEmployees.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedEmployee(u.name); setSearch(''); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 text-black uppercase"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Employé sélectionné</div>
            <h3 className="text-lg font-black text-black uppercase italic">{selectedEmployee || 'Aucun'}</h3>
            {punchingUser && <div className="text-[8px] font-bold text-[#76a73c] uppercase tracking-widest">{punchingUser.role.replace('_', ' ')} • {punchingUser.group}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Statut actuel</div>
            <div className={`text-xs font-black uppercase flex items-center justify-center gap-1.5 ${dailyWorkDuration.isActive ? 'text-[#76a73c]' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${dailyWorkDuration.isActive ? 'bg-[#76a73c] animate-pulse' : 'bg-slate-300'}`}></div>
              {dailyWorkDuration.isActive ? 'En poste' : 'Dépointé'}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Temps du jour</div>
            <div className="text-sm font-black text-black font-mono">{dailyWorkDuration.formatted}</div>
          </div>
        </div>

        {dailyWorkDuration.isActive && !isNoInputRole && (
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase">{isPlaqueRole ? 'Camion Actif' : 'Chantier Actif'}</span>
            </div>
            <div className="text-sm font-black text-blue-900 uppercase italic">{activePlaque || (isPlaqueRole ? 'Général' : 'Non spécifié')}</div>
            {!isSwitchingProject && (
              <button
                onClick={() => setIsSwitchingProject(true)}
                className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase hover:underline"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Changer de projet
              </button>
            )}
          </div>
        )}

        {(!dailyWorkDuration.isActive || isSwitchingProject) && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            {!isNoInputRole && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {isPlaqueRole ? 'Camion (Plaque)' : 'Chantier / Nature du travail'}
                  </label>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsEditingList(!isEditingList)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${isEditingList ? 'bg-black text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      {isEditingList ? <Check className="w-2.5 h-2.5" /> : <Edit3 className="w-2.5 h-2.5" />}
                      {isEditingList ? 'Terminer' : 'Gérer la liste'}
                    </button>
                  )}
                </div>

                {/* Champ de recherche/saisie */}
                <div className="relative">
                  <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus-within:border-blue-500 shadow-sm transition-all group">
                    <Search className="w-4 h-4 text-slate-400 mr-3" />
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm font-black uppercase outline-none text-black"
                      placeholder={isPlaqueRole ? "Entrer ou chercher plaque..." : "Entrer ou chercher chantier..."}
                      value={projectSearch}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setProjectSearch(val);
                        setPlaque(val); // Saisie libre par défaut
                      }}
                    />
                    {projectSearch && (
                      <button onClick={() => { setProjectSearch(''); setPlaque(''); }} className="text-slate-300 hover:text-slate-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grille de choix rapides modifiable */}
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 max-h-52 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableProjects.length === 0 && projectSearch ? (
                      <button 
                        onClick={() => {
                          setPlaque(projectSearch);
                        }}
                        className="col-span-full py-4 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Utiliser "{projectSearch}" (Nouveau)
                      </button>
                    ) : (
                      availableProjects.map(p => (
                        <div key={p} className="relative group">
                          <button
                            type="button"
                            onClick={() => { setPlaque(p); setProjectSearch(p); }}
                            className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all uppercase text-[10px] font-black h-full flex items-center justify-between ${plaque === p ? 'bg-black text-white border-black shadow-md scale-[1.02]' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}
                          >
                            <span className="truncate mr-1">{p}</span>
                            {plaque === p && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                          {isEditingList && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if(window.confirm(`Supprimer "${p}" de la liste ?`)) onRemoveProject(p);
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 active:scale-90 transition-transform z-10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {showTransportOption && !isSwitchingProject && (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setWorkNature('standard'); setPlaque(''); setProjectSearch(''); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${workNature === 'standard' ? 'bg-white text-black shadow-sm' : 'text-slate-400'}`}
                >
                  <Activity className="w-3.5 h-3.5 inline mr-1" /> Chantier
                </button>
                <button
                  type="button"
                  onClick={() => { setWorkNature('transport'); setPlaque('TRANSPORT'); setProjectSearch('TRANSPORT'); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${workNature === 'transport' ? 'bg-[#76a73c] text-white shadow-sm' : 'text-slate-400'}`}
                >
                  <Truck className="w-3.5 h-3.5 inline mr-1" /> Transport
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {isSwitchingProject && (
                <button
                  onClick={() => { setIsSwitchingProject(false); setPlaque(''); setProjectSearch(''); }}
                  className="flex-1 py-4 bg-slate-200 text-slate-600 font-black uppercase italic rounded-2xl active:scale-95 transition-transform"
                >
                  Annuler
                </button>
              )}
              <button
                disabled={!selectedEmployee || (!isNoInputRole && !plaque.trim()) || isProcessing}
                onClick={() => isSwitchingProject ? handleSwitchProject() : handlePunch('in')}
                className={`flex-[2] py-4 bg-[#76a73c] text-white font-black uppercase italic rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale`}
              >
                <LogIn className="w-5 h-5" /> {isSwitchingProject ? 'Confirmer' : 'Pointer (In)'}
              </button>
            </div>
          </div>
        )}

        {dailyWorkDuration.isActive && !isSwitchingProject && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-2 mb-3">
                <Coffee className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-black text-orange-700 uppercase">Temps de dîner</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[0, 15, 30, 45, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => setLunchMinutes(m)}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all ${lunchMinutes === m ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={() => handlePunch('out')}
              className="w-full py-4 bg-red-500 text-white font-black uppercase italic rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" /> Dépointer (Out)
            </button>
          </div>
        )}
      </div>

      {dailyProduction.trips > 0 && (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ClipboardList className="w-4 h-4 text-[#76a73c]" />
            <span className="text-[10px] font-black text-slate-400 uppercase italic">Productivité du jour</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <div className="text-[8px] font-black text-slate-300 uppercase mb-1">Voyages</div>
              <div className="text-xl font-black text-black">{dailyProduction.trips}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <div className="text-[8px] font-black text-slate-300 uppercase mb-1">Tonnage</div>
              <div className="text-xl font-black text-[#76a73c]">{Math.round(dailyProduction.totalTons)} T</div>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(dailyProduction.materials).map(([mat, data]: [string, any]) => (
              <div key={mat} className="flex justify-between items-center text-[10px] font-bold uppercase bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-600 truncate mr-2">{mat}</span>
                <span className="text-black shrink-0">{data.trips} v. / {Math.round(data.tons)} T</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PunchView;
