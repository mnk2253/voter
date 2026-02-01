
import React, { useState } from 'react';
import { Voter } from '../types';
import { parseVoterText } from '../services/geminiService';

interface PDFImportModalProps {
  onImport: (voters: Omit<Voter, 'id'>[]) => void;
  onCancel: () => void;
}

const PDFImportModal: React.FC<PDFImportModalProps> = ({ onImport, onCancel }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<Omit<Voter, 'id'>[]>([]);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError('');
    try {
      const data = await parseVoterText(text);
      setExtractedData(data);
    } catch (err: any) {
      setError(err.message || 'কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onImport(extractedData);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">পিডিএফ থেকে কপি-পেস্ট করুন</h2>
          <p className="text-sm text-slate-500">পিডিএফ থেকে টেক্সট কপি করে নিচে পেস্ট করুন, এআই স্বয়ংক্রিয়ভাবে তথ্য সাজিয়ে নেবে।</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {extractedData.length === 0 ? (
          <div className="space-y-4">
            <textarea
              className="w-full h-64 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
              placeholder="পিডিএফ থেকে কপি করা টেক্সট এখানে পেস্ট করুন..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        ) : (
          <div className="border border-emerald-100 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center">
              <span className="text-emerald-800 font-bold">{extractedData.length} জন ভোটার পাওয়া গেছে</span>
              <button 
                onClick={() => setExtractedData([])}
                className="text-xs text-emerald-600 hover:underline"
              >
                আবার পেস্ট করুন
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left">নাম</th>
                  <th className="px-4 py-2 text-left">পিতা/মাতা</th>
                  <th className="px-4 py-2 text-left">এনআইডি</th>
                  <th className="px-4 py-2 text-left">ওয়ার্ড</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractedData.map((v, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium">{v.name}</td>
                    <td className="px-4 py-2">{v.fatherName} / {v.motherName}</td>
                    <td className="px-4 py-2 font-mono">{v.nid}</td>
                    <td className="px-4 py-2">{v.ward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          বাতিল
        </button>
        {extractedData.length === 0 ? (
          <button
            onClick={handleProcess}
            disabled={!text.trim() || isProcessing}
            className="px-8 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>প্রসেস হচ্ছে...</span>
              </>
            ) : (
              <span>প্রসেস করুন</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="px-8 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 font-bold"
          >
            তালিকায় যোগ করুন
          </button>
        )}
      </div>
    </div>
  );
};

export default PDFImportModal;
