
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { CallStatus, CallLog, TranscriptionItem } from './types';
import Dialer from './components/Dialer';
import ActiveCall from './components/ActiveCall';
import History from './components/History';
import { createPcmBlob, decodeBase64, decodeAudioData } from './services/audioService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dialer' | 'history'>('dialer');
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [history, setHistory] = useState<CallLog[]>([]);
  const [transcription, setTranscription] = useState<TranscriptionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  
  // Audio & Gemini Refs
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    checkMicAvailability();
  }, []);

  const checkMicAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(device => device.kind === 'audioinput');
      setMicAvailable(hasMic);
    } catch (e) {
      setMicAvailable(false);
    }
  };

  const handleDial = (num: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber(prev => prev + num);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const startCall = async (forceSimulated = false) => {
    if (!phoneNumber) return;
    setErrorMessage(null);
    
    // If we know there's no mic, or user explicitly requested simulation
    const shouldSimulate = forceSimulated || micAvailable === false;
    setIsSimulated(shouldSimulate);
    setCallStatus(CallStatus.DIALING);
    setTranscription([]);
    
    // Simulate routing delay
    setTimeout(() => {
      if (shouldSimulate) {
        startSimulatedSession();
      } else {
        connectToGemini();
      }
    }, 1500);
  };

  const startSimulatedSession = async () => {
    setCallStatus(CallStatus.CONNECTED);
    setTranscription([{ role: 'model', text: "[GHOST-GATEWAY] Secure Bangladesh routing established. Virtual session active. How can I assist you today?" }]);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are an AI assistant for GhostCall BD, an anonymous calling service. The user is using Simulation Mode because their microphone is unavailable. Respond as a professional, friendly assistant. Use a blend of English and Bengali (Bangla). Keep responses short like a phone conversation.`
      }
    });
    sessionRef.current = chat;
  };

  const connectToGemini = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support audio recording.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        console.error("Mic access error:", e);
        // If device is not found, automatically switch to simulation instead of showing a hard error
        if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError' || e.message?.toLowerCase().includes('not found')) {
          setMicAvailable(false);
          startCall(true);
          return;
        } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          throw new Error("Microphone permission denied. Please allow microphone access in settings.");
        } else {
          throw new Error("Could not access microphone: " + e.message);
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are a private AI assistant for an anonymous calling service. The user has dialed ${phoneNumber} via a secure Bangladesh gateway. Greet them in English and Bangla. Keep it conversational.`
        },
        callbacks: {
          onopen: () => {
            setCallStatus(CallStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: any) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = audioContextRef.current?.output;
              if (outCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                const buffer = await decodeAudioData(decodeBase64(audioData), outCtx, 24000, 1);
                const source = outCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
            }
            if (msg.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev, { role: 'user', text: msg.serverContent.inputTranscription.text }]);
            }
            if (msg.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev, { role: 'model', text: msg.serverContent.outputTranscription.text }]);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Gemini Error:", e);
            setErrorMessage("Connection lost. Please try again.");
            endCall();
          },
          onclose: () => endCall()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to start call:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
      setCallStatus(CallStatus.IDLE);
    }
  };

  const endCall = () => {
    if (sessionRef.current) {
      try { 
        if (typeof sessionRef.current.close === 'function') sessionRef.current.close();
      } catch(e) {}
      sessionRef.current = null;
    }
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
      audioContextRef.current = null;
    }

    if (callStatus === CallStatus.CONNECTED) {
      const newLog: CallLog = {
        id: Math.random().toString(36).substr(2, 9),
        number: phoneNumber,
        timestamp: new Date(),
        duration: isSimulated ? 'Simulated' : '01:45'
      };
      setHistory(prev => [newLog, ...prev]);
    }

    setCallStatus(CallStatus.IDLE);
    setPhoneNumber('');
    setIsSimulated(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden bg-slate-900 border-x border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800 glass z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-ghost"></i>
          </div>
          <h1 className="font-bold text-xl tracking-tight">GhostCall <span className="text-emerald-400">BD</span></h1>
        </div>
        <div className="flex flex-col items-end">
           <div className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
            {isSimulated ? 'SIMULATION MODE' : 'ROUTING ACTIVE'}
          </div>
          {micAvailable === false && (
            <span className="text-[8px] text-amber-500 font-bold mt-1">NO MIC DETECTED</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden p-4">
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start space-x-3 mb-2">
              <i className="fas fa-exclamation-triangle mt-1"></i>
              <p className="flex-1 font-medium">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="text-red-400/50 hover:text-red-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-xs text-red-400/70">
              Check your browser permissions or hardware connections.
            </p>
          </div>
        )}

        {callStatus === CallStatus.IDLE && (
          <>
            {activeTab === 'dialer' ? (
              <Dialer 
                number={phoneNumber} 
                onDial={handleDial} 
                onBackspace={handleBackspace} 
                onCall={() => startCall(false)} 
                isSimulatedMode={micAvailable === false}
              />
            ) : (
              <History history={history} />
            )}
          </>
        )}

        {(callStatus === CallStatus.DIALING || callStatus === CallStatus.CONNECTED) && (
          <ActiveCall 
            status={callStatus} 
            number={phoneNumber} 
            onEnd={endCall} 
            transcription={transcription}
            isSimulated={isSimulated}
          />
        )}
      </div>

      {/* Navigation Footer */}
      {callStatus === CallStatus.IDLE && (
        <div className="p-4 flex justify-around border-t border-slate-800 glass z-10">
          <button 
            onClick={() => { setActiveTab('dialer'); setErrorMessage(null); }}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'dialer' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <i className="fas fa-th text-xl"></i>
            <span className="text-xs font-medium">Dialer</span>
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setErrorMessage(null); }}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <i className="fas fa-history text-xl"></i>
            <span className="text-xs font-medium">History</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-slate-400 opacity-50 cursor-not-allowed">
            <i className="fas fa-cog text-xl"></i>
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
