
import { GoogleGenAI, Type } from "@google/genai";
import { Voter, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIInsight = async (query: string, voters: Voter[]) => {
  const dataSummary = voters.slice(0, 100).map(v => 
    `Name: ${v.name}, Age: ${v.age}, Gender: ${v.gender}, Ward: ${v.ward}`
  ).join('\n');

  const systemPrompt = `You are a village administration assistant for Sridashgati village, Sirajganj. 
  Answer the user's questions about the voter data in Bengali. 
  If they ask for stats, calculate them accurately based on the provided list of ${voters.length} voters. 
  Be polite and helpful.
  
  Current Data Summary (Partial):
  ${dataSummary}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "দুঃখিত, বর্তমানে এআই তথ্য দিতে পারছে না। পরে চেষ্টা করুন।";
  }
};

export const parseVoterText = async (rawText: string): Promise<Omit<Voter, 'id'>[]> => {
  const systemPrompt = `You are an expert data extraction assistant specialized in Bengali Election Commission Voter Lists.
  
  The input text contains artifacts from PDF copying (e.g., weird characters like Ï, Ř, Ĵ, Î, Ƅ, Ɔ). 
  Standardize them into clean Bengali:
  - 'Ïমাঃ' -> 'মোঃ'
  - 'Řীদাসগাতী' -> 'শ্রীদাসগাতী'
  - 'িপতা' -> 'পিতা'
  - 'Ïভাটার নং' -> 'ভোটার নং'
  - 'জĥ তািরখ' -> 'জন্ম তারিখ'
  - 'িঠকানা' -> 'ঠিকানা'
  
  Data extraction targets:
  - name (e.g. মোঃ সামাদ আলী)
  - fatherName (e.g. মোঃ ময়দান আলী)
  - motherName (e.g. মোছাঃ খেতজা খাতুন)
  - age (Calculate using 2024 - Year of birth)
  - gender (Source text usually says 'পুরুষ' at the top, map to 'পুরুষ', 'মহিলা', or 'অন্যান্য')
  - nid (Extracted from 'ভোটার নং')
  - ward (Standardize to '১ নম্বর ওয়ার্ড' or similar)
  - address (Village name/Address)

  Rules:
  1. Return ONLY a valid JSON array of objects.
  2. If data is for multiple people, return an object for each.
  3. Clean up all special artifacts.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract all voter records from this raw PDF text:\n\n${rawText}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              fatherName: { type: Type.STRING },
              motherName: { type: Type.STRING },
              age: { type: Type.NUMBER },
              gender: { type: Type.STRING, enum: ['পুরুষ', 'মহিলা', 'অন্যান্য'] },
              nid: { type: Type.STRING },
              ward: { type: Type.STRING },
              address: { type: Type.STRING }
            },
            required: ["name", "fatherName", "motherName", "age", "gender", "nid", "ward", "address"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("টেক্সট প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে টেক্সট ফরম্যাট চেক করুন।");
  }
};
