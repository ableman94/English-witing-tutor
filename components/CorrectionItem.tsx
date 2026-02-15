
import React, { useState } from 'react';
import { Correction } from '../types';
import { speakText, generateExampleSentence } from '../services/geminiService';

interface CorrectionItemProps {
  correction: Correction;
}

const CorrectionItem: React.FC<CorrectionItemProps> = ({ correction }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [exampleSentence, setExampleSentence] = useState<string | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSpeaking(true);
    try {
      await speakText(correction.corrected);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleGenerateExample = async () => {
    if (exampleSentence) {
      setExampleSentence(null);
      return;
    }
    setIsLoadingExample(true);
    try {
      const sentence = await generateExampleSentence(correction.corrected);
      setExampleSentence(sentence);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingExample(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
      <div className="p-4 flex flex-col gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1 block">기존 문장 (Original)</span>
          <p className="text-slate-600 line-through decoration-red-300 decoration-2">{correction.original}</p>
        </div>
        
        <div className="border-t border-slate-200 pt-3 relative">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1 block">수정된 문장 (Improved)</span>
              <p className="text-slate-900 font-medium pr-10">{correction.corrected}</p>
            </div>
            <button 
              onClick={handleSpeak}
              disabled={isSpeaking}
              className={`text-indigo-600 hover:text-indigo-800 transition-colors p-2 rounded-full hover:bg-indigo-50 shrink-0 ${isSpeaking ? 'animate-pulse' : ''}`}
              title="발음 듣기"
            >
              <i className={`fa-solid ${isSpeaking ? 'fa-volume-high' : 'fa-volume-low'} text-lg`}></i>
            </button>
          </div>
        </div>

        {correction.explanation && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mt-1">
            <p className="text-sm text-blue-700 italic">
              <i className="fa-solid fa-circle-info mr-2"></i>
              {correction.explanation}
            </p>
          </div>
        )}

        {/* New Feature: Generate Example Button */}
        <div className="pt-2 border-t border-slate-200/50">
          <button 
            onClick={handleGenerateExample}
            disabled={isLoadingExample}
            className="flex items-center gap-2 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-tight"
          >
            {isLoadingExample ? (
              <><i className="fa-solid fa-spinner animate-spin"></i> 생성 중...</>
            ) : (
              <><i className={`fa-solid ${exampleSentence ? 'fa-chevron-up' : 'fa-lightbulb'}`}></i> {exampleSentence ? '숨기기' : '유사 문장으로 학습하기'}</>
            )}
          </button>
          
          {exampleSentence && (
            <div className="mt-3 bg-white border border-indigo-100 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">More Examples</span>
              <p className="text-slate-800 text-sm font-medium leading-relaxed">{exampleSentence}</p>
              <button 
                onClick={() => speakText(exampleSentence)} 
                className="mt-2 text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <i className="fa-solid fa-volume-low text-xs"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrectionItem;
