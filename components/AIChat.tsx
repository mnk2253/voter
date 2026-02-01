
import React, { useState, useRef, useEffect } from 'react';
import { getAIInsight } from '../services/geminiService';
import { Voter } from '../types';

interface AIChatProps {
  voters: Voter[];
}

const AIChat: React.FC<AIChatProps> = ({ voters }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const aiResponse = await getAIInsight(userMessage, voters);
    setMessages(prev => [...prev, { role: 'ai', content: aiResponse || '' }]);
    setIsLoading(false);
  };

  return (
    <div className="bg-emerald-900 text-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 bg-emerald-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold">স্মার্ট ভিলেজ অ্যাসিস্ট্যান্ট</h3>
          <p className="text-xs text-emerald-300">ভোটার তালিকা নিয়ে প্রশ্ন করুন</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 text-slate-800">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="mb-2">উদাহরণ হিসেবে জিজ্ঞাসা করুন:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["মোট কতজন মহিলা ভোটার আছে?", "সবচেয়ে বয়স্ক ভোটার কে?", "১ নম্বর ওয়ার্ডে কতজন ভোটার?"].map((q, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none shadow-sm'}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm animate-pulse">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex space-x-2">
        <input
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="এখানে লিখুন..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button 
          type="submit"
          disabled={isLoading}
          className="bg-emerald-600 p-2 rounded-xl text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default AIChat;
