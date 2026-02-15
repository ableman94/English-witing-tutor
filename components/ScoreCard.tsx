
import React from 'react';

interface ScoreCardProps {
  label: string;
  score: number;
  color: string;
  icon: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ label, score, color, icon }) => {
  const percentage = (score / 10) * 100;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
            <i className={`fa-solid ${icon} ${color.replace('bg-', 'text-')}`}></i>
          </div>
          <span className="font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-2xl font-bold text-slate-900">{score}<span className="text-sm text-slate-400 font-medium">/10</span></span>
      </div>
      
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ScoreCard;
