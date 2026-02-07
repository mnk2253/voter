
import React from 'react';

interface DialerProps {
  number: string;
  onDial: (num: string) => void;
  onBackspace: () => void;
  onCall: () => void;
}

const Dialer: React.FC<DialerProps> = ({ number, onDial, onBackspace, onCall }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      <div className="flex-1 flex flex-col justify-center items-center py-6">
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 mb-4">
          <img src="https://flagcdn.com/w20/bd.png" alt="BD" className="rounded-sm opacity-80" />
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">BD Ghost Gateway</span>
        </div>
        <div className="text-4xl font-bold tracking-[0.2em] text-white text-center break-all h-16 flex items-center justify-center px-4">
          {number || 'Dial Now'}
        </div>
        <div className="flex items-center space-x-2 mt-2 opacity-50">
          <i className="fas fa-lock text-[8px] text-emerald-500"></i>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">End-to-End Ghosting Active</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 px-4 mb-8">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => onDial(key)}
            className="keypad-button h-16 w-16 mx-auto rounded-full glass flex flex-col items-center justify-center hover:bg-slate-700/50 transition-all border border-transparent active:border-emerald-500/30 active:bg-emerald-500/10"
          >
            <span className="text-xl font-bold text-slate-200">{key}</span>
            {key === '0' && <span className="text-[8px] text-slate-500 font-bold tracking-widest">+</span>}
          </button>
        ))}
        <div className="col-span-1"></div>
        <div className="col-span-1 flex justify-center">
          <button
            onClick={onCall}
            disabled={!number}
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
              number 
                ? 'bg-emerald-500 hover:bg-emerald-400 glow-green active:scale-90' 
                : 'bg-slate-800 opacity-20 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-phone text-xl text-white"></i>
          </button>
        </div>
        <div className="col-span-1 flex justify-center items-center">
          {number && (
            <button
              onClick={onBackspace}
              className="h-12 w-12 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors active:scale-90"
            >
              <i className="fas fa-backspace text-lg"></i>
            </button>
          )}
        </div>
      </div>
      
      <div className="px-8 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center mb-6">
         <p className="text-[10px] text-emerald-400/80 font-medium">
           <i className="fas fa-info-circle mr-1.5"></i>
           Powered by Free AI Routing. No balance required.
         </p>
      </div>
    </div>
  );
};

export default Dialer;
