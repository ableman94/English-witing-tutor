
export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface AnalysisScores {
  grammar: number;
  vocabulary: number;
  naturalness: number;
}

export interface AnalysisResult {
  transcription: string;
  fullCorrectedText: string;
  advancedScript: string; // Highly natural, professional version of the text
  scores: AnalysisScores;
  corrections: Correction[];
  feedback: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
