
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeHandwriting = async (base64Image: string): Promise<AnalysisResult> => {
  const model = 'gemini-3-flash-preview';

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image.split(',')[1] || base64Image
          }
        },
        {
          text: `
            Analyze the handwritten English text in this image.
            1. Transcribe the text accurately in English.
            2. Evaluate the writing based on Grammar, Vocabulary, and Naturalness (each score 0-10).
            3. Provide specific corrections for errors or unnatural phrasing.
            4. Provide an overall feedback summary in Korean with advice for improvement.
            5. Create a 'fullCorrectedText' version (English) with <b> tags around changed parts.
            6. Create an 'advancedScript' version: Rewrite the entire text into highly professional, natural, and sophisticated English (Native level).
            
            IMPORTANT:
            - The 'transcription', 'original', 'corrected', 'fullCorrectedText', and 'advancedScript' fields must be in English.
            - The 'explanation' and 'feedback' fields MUST be in Korean (한국어).
            - Return the result in strictly valid JSON format.
          `
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          fullCorrectedText: { type: Type.STRING },
          advancedScript: { type: Type.STRING, description: "A highly natural and advanced native-level rewrite of the entire text." },
          scores: {
            type: Type.OBJECT,
            properties: {
              grammar: { type: Type.NUMBER },
              vocabulary: { type: Type.NUMBER },
              naturalness: { type: Type.NUMBER }
            },
            required: ["grammar", "vocabulary", "naturalness"]
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["original", "corrected", "explanation"]
            }
          },
          feedback: { type: Type.STRING }
        },
        required: ["transcription", "fullCorrectedText", "advancedScript", "scores", "corrections", "feedback"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI 모델로부터 응답을 받지 못했습니다.");
  return JSON.parse(text) as AnalysisResult;
};

export const generateExampleSentence = async (correctedPhrase: string): Promise<string> => {
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model: model,
    contents: `Create one natural English example sentence using the phrase or structure: "${correctedPhrase}". Provide only the English sentence.`
  });
  return response.text || "유사 문장을 생성할 수 없습니다.";
};

export const speakText = async (text: string) => {
  const ttsAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
  
  const response = await ttsAi.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say naturally: ${cleanText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const bytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
