
import React, { useState, useRef } from 'react';
import { Voter } from '../types';
import { parseVoterChunk } from '../services/geminiService';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFImportModalProps {
  onImport: (voters: Omit<Voter, 'id'>[]) => void;
  onCancel: () => void;
}

const PDFImportModal: React.FC<PDFImportModalProps> = ({ onImport, onCancel }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [extractedData, setExtractedData] = useState<Omit<Voter, 'id'>[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini 3 Flash is capable of larger context. 
  // Increased to 6000 to reduce number of API calls while maintaining accuracy.
  const chunkText = (str: string, size: number = 6000) => {
    const chunks = [];
    let currentPos = 0;
    while (currentPos < str.length) {
      let endPos = Math.min(currentPos + size, str.length);
      if (endPos < str.length) {
        const nextNewline = str.indexOf('\n', endPos);
        if (nextNewline !== -1 && nextNewline < endPos + 500) {
          endPos = nextNewline;
        }
      }
      chunks.push(str.slice(currentPos, endPos));
      currentPos = endPos;
    }
    return chunks;
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError('');
    try {
      const extracted = await extractTextFromPDF(file);
      setText(extracted);
    } catch (err: any) {
      setError('পিডিএফ থেকে তথ্য পড়তে সমস্যা হয়েছে।');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleProcess = async () => {
    const textToProcess = text.trim();
    if (!textToProcess) return;
    
    setIsProcessing(true);
    setError('');
    setExtractedData([]);
    
    try {
      const chunks = chunkText(textToProcess);
      const total = chunks.length;
      setTotalBatches(total);
      
      let allVoters: Omit<Voter, 'id'>[] = [];
      
      // Parallel execution in smaller batches to avoid hitting rate limits too hard
      // We process 3 chunks simultaneously at a time for high speed.
      const BATCH_SIZE = 3; 
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        setCurrentBatch(i + batch.length);
        
        // Execute batch in parallel
        const batchPromises = batch.map(chunk => parseVoterChunk(chunk));
        const resultsArray = await Promise.all(batchPromises);
        
        // Merge results
        for (const batchResults of resultsArray) {
          if (batchResults && batchResults.length > 0) {
            allVoters = [...allVoters, ...batchResults];
          }
        }
        
        // Update UI preview with unique voters
        const uniqueVoters = Array.from(new Map(allVoters.map(item => [item.nid, item])).values());
        setExtractedData(uniqueVoters);
      }

      if (allVoters.length === 0) {
        throw new Error('কোন তথ্য পাওয়া যায়নি।');
      }
    } catch (err: any) {
      setError(err.message || 'কিছু সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
      setCurrentBatch(0);
    }
  };

  const handleConfirm = () => {
    onImport(extractedData);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            বিশাল ডাটা ইম্পোর্ট
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider rounded">Turbo Mode</span>
          </h2>
          <p className="text-sm text-slate-500">৬৯৬ জন ভোটারের তথ্য কয়েক সেকেন্ডে ইম্পোর্ট হবে।</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {extractedData.length === 0 && !isProcessing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  {isExtracting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <span className="font-bold text-emerald-800">{isExtracting ? 'ফাইল পড়া হচ্ছে...' : 'পিডিএফ আপলোড'}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf"
                  className="hidden"
                />
              </button>

              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/50">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <span className="font-bold text-indigo-800">অথবা টেক্সট পেস্ট</span>
              </div>
            </div>

            <textarea
              className="w-full h-48 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs leading-relaxed bg-slate-50"
              placeholder="পিডিএফ থেকে কপি করা তথ্য এখানে পেস্ট করুন..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-4 ${!isProcessing && extractedData.length > 0 ? 'bg-slate-50 border-slate-100' : ''}`}>
              {isProcessing ? (
                <>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-emerald-600 bg-emerald-200">
                          Parallel Processing (Turbo)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-emerald-600">
                          {Math.round((currentBatch/totalBatches)*100)}% সম্পন্ন
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded bg-emerald-200">
                      <div style={{ width: `${(currentBatch/totalBatches)*100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-300"></div>
                    </div>
                  </div>
                  <p className="text-emerald-800 font-bold text-xl">
                    শনাক্ত হয়েছে: {extractedData.length} জন ভোটার
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <span>একইসাথে একাধিক পাতা প্রসেস করা হচ্ছে, দ্রুত সম্পন্ন হবে...</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4 space-y-2">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                   </div>
                   <h3 className="text-2xl font-bold text-emerald-800">মোট {extractedData.length} জন ভোটার পাওয়া গেছে</h3>
                </div>
              )}
            </div>

            {extractedData.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-500">নাম</th>
                        <th className="px-4 py-2 text-left text-slate-500">এনআইডি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedData.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{v.name}</td>
                          <td className="px-4 py-2 font-mono text-emerald-600">{v.nid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-slate-100">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-8 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          বাতিল
        </button>
        {extractedData.length === 0 || isProcessing ? (
          <button
            onClick={handleProcess}
            disabled={!text.trim() || isProcessing || isExtracting}
            className="px-10 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg disabled:opacity-50 font-bold transition-all flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>দ্রুত প্রসেস হচ্ছে...</span>
              </>
            ) : (
              <span>শনাক্ত শুরু করুন</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="px-10 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg font-bold transition-all transform active:scale-95"
          >
            ভোটার তালিকায় যোগ করুন
          </button>
        )}
      </div>
    </div>
  );
};

export default PDFImportModal;
