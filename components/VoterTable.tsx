
import React, { useState } from 'react';
import { Voter } from '../types';

interface VoterTableProps {
  voters: Voter[];
  onDelete: (id: string) => void;
}

const VoterTable: React.FC<VoterTableProps> = ({ voters, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.nid.includes(searchTerm) ||
    v.ward.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800">ভোটার তালিকা</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="নাম বা এনআইডি দিয়ে খুঁজুন..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Sl নং</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">নাম</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ভোটার আইডি (ID No)</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">পিতা</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">মাতা</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">জন্ম তারিখ</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVoters.map((voter, index) => (
              <tr key={voter.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 text-sm text-center text-slate-500 font-mono font-bold">
                  {voter.slNo || (index + 1).toString().padStart(3, '০')}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{voter.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{voter.ward}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-700">
                  {voter.nid}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {voter.fatherName}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {voter.motherName}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {voter.dob || `${voter.age} বছর (আন্দাজ)`}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(voter.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filteredVoters.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  কোন ভোটার খুঁজে পাওয়া যায়নি
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VoterTable;
