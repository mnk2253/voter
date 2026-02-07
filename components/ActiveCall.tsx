
import React, { useEffect, useRef } from 'react';
import { CallStatus, TranscriptionItem } from '../types';

interface ActiveCallProps {
  status: CallStatus;
  number: string;
  onEnd: () => void;
  transcription: TranscriptionItem[];
  isSimulated?: boolean;
}

const ActiveCall: React.FC<ActiveCallProps> = ({ status, number, onEnd, transcription, isSimulated }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

  return (
    <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom duration-500">
      <div className="flex-1 flex flex-col pt-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center relative">
            <div className={`absolute inset-0 rounded-full border-2 ${isSimulated ? 'border-amber-500/30' : 'border-emerald-500/30'} ${status === CallStatus.CONNECTED ? 'animate-ping' : ''}`}></div>
            <i className={`fas ${isSimulated ? 'fa-robot' : 'fa-user-secret'} text-4xl ${isSimulated ? 'text-amber-400' : 'text-emerald-400'}`}></i>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-wide">{number}</h2>
            <p className={`text-sm font-medium mt-1 ${isSimulated ? 'text-amber-400' : 'text-emerald-400'} ${status !== CallStatus.CONNECTED ? 'animate-pulse' : ''}`}>
              {status === CallStatus.CONNECTED 
                ? (isSimulated ? 'SIMULATED (NO MIC)' : 'CONNECTED (ENCRYPTED)') 
                : 'ROUTING THROUGH BD GATEWAY...'}
            </p>
          </div>
        </div>

        {/* Transcription Area */}
        <div className="mt-12 flex-1 glass rounded-2xl p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isSimulated ? 'Simulation Output' : 'Live Transcription'}
            </span>
            <div className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isSimulated ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></span>
              <span className={`text-[10px] ${isSimulated ? 'text-amber-500' : 'text-red-500'} font-bold uppercase`}>
                {isSimulated ? 'Mock' : 'Rec'}
              </span>
            </div>
          </div>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide"
          >
            {transcription.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                <i className={`fas ${isSimulated ? 'fa-keyboard' : 'fa-wave-square'} mb-2 text-xl opacity-20`}></i>
                {isSimulated ? 'Simulated session started...' : 'Listening for audio...'}
              </div>
            )}
            {transcription.map((item, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    item.role === 'user' 
                      ? 'bg-slate-700 text-slate-200 rounded-br-none' 
                      : (isSimulated ? 'bg-amber-900/20 text-amber-100' : 'bg-emerald-900/40 text-emerald-100') + ' rounded-bl-none border border-white/5'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="p-8 grid grid-cols-3 gap-8">
        <button className="flex flex-col items-center space-y-2 opacity-50">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
            <i className={`fas ${isSimulated ? 'fa-keyboard' : 'fa-microphone-slash'} text-white`}></i>
          </div>
          <span className="text-[10px] font-medium text-slate-400">{isSimulated ? 'Input' : 'Mute'}</span>
        </button>
        <button 
          onClick={onEnd}
          className="flex flex-col items-center space-y-2"
        >
          <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all active:scale-95">
            <i className="fas fa-phone-slash text-2xl text-white rotate-[135deg]"></i>
          </div>
          <span className="text-[10px] font-medium text-red-400">End Call</span>
        </button>
        <button className="flex flex-col items-center space-y-2 opacity-50">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
            <i className="fas fa-volume-up text-white"></i>
          </div>
          <span className="text-[10px] font-medium text-slate-400">Speaker</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveCall;
