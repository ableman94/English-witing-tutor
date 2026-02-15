
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const App = () => {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImage(ev.target?.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        } else {
            setError("이미지 파일(JPG, PNG 등)만 업로드 가능합니다.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFile(e.target.files[0]);
    };

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) processFile(e.dataTransfer.files[0]);
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            const model = 'gemini-3-flash-preview';

            const response = await ai.models.generateContent({
                model,
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: image.split(',')[1] } },
                        { text: "Analyze the handwritten English text in this image. Transcription, fullCorrectedText (with <b> tags), scores (grammar, vocabulary, naturalness), detailed corrections, and Eric Kwon's feedback in Korean. Return strictly JSON." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            transcription: { type: Type.STRING },
                            fullCorrectedText: { type: Type.STRING },
                            advancedScript: { type: Type.STRING },
                            scores: {
                                type: Type.OBJECT,
                                properties: {
                                    grammar: { type: Type.NUMBER },
                                    vocabulary: { type: Type.NUMBER },
                                    naturalness: { type: Type.NUMBER }
                                }
                            },
                            corrections: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        original: { type: Type.STRING },
                                        corrected: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    }
                                }
                            },
                            feedback: { type: Type.STRING }
                        },
                        required: ["transcription", "fullCorrectedText", "scores", "corrections", "feedback"]
                    }
                }
            });

            const data = JSON.parse(response.text || "{}");
            setResult(data);
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 300);
        } catch (err: any) {
            setError("분석 중 오류가 발생했습니다. 이미지가 너무 흐리거나 API 연결에 문제가 있을 수 있습니다.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const speak = (text: string) => {
        const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 shadow-sm">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <i className="fa-solid fa-pen-nib"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">에릭권 영작문 클래스</h1>
                            <p className="text-[10px] text-indigo-500 font-black tracking-widest uppercase">AI Writing Tutor</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 2000);
                        }} 
                        className="text-slate-400 p-2"
                    >
                        <i className="fa-solid fa-share-nodes text-xl"></i>
                    </button>
                </div>
            </header>

            {showToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold animate-bounce">
                    링크가 복사되었습니다!
                </div>
            )}

            <main className="max-w-xl mx-auto p-4 space-y-6 mt-4">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-cloud-arrow-up text-indigo-500"></i> 손글씨 일기 업로드
                    </h2>
                    <div 
                        className={`relative border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'drag-active' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        {image ? (
                            <img src={image} className="w-full h-full object-contain p-2 rounded-xl" alt="Preview" />
                        ) : (
                            <div className="text-center p-8">
                                <i className="fa-solid fa-camera text-4xl text-slate-200 mb-4 block"></i>
                                <p className="text-slate-600 font-bold">이미지를 드래그하거나 클릭하세요</p>
                                <p className="text-slate-400 text-xs mt-2 italic text-center">노트의 글씨가 잘 보이게 찍어주세요!</p>
                            </div>
                        )}
                    </div>
                    {image && !loading && !result && (
                        <button 
                            onClick={handleAnalyze}
                            className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <span>에릭권의 분석 시작하기</span>
                            <i className="fa-solid fa-wand-magic-sparkles text-indigo-200"></i>
                        </button>
                    )}
                </div>

                {loading && (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 fade-in">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-bold text-slate-800">에릭권 AI가 분석 중...</h3>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100 flex items-start gap-3 fade-in">
                        <i className="fa-solid fa-circle-exclamation mt-1"></i>
                        <p className="font-bold text-sm">{error}</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-6 fade-in">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { l: 'Grammar', s: result.scores.grammar, c: 'bg-emerald-500' },
                                { l: 'Vocab', s: result.scores.vocabulary, c: 'bg-amber-500' },
                                { l: 'Natural', s: result.scores.naturalness, c: 'bg-indigo-500' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{item.l}</span>
                                    <div className="text-2xl font-black text-slate-800">{item.s}</div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full score-bar ${item.c}`} style={{ width: `${item.s * 10}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-indigo-600">교정 결과</h2>
                                <button onClick={() => speak(result.fullCorrectedText)} className="text-indigo-600 text-sm font-bold">
                                    <i className="fa-solid fa-volume-high"></i> Listen
                                </button>
                            </div>
                            <div 
                                className="bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed font-serif text-slate-700 text-lg shadow-inner"
                                dangerouslySetInnerHTML={{ __html: result.fullCorrectedText.replace(/<b>/g, '<b class="correction-mark">') }}
                            ></div>
                        </div>

                        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
                            <h2 className="text-xl font-bold mb-4 text-indigo-300">
                                <i className="fa-solid fa-comment-dots mr-2"></i> 에릭권의 코멘트
                            </h2>
                            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{result.feedback}</p>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="text-center py-12 text-slate-300 text-[10px] font-bold tracking-[0.2em] uppercase">
                &copy; 2025 Eric Kwon English Class.
            </footer>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
