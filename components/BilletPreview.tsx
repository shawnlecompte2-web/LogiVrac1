
import React from 'react';
import { BilletData } from '../types';

interface Props {
  data: BilletData;
}

const BilletPreview: React.FC<Props> = ({ data }) => {
  const displayVal = (field: keyof BilletData, otherField?: keyof BilletData) => {
    if (data[field] === "Autre" && otherField && data[otherField]) {
      return data[otherField];
    }
    return data[field] || "---";
  };

  return (
    <div className="bg-white rounded-none shadow-none print:shadow-none border-2 border-black max-w-full print:w-full print:h-[26.5cm] print:max-h-[26.5cm] mx-auto flex flex-col overflow-hidden text-black leading-tight">
      {/* HEADER OPTIMISÉ POUR TENIR SUR UNE PAGE */}
      <div className="flex justify-between items-stretch border-b-4 border-black">
        <div className="p-6 print:p-6 flex-1 border-r-4 border-black bg-white flex flex-col justify-center">
          <h1 className="text-4xl print:text-5xl font-black italic tracking-tighter leading-none text-black">
            GROUPE <span className="text-[#76a73c]">DDL</span>
          </h1>
          <div className="text-[10px] print:text-xs font-black tracking-[0.3em] text-slate-400 uppercase mt-2">LOGISTIQUE • TRANSPORT</div>
        </div>
        <div className="bg-black text-white p-6 print:p-6 flex flex-col justify-center items-end min-w-[200px] print:min-w-[250px]">
          <div className="text-[10px] print:text-sm font-black text-[#76a73c] uppercase tracking-widest leading-none mb-1">BILLET DE TRANSPORT</div>
          <div className="text-2xl print:text-4xl font-black font-mono tracking-tighter">{data.id}</div>
          <div className={`mt-3 px-4 py-1 rounded-full text-[8px] print:text-[10px] font-black uppercase tracking-widest ${data.status === 'approved' ? 'bg-[#76a73c] text-black' : 'bg-orange-500 text-black'}`}>
            {data.status === 'approved' ? 'BILLET APPROUVÉ' : 'EN ATTENTE'}
          </div>
        </div>
      </div>

      {/* MÉTHADONNÉES LOGISTIQUES */}
      <div className="grid grid-cols-3 border-b-4 border-black bg-slate-50 text-[10px] print:text-xs font-bold uppercase">
        <div className="p-4 print:p-4 border-r-4 border-black">
          <span className="text-slate-400 block mb-1 font-black">ÉMIS LE</span>
          <span className="font-black text-sm print:text-xl">{data.date} <span className="text-slate-300 mx-2">|</span> {data.time}</span>
        </div>
        <div className="p-4 print:p-4 border-r-4 border-black">
          <span className="text-slate-400 block mb-1 font-black">ÉMETTEUR</span>
          <span className="font-black text-sm print:text-xl">{data.issuerName || "---"}</span>
        </div>
        <div className="p-4 print:p-4">
          <span className="text-slate-400 block mb-1 font-black">CLIENT</span>
          <span className="font-black text-sm print:text-xl truncate block">{data.clientName || "---"}</span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL SERRÉ POUR L'IMPRESSION */}
      <div className="p-6 print:p-8 space-y-8 print:space-y-10 flex-1">
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 print:gap-x-16 print:gap-y-10">
          <div className="border-b-2 border-slate-200 pb-3 print:pb-4">
            <span className="text-[8px] print:text-[10px] font-black text-[#76a73c] uppercase tracking-widest block mb-1 print:mb-2">PROVENANCE / ORIGINE</span>
            <span className="text-base print:text-3xl font-black uppercase italic tracking-tight">{data.provenance}</span>
          </div>

          <div className="border-b-2 border-slate-200 pb-3 print:pb-4">
            <span className="text-[8px] print:text-[10px] font-black text-[#76a73c] uppercase tracking-widest block mb-1 print:mb-2">DESTINATION / SITE</span>
            <span className="text-base print:text-3xl font-black uppercase italic tracking-tight">{displayVal("destination", "destinationOther")}</span>
          </div>

          <div className="border-b-2 border-slate-200 pb-3 print:pb-4">
            <span className="text-[8px] print:text-[10px] font-black text-[#76a73c] uppercase tracking-widest block mb-1 print:mb-2">MATÉRIAU</span>
            <span className="text-base print:text-3xl font-black uppercase italic tracking-tight">{displayVal("typeSol", "typeSolOther")}</span>
          </div>

          <div className="border-b-2 border-slate-200 pb-3 print:pb-4">
            <span className="text-[8px] print:text-[10px] font-black text-[#76a73c] uppercase tracking-widest block mb-1 print:mb-2">TRANSPORTEUR</span>
            <span className="text-base print:text-3xl font-black uppercase italic tracking-tight">{displayVal("transporteur", "transporteurOther")}</span>
          </div>
        </div>

        {/* SECTION TRANSPORT & POIDS */}
        <div className="flex border-4 border-black overflow-hidden rounded-sm print:rounded-none">
          <div className="flex-1 bg-slate-900 text-white p-6 print:p-8">
            <span className="text-[8px] print:text-[10px] font-black text-[#76a73c] uppercase tracking-widest block mb-2 italic">UNITÉ DE TRANSPORT</span>
            <div className="text-2xl print:text-5xl font-black uppercase italic leading-none tracking-tighter">PLAQUE : {displayVal("plaque", "plaqueOther")}</div>
          </div>
          <div className="bg-[#76a73c] text-black p-6 print:p-8 min-w-[150px] print:min-w-[220px] text-center flex flex-col justify-center border-l-4 border-black">
            <span className="text-[8px] print:text-[10px] font-black uppercase tracking-widest leading-none mb-2">TONNAGE BRUT</span>
            <div className="text-4xl print:text-6xl font-black font-mono leading-none tracking-tighter">{displayVal("quantite", "quantiteOther")} T</div>
          </div>
        </div>
      </div>

      {/* FOOTER ET SIGNATURES */}
      <div className="p-8 print:p-8 bg-white border-t-4 border-black">
        <div className="grid grid-cols-2 gap-20 print:gap-32">
          <div className="flex flex-col">
            <div className="flex-1 border-b-2 border-black min-h-[60px] print:min-h-[80px]"></div>
            <div className="text-[8px] print:text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">SIGNATURE DU CHAUFFEUR</div>
          </div>
          <div className="flex flex-col">
            <div className="flex-1 border-b-2 border-black min-h-[60px] print:min-h-[80px] flex items-end justify-center pb-2">
              {data.status === 'approved' && (
                <div className="border-2 border-[#76a73c] text-[#76a73c] px-4 py-2 rounded-full text-[10px] print:text-sm font-black uppercase rotate-[-2deg] bg-white/80 shadow-sm">
                   REÇU PAR {data.approverName || 'SYSTÈME'}
                </div>
              )}
            </div>
            <div className="text-[8px] print:text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">VALIDATION RÉCEPTION</div>
          </div>
        </div>
        
        <div className="mt-8 print:mt-10 flex justify-between items-center opacity-70">
          <div>
            <p className="text-[8px] print:text-[10px] text-black font-black uppercase tracking-widest">
              LOGIVRAC • GROUPE DDL EXCAVATION INC.
            </p>
          </div>
          <div className="text-right">
             <p className="text-[6px] print:text-[8px] text-slate-300 font-bold uppercase italic tracking-tighter">
               GÉNÉRÉ LE {new Date().toLocaleString('fr-FR')}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BilletPreview;
