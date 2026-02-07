
import React from 'react';
import { CallLog } from '../types';

interface HistoryProps {
  history: CallLog[];
}

const History: React.FC<HistoryProps> = ({ history }) => {
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
      <h2 className="text-xl font-bold mb-6 text-white px-2">Recent Calls</h2>
      
      <div className="space-y-4 pb-20">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <i className="fas fa-phone-slash text-4xl mb-4"></i>
            <p>No recent activity</p>
          </div>
        ) : (
          history.map(log => (
            <div key={log.id} className="glass p-4 rounded-xl flex items-center justify-between border-l-4 border-emerald-500">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <i className="fas fa-user-secret text-slate-400"></i>
                </div>
                <div>
                  <div className="font-semibold text-white">{log.number}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-tighter">
                    {new Intl.DateTimeFormat('en-GB', { 
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                    }).format(log.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-emerald-400 font-bold">{log.duration}</div>
                <div className="text-[10px] text-slate-500 italic">Ghost Routed</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 glass rounded-xl border-dashed border-slate-700 text-center">
        <p className="text-xs text-slate-500">
          Logs are encrypted and stored locally. Clearing browser data will remove history.
        </p>
      </div>
    </div>
  );
};

export default History;
