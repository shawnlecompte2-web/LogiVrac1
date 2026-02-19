
import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Lock, Delete, ArrowRight } from 'lucide-react';

interface Props {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

const LoginView: React.FC<Props> = ({ users, onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = (code: string) => {
    const user = users.find(u => u.code === code);
    if (user) {
      setError(false);
      onLogin(user);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 1000);
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white w-full">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-12 text-center">
          <span className="text-[10px] font-black tracking-[0.4em] text-[#76a73c] block mb-2 uppercase">Services Intégrés Logistiques</span>
          <h1 className="text-5xl font-black italic tracking-tighter text-white">GROUPE <span className="text-[#76a73c]">DDL</span></h1>
          <div className="mt-10 flex flex-col items-center">
            <div className={`p-6 rounded-full mb-6 ${error ? 'bg-red-500 animate-shake' : 'bg-[#76a73c]'}`}>
              <Lock className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Authentification</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Veuillez entrer votre code PIN</p>
            <div className="flex gap-6 mt-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-[#76a73c] border-[#76a73c] scale-150 shadow-[0_0_15px_rgba(118,167,60,0.5)]' : 'border-white/20'}`} />
              ))}
            </div>
            {error && <p className="text-red-500 text-xs font-black uppercase mt-6 animate-pulse">Code PIN Incorrect</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-[320px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleKeyPress(num.toString())} className="w-24 h-24 rounded-[2rem] bg-white/5 hover:bg-white/15 text-3xl font-black transition-all active:scale-90 flex items-center justify-center border border-white/5 hover:border-[#76a73c]/30">
              {num}
            </button>
          ))}
          <div />
          <button onClick={() => handleKeyPress('0')} className="w-24 h-24 rounded-[2rem] bg-white/5 hover:bg-white/15 text-3xl font-black transition-all active:scale-90 flex items-center justify-center border border-white/5 hover:border-[#76a73c]/30">0</button>
          <button onClick={handleDelete} className="w-24 h-24 rounded-[2rem] bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-90 flex items-center justify-center border border-red-500/10">
            <Delete className="w-8 h-8" />
          </button>
        </div>

        <div className="mt-16 text-[10px] font-black opacity-30 tracking-[0.3em] uppercase text-center">
          Terminal Sécurisé — Logistique Mobile
        </div>
      </div>
    </div>
  );
};

export default LoginView;
