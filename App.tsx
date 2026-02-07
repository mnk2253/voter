
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
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
      if (!navigator.mediaDevices) {
        setMicAvailable(false);
        return;
      }
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
    
    // Auto-detect if we should simulate
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
    }, 1200);
  };

  const startSimulatedSession = async () => {
    try {
      setCallStatus(CallStatus.CONNECTED);
      const greeting = "[GHOST-NET] Connected to +880 Gateway. Secure Virtual Session Active. Assalamu Alaikum, how can I help you?";
      setTranscription([{ role: 'model', text: greeting }]);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are GhostCall BD AI. The user has NO MICROPHONE. You must communicate via text. Greet the user for number ${phoneNumber}. Mix English and Bangla. Keep it helpful and slightly mysterious.`
        }
      });
      sessionRef.current = chat;
    } catch (err: any) {
      setErrorMessage("Failed to start virtual session.");
      setCallStatus(CallStatus.IDLE);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !sessionRef.current) return;

    setTranscription(prev => [...prev, { role: 'user', text }]);

    try {
      if (isSimulated) {
        // Chat mode
        const response: GenerateContentResponse = await sessionRef.current.sendMessage({ message: text });
        setTranscription(prev => [...prev, { role: 'model', text: response.text || "..." }]);
      } else {
        // Live mode (if user types while in live mode)
        // Not implemented for live stream in this simplified flow, 
        // but we could send a text part to the live session if it supported it.
        // For now, simulated mode is the primary text interaction.
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const connectToGemini = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("No media support.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        console.warn("Microphone failed, falling back to simulation automatically...");
        setMicAvailable(false);
        startCall(true); // Retry as simulation
        return;
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
          systemInstruction: `GhostCall BD AI. Calling ${phoneNumber}. Use English/Bangla.`
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
            setErrorMessage("Connection lost.");
            endCall();
          },
          onclose: () => endCall()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setErrorMessage("Call failed. Please try again.");
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
      audioContextRef.current.input.close().catch(() => {});
      audioContextRef.current.output.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (callStatus === CallStatus.CONNECTED) {
      const newLog: CallLog = {
        id: Math.random().toString(36).substr(2, 9),
        number: phoneNumber,
        timestamp: new Date(),
        duration: isSimulated ? 'Virtual' : '01:22'
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
          <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${isSimulated ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' : 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30'}`}>
            {isSimulated ? 'VIRTUAL GHOST' : 'ENCRYPTED LINE'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden">
        {errorMessage && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400/50">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {callStatus === CallStatus.IDLE ? (
          <div className="p-4 h-full">
            {activeTab === 'dialer' ? (
              <Dialer 
                number={phoneNumber} 
                onDial={handleDial} 
                onBackspace={handleBackspace} 
                onCall={() => startCall(false)} 
              />
            ) : (
              <History history={history} />
            )}
          </div>
        ) : (
          <ActiveCall 
            status={callStatus} 
            number={phoneNumber} 
            onEnd={endCall} 
            transcription={transcription}
            isSimulated={isSimulated}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>

      {/* Navigation Footer */}
      {callStatus === CallStatus.IDLE && (
        <div className="p-4 flex justify-around border-t border-slate-800 glass z-10">
          <button 
            onClick={() => setActiveTab('dialer')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'dialer' ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            <i className="fas fa-th text-xl"></i>
            <span className="text-[10px] font-bold uppercase tracking-widest">Dialer</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            <i className="fas fa-history text-xl"></i>
            <span className="text-[10px] font-bold uppercase tracking-widest">Recent</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
