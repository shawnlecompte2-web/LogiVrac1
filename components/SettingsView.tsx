
import React, { useState, useMemo } from 'react';
import { AppSettings, UserAccount, Permission, UserRole } from '../types';
import { Plus, Trash2, Save, User, Shield, Key, Truck, ArrowLeft, ChevronRight, Settings2, Users, Briefcase, Search, ChevronDown, UserCircle, ShieldCheck, HardHat, Info } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

type SettingsSubView = 'menu' | 'users';

const SettingsView: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [subView, setSubView] = useState<SettingsSubView>('menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const addUser = () => {
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      name: 'Nouvel Utilisateur',
      code: Math.floor(1000 + Math.random() * 8999).toString(),
      role: 'user',
      group: 'DDL Excavation',
      permissions: ['punch']
    };
    setLocalSettings(prev => ({ ...prev, users: [...prev.users, newUser] }));
    setExpandedUserId(newUser.id);
  };

  const removeUser = (id: string) => {
    if (localSettings.users.length <= 1) return;
    if (window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
      setLocalSettings(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    }
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setLocalSettings(prev => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          
          // Mise à jour automatique des permissions selon le rôle
          const fieldRoles: UserRole[] = ['chauffeur', 'mécano', 'manoeuvre', 'operateur', 'opérateur_cour'];
          const fullAccessRoles: UserRole[] = ['admin', 'surintendant', 'chargée_de_projet'];

          if (updates.role && fieldRoles.includes(updates.role as UserRole)) {
            updated.permissions = ['punch'];
          } else if (updates.role && fullAccessRoles.includes(updates.role as UserRole)) {
            updated.permissions = ['punch', 'envoi', 'reception', 'history', 'provenance', 'reports', 'settings', 'approval'];
          } else if (updates.role === 'gestionnaire_cour') {
            updated.permissions = ['punch', 'reception', 'approval', 'history', 'provenance', 'reports'];
          } else if (updates.role === 'contremaitre') {
            updated.permissions = ['punch', 'approval', 'envoi', 'reception', 'history', 'provenance', 'reports'];
          } else if (updates.role === 'gestionnaire_mécano' || updates.role === 'gestionnaire_chauffeur') {
            updated.permissions = ['punch', 'approval'];
          }
          
          return updated;
        }
        return u;
      })
    }));
  };

  const togglePermission = (userId: string, perm: Permission) => {
    const user = localSettings.users.find(u => u.id === userId);
    if (!user) return;
    
    // Certains rôles ont des permissions fixes
    const restrictedRoles: UserRole[] = [
      'chauffeur', 'mécano', 'manoeuvre', 'operateur', 'opérateur_cour', 
      'gestionnaire_cour', 'contremaitre', 'gestionnaire_mécano', 'gestionnaire_chauffeur',
      'surintendant', 'chargée_de_projet'
    ];
    if (restrictedRoles.includes(user.role)) return;
    
    const newPermissions = user.permissions.includes(perm)
      ? user.permissions.filter(p => p !== perm)
      : [...user.permissions, perm];
    updateUser(userId, { permissions: newPermissions });
  };

  const filteredUsers = useMemo(() => {
    return localSettings.users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.group && u.group.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [localSettings.users, searchTerm]);

  if (subView === 'menu') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase italic text-black tracking-tighter">Configuration</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choisissez une section à modifier</p>
        </div>

        <div className="grid gap-4">
          <button 
            onClick={() => setSubView('users')}
            className="group bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 hover:border-black shadow-sm flex items-center gap-5 transition-all active:scale-95 w-full"
          >
            <div className="bg-black p-4 rounded-2xl text-[#76a73c] shadow-lg group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-black text-black uppercase italic leading-none">Utilisateurs</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Codes PIN & Permissions ({localSettings.users.length})</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-black" />
          </button>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 text-center">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-4">Modifications globales</p>
          <button 
            onClick={() => onSave(localSettings)} 
            className="w-full py-4 bg-black text-[#76a73c] font-black uppercase italic rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Save className="w-5 h-5" /> Enregistrer tout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right duration-300 pb-32">
      {/* HEADER FIXE INTERNE */}
      <div className="sticky top-0 bg-slate-50 z-10 pb-4 space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSubView('menu')}
            className="flex items-center gap-1 text-black font-black uppercase text-[10px] bg-slate-200 px-3 py-1.5 rounded-lg active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" /> Retour
          </button>
          <button onClick={addUser} className="flex items-center gap-1 text-[10px] font-black text-white uppercase bg-[#76a73c] px-3 py-2 rounded-lg shadow-md active:scale-95 transition-transform">
            <Plus className="w-4 h-4" /> Nouvel Utilisateur
          </button>
        </div>

        <div className="bg-black text-white p-4 rounded-2xl border-b-4 border-[#76a73c] shadow-md">
           <div className="flex justify-between items-center">
             <div>
               <h3 className="text-lg font-black uppercase italic tracking-tighter">Gestion des Accès</h3>
               <p className="text-[9px] font-bold text-[#76a73c] uppercase tracking-widest">Configuration des profils ({filteredUsers.length})</p>
             </div>
             <Users className="w-6 h-6 text-[#76a73c]" />
           </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher un nom, un rôle ou une division..."
            className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-black font-bold text-sm text-black shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTE DES UTILISATEURS */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Search className="w-10 h-10 text-slate-100 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-300 uppercase italic">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const isExpanded = expandedUserId === user.id;
            const isRestricted = ['chauffeur', 'mécano', 'manoeuvre', 'operateur', 'opérateur_cour', 'gestionnaire_cour', 'contremaitre', 'gestionnaire_mécano', 'gestionnaire_chauffeur', 'surintendant', 'chargée_de_projet'].includes(user.role);
            
            return (
              <div key={user.id} className={`bg-white rounded-3xl border-2 transition-all shadow-sm overflow-hidden ${isExpanded ? 'border-black ring-2 ring-black/5' : 'border-slate-100 hover:border-slate-300'}`}>
                {/* ENTÊTE DE CARTE (ACCORDÉON) */}
                <div 
                  onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm ${isExpanded ? 'bg-black' : 'bg-slate-100 text-slate-400'}`}>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black uppercase leading-none mb-1">{user.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-[#76a73c] uppercase bg-[#76a73c]/10 px-1.5 py-0.5 rounded">{user.role.replace('_', ' ')}</span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase">{user.group}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-[8px] font-black text-slate-300 uppercase">PIN</div>
                      <div className="text-xs font-mono font-black text-black">{user.code}</div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-black" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                  </div>
                </div>

                {/* CONTENU ÉLARGI */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-50 space-y-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* IDENTITÉ */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircle className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 uppercase">Informations Personnelles</span>
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-300 uppercase ml-1">Nom Complet</label>
                          <input 
                            value={user.name} 
                            onChange={(e) => updateUser(user.id, { name: e.target.value })} 
                            className="w-full text-xs font-black text-black bg-slate-50 px-3 py-2 rounded-xl outline-none border border-transparent focus:border-black transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-300 uppercase ml-1">Division / Groupe</label>
                          <select 
                            value={user.group || ''} 
                            onChange={(e) => updateUser(user.id, { group: e.target.value })} 
                            className="w-full text-xs font-black text-black bg-slate-50 px-3 py-2 rounded-xl outline-none"
                          >
                            <option value="DDL Logistiques">DDL Logistiques</option>
                            <option value="DDL Excavation">DDL Excavation</option>
                            <option value="Groupe DDL">Groupe DDL</option>
                          </select>
                        </div>
                      </div>

                      {/* AUTH & RÔLE */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 uppercase">Authentification & Rôle</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black text-slate-300 uppercase ml-1">Code PIN</label>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                              <Key className="w-3 h-3 text-[#76a73c]" />
                              <input 
                                value={user.code} 
                                onChange={(e) => updateUser(user.id, { code: e.target.value.slice(0, 4) })} 
                                className="text-xs font-mono font-black text-black w-full bg-transparent outline-none" 
                                placeholder="0000" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-300 uppercase ml-1">Rôle Système</label>
                            <select 
                              value={user.role} 
                              onChange={(e) => updateUser(user.id, { role: e.target.value as any })} 
                              className="w-full text-xs font-black text-black bg-slate-50 px-3 py-2 rounded-xl outline-none"
                            >
                              <optgroup label="Transport">
                                <option value="chauffeur">Chauffeur</option>
                                <option value="gestionnaire_chauffeur">Gestionnaire Chauffeur</option>
                              </optgroup>
                              <optgroup label="Chantier">
                                <option value="operateur">Opérateur</option>
                                <option value="manoeuvre">Manoeuvre</option>
                                <option value="contremaitre">Contremaître</option>
                                <option value="opérateur_cour">Opérateur cour</option>
                                <option value="gestionnaire_cour">Gestionnaire Cour</option>
                              </optgroup>
                              <optgroup label="Support">
                                <option value="mécano">Mécano</option>
                                <option value="gestionnaire_mécano">Gestionnaire Mécano</option>
                              </optgroup>
                              <optgroup label="Bureau / Admin">
                                <option value="admin">Administrateur</option>
                                <option value="surintendant">Surintendant</option>
                                <option value="chargée_de_projet">Chargée de projet</option>
                                <option value="user">Employé Standard</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>
                        <div className="pt-2">
                          <div className={`p-2 rounded-xl border flex items-start gap-2 ${isRestricted ? 'bg-[#76a73c]/5 border-[#76a73c]/20' : 'bg-blue-50 border-blue-100'}`}>
                             {isRestricted ? <ShieldCheck className="w-4 h-4 text-[#76a73c] shrink-0" /> : <Info className="w-4 h-4 text-blue-500 shrink-0" />}
                             <p className="text-[8px] font-bold text-slate-600 uppercase leading-tight">
                               {isRestricted ? "Profil prédéfini : Les permissions sont gérées automatiquement par le système selon le rôle." : "Profil personnalisable : Vous pouvez modifier manuellement les accès ci-dessous."}
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PERMISSIONS */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <HardHat className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">Modules du menu</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['punch', 'envoi', 'reception', 'history', 'reports', 'settings', 'approval'] as Permission[]).map(p => (
                          <button 
                            key={p} 
                            disabled={isRestricted}
                            onClick={() => togglePermission(user.id, p)} 
                            className={`text-[9px] font-black uppercase px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${user.permissions.includes(p) ? 'bg-black text-[#76a73c] border-black shadow-md' : 'bg-white text-slate-300 border-slate-100'} ${isRestricted ? 'opacity-60 cursor-not-allowed' : 'hover:border-black active:scale-95'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${user.permissions.includes(p) ? 'bg-[#76a73c]' : 'bg-slate-200'}`}></div>
                            {p === 'envoi' ? 'Billet Envoi' : p === 'reception' ? 'Réception' : p === 'history' ? 'Historique' : p === 'reports' ? 'Rapports' : p === 'settings' ? 'Réglages' : p === 'approval' ? 'Approbation' : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ACTIONS BAS DE CARTE */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <button 
                        onClick={() => removeUser(user.id)}
                        disabled={user.name === 'Shawn Lecompte' || user.role === 'admin'}
                        className="flex items-center gap-1.5 text-[10px] font-black text-red-400 uppercase hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer ce compte
                      </button>
                      <button 
                        onClick={() => setExpandedUserId(null)}
                        className="text-[10px] font-black text-slate-400 uppercase hover:text-black transition-colors"
                      >
                        Fermer le profil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* BOUTON ENREGISTRER FLOTTANT */}
      <div className="fixed bottom-6 left-4 right-4 z-20 md:max-w-xl md:mx-auto">
        <button 
          onClick={() => { onSave(localSettings); setSubView('menu'); }} 
          className="w-full py-4 bg-black text-[#76a73c] font-black uppercase italic rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Save className="w-5 h-5" /> Enregistrer les changements
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
