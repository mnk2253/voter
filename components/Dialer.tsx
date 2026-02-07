
import React from 'react';

interface DialerProps {
  number: string;
  onDial: (num: string) => void;
  onBackspace: () => void;
  onCall: () => void;
  isSimulatedMode?: boolean;
}

const Dialer: React.FC<DialerProps> = ({ number, onDial, onBackspace, onCall, isSimulatedMode }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col justify-center items-center py-8 space-y-2">
        <div className="flex items-center space-x-2 text-slate-400">
          <img src="https://flagcdn.com/w20/bd.png" alt="BD" className="rounded-sm" />
          <span className="text-sm font-medium">Bangladesh Gateway (+880)</span>
        </div>
        <div className="text-4xl font-bold tracking-widest text-emerald-50 text-center break-all h-12 flex items-center">
          {number || 'Enter Number'}
        </div>
        {isSimulatedMode && (
          <div className="text-[10px] text-amber-500/80 font-mono mt-2 flex items-center space-x-1">
            <i className="fas fa-microchip animate-pulse"></i>
            <span>VIRTUAL SIMULATION ACTIVE</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 pb-8">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => onDial(key)}
            className="keypad-button h-20 w-20 mx-auto rounded-full glass flex flex-col items-center justify-center hover:bg-slate-700 transition-all border border-transparent active:border-emerald-500/50"
          >
            <span className="text-2xl font-semibold">{key}</span>
            {key === '0' && <span className="text-[10px] text-slate-400">+</span>}
          </button>
        ))}
        <div className="col-span-1"></div>
        <div className="col-span-1 flex justify-center">
          <button
            onClick={onCall}
            disabled={!number}
            className={`h-20 w-20 rounded-full flex items-center justify-center transition-all ${
              number 
                ? (isSimulatedMode ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-400 glow-green') 
                : 'bg-slate-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <i className={`fas ${isSimulatedMode ? 'fa-robot' : 'fa-phone'} text-2xl text-white`}></i>
          </button>
        </div>
        <div className="col-span-1 flex justify-center items-center">
          {number && (
            <button
              onClick={onBackspace}
              className="h-14 w-14 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <i className="fas fa-backspace text-xl"></i>
            </button>
          )}
        </div>
      </div>
      
      {!isSimulatedMode && (
        <p className="text-[10px] text-slate-500 text-center mb-4">
          <i className="fas fa-shield-alt mr-1"></i>
          End-to-end encrypted BD routing active
        </p>
      )}
    </div>
  );
};

export default Dialer;
