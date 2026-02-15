
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";

const App = () => {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showToast, setShowToast] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerToast = (msg: string) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(""), 2500);
    };

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
        if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);

        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API_KEY가 설정되지 않았습니다.");
            
            const ai = new GoogleGenAI({ apiKey });
            const model = 'gemini-3-flash-preview';

            const mimeType = image.split(';')[0].split(':')[1];
            const base64Data = image.split(',')[1];

            const response = await ai.models.generateContent({
                model,
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: "Analyze the handwritten English text. Transcribe, fullCorrectedText (with <b> tags), scores (0-10 for grammar, vocabulary, naturalness), detailed corrections, and Eric Kwon's feedback in Korean. Also provide a natural 'advancedScript'. Return strictly valid JSON." }
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
                        required: ["transcription", "fullCorrectedText", "advancedScript", "scores", "corrections", "feedback"]
                    }
                }
            });

            let rawText = response.text || "";
            rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(rawText);
            setResult(data);
            
            setTimeout(() => {
                document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);

        } catch (err: any) {
            console.error(err);
            setError(`분석 중 오류가 발생했습니다: ${err.message || "다시 시도해주세요."}`);
        } finally {
            setLoading(false);
        }
    };

    // 고품질 Gemini TTS 엔진 사용
    const speakWithGemini = async (text: string) => {
        if (isSpeaking) return;
        setIsSpeaking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read this naturally: ${cleanText}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                const binary = atob(base64Audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                
                const dataInt16 = new Int16Array(bytes.buffer);
                const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.onended = () => setIsSpeaking(false);
                source.start();
            } else {
                setIsSpeaking(false);
            }
        } catch (err) {
            console.error(err);
            setIsSpeaking(false);
        }
    };

    const copyToClipboard = (text: string) => {
        const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
        navigator.clipboard.writeText(cleanText);
        triggerToast("클립보드에 복사되었습니다!");
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50 selection:bg-indigo-100">
            <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 py-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
                            <i className="fa-solid fa-pen-nib"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">에릭권 영작문 클래스</h1>
                            <p className="text-[10px] text-indigo-500 font-black tracking-widest uppercase">Premium AI Tutor</p>
                        </div>
                    </div>
                </div>
            </header>

            {showToast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold animate-bounce">
                    {showToast}
                </div>
            )}

            <main className="max-w-xl mx-auto p-4 space-y-6 mt-4">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <i className="fa-solid fa-cloud-arrow-up text-indigo-500"></i> 손글씨 일기 업로드
                    </h2>
                    <div 
                        className={`relative border-2 border-dashed rounded-3xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${isDragging ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        {image ? (
                            <img src={image} className="w-full h-full object-contain p-4 rounded-3xl" alt="Preview" />
                        ) : (
                            <div className="text-center p-8 group">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                                    <i className="fa-solid fa-camera text-3xl text-slate-200"></i>
                                </div>
                                <p className="text-slate-600 font-bold">사진을 끌어오거나 클릭하세요</p>
                                <p className="text-slate-400 text-[11px] mt-2 italic leading-relaxed">손글씨를 인식하여 에릭권 AI가<br/>교정 및 피드백을 제공합니다.</p>
                            </div>
                        )}
                    </div>
                    {image && !loading && !result && (
                        <button 
                            onClick={handleAnalyze}
                            className="w-full mt-6 py-4.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>에릭권의 분석 시작하기</span>
                            <i className="fa-solid fa-wand-magic-sparkles text-indigo-200 animate-pulse"></i>
                        </button>
                    )}
                </div>

                {loading && (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 fade-in">
                        <div className="w-14 h-14 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">에릭권 AI가 정밀 분석 중입니다</h3>
                        <p className="text-slate-400 text-sm mt-2 font-medium">문장 하나하나 꼼꼼히 읽고 있어요!</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100 flex items-start gap-3 fade-in">
                        <i className="fa-solid fa-circle-exclamation mt-1"></i>
                        <div className="text-sm font-bold">{error}</div>
                    </div>
                )}

                {result && (
                    <div id="results-section" className="space-y-6 fade-in">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { l: 'Grammar', s: result.scores.grammar, c: 'bg-emerald-500' },
                                { l: 'Vocab', s: result.scores.vocabulary, c: 'bg-amber-500' },
                                { l: 'Natural', s: result.scores.naturalness, c: 'bg-indigo-500' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">{item.l}</span>
                                    <div className="text-2xl font-black text-slate-900">{item.s}</div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full score-bar ${item.c}`} style={{ width: `${item.s * 10}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-check-double text-indigo-500"></i> 교정된 문장
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={() => copyToClipboard(result.fullCorrectedText)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                        <i className="fa-solid fa-copy"></i>
                                    </button>
                                    <button onClick={() => speakWithGemini(result.fullCorrectedText)} disabled={isSpeaking} className={`text-indigo-600 text-xs font-bold bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-all ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <i className={`fa-solid ${isSpeaking ? 'fa-spinner animate-spin' : 'fa-volume-high'} mr-1`}></i> AI 음성
                                    </button>
                                </div>
                            </div>
                            <div 
                                className="bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed font-serif text-slate-700 text-lg shadow-inner"
                                dangerouslySetInnerHTML={{ __html: result.fullCorrectedText.replace(/<b>/g, '<b class="correction-mark">') }}
                            ></div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800 mb-5">상세 피드백 (Points)</h2>
                            <div className="space-y-6">
                                {result.corrections.map((corr: any, i: number) => (
                                    <div key={i} className="border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                                        <div className="text-red-400 text-xs line-through mb-1 font-medium italic">{corr.original}</div>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="text-slate-900 font-extrabold leading-tight text-lg">{corr.corrected}</div>
                                            <button onClick={() => speakWithGemini(corr.corrected)} className="text-slate-300 hover:text-indigo-500 transition-colors pt-1"><i className="fa-solid fa-volume-low"></i></button>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                                            <i className="fa-solid fa-lightbulb text-amber-400 mr-2"></i>{corr.explanation}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white rounded-4xl p-8 shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-indigo-300">
                                    <i className="fa-solid fa-comment-dots"></i> 에릭권의 최종 코멘트
                                </h2>
                                <p className="text-indigo-100/80 leading-relaxed mb-10 text-sm font-medium whitespace-pre-line border-l-2 border-indigo-500/30 pl-4">{result.feedback}</p>
                                
                                <div className="bg-white/5 p-7 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-indigo-300 tracking-[0.2em] uppercase italic">Native Recommendation</span>
                                        <button onClick={() => speakWithGemini(result.advancedScript)} className="text-white text-[10px] font-bold bg-white/10 px-4 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/5">
                                            <i className="fa-solid fa-headphones mr-1"></i> Full Audio
                                        </button>
                                    </div>
                                    <p className="text-xl italic font-serif leading-relaxed text-white drop-shadow-sm font-light">"{result.advancedScript}"</p>
                                </div>
                            </div>
                            <i className="fa-solid fa-quote-right absolute right-[-20px] bottom-[-20px] text-[180px] opacity-[0.02] transition-transform group-hover:scale-110 duration-700"></i>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="text-center py-16 text-slate-300 text-[10px] font-black tracking-[0.3em] uppercase">
                &copy; 2025 Eric Kwon English Class. All Rights Reserved.
            </footer>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
