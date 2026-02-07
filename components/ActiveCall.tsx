
import React, { useEffect, useRef, useState } from 'react';
import { CallStatus, TranscriptionItem } from '../types';

interface ActiveCallProps {
  status: CallStatus;
  number: string;
  onEnd: () => void;
  transcription: TranscriptionItem[];
  isSimulated?: boolean;
  onSendMessage?: (text: string) => void;
}

const ActiveCall: React.FC<ActiveCallProps> = ({ status, number, onEnd, transcription, isSimulated, onSendMessage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom duration-500">
      <div className="flex-1 flex flex-col pt-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center relative">
            <div className={`absolute inset-0 rounded-full border-2 ${isSimulated ? 'border-amber-500/30' : 'border-emerald-500/30'} ${status === CallStatus.CONNECTED ? 'animate-ping' : ''}`}></div>
            <i className={`fas ${isSimulated ? 'fa-ghost' : 'fa-user-secret'} text-3xl ${isSimulated ? 'text-amber-400' : 'text-emerald-400'}`}></i>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-widest">{number}</h2>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${status === CallStatus.CONNECTED ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${status === CallStatus.CONNECTED ? 'text-emerald-500' : 'text-amber-500'}`}>
                {status === CallStatus.CONNECTED 
                  ? (isSimulated ? 'Virtual Link Established' : 'Secure Call Active') 
                  : 'Establishing Secure Route...'}
              </p>
            </div>
          </div>
        </div>

        {/* Transcription Area */}
        <div className="mt-8 flex-1 glass mx-4 rounded-3xl p-4 overflow-hidden flex flex-col mb-4 border border-white/5">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
             <div className="flex items-center space-x-2">
                <i className="fas fa-terminal text-[10px] text-slate-500"></i>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Secure Transcription
                </span>
             </div>
             {isSimulated && (
               <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">NO MIC DETECTED</span>
             )}
          </div>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide pb-4"
          >
            {transcription.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs text-center px-8">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                  <i className="fas fa-satellite-dish animate-pulse opacity-20"></i>
                </div>
                Waiting for gateway signal...
              </div>
            )}
            {transcription.map((item, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    item.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-500/10' 
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'
                  }`}
                >
                  {item.text}
                </div>
                <span className="text-[8px] mt-1 text-slate-600 font-mono uppercase">
                  {item.role === 'user' ? 'Outgoing' : 'Incoming'}
                </span>
              </div>
            ))}
          </div>

          {/* Text Input for Simulated Mode */}
          {status === CallStatus.CONNECTED && (
            <form onSubmit={handleSubmit} className="mt-2 relative">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isSimulated ? "Type your message..." : "Voice active..."}
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1.5 w-9 h-9 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="p-6 bg-slate-950/50 flex items-center justify-around border-t border-white/5">
        <button className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <i className="fas fa-microphone-slash"></i>
        </button>
        <button 
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-xl shadow-red-500/20 transition-all active:scale-90"
        >
          <i className="fas fa-phone-slash text-2xl text-white rotate-[135deg]"></i>
        </button>
        <button className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <i className="fas fa-volume-up"></i>
        </button>
      </div>
    </div>
  );
};

export default ActiveCall;
