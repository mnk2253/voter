
import { GoogleGenAI, Type } from "@google/genai";
import { Voter, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Enhanced Pre-clean function to fix common PDF/OCR artifacts
const preCleanText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/Ïমাঃ/g, 'মোঃ')
    .replace(/Ïমাছাঃ/g, 'মোছাঃ')
    .replace(/Řীদাসগাতী/g, 'শ্রীদাসগাতী')
    .replace(/Ïভাটার নং/g, 'ভোটার নং')
    .replace(/িপতা/g, 'পিতা')
    .replace(/জĥ তািরখ/g, 'জন্ম তারিখ')
    .replace(/িঠকানা/g, 'ঠিকানা')
    .replace(/Ïপশা/g, 'পেশা')
    .replace(/Ïকাড/g, 'কোড')
    .replace(/Ĵকােশর/g, 'প্রকাশের')
    .replace(/Ïজলা/g, 'জেলা')
    .replace(/Ïপৗর/g, 'পৌর')
    .replace(/Ĵামািনক/g, 'প্রামানিক')
    .replace(/ID No/gi, 'ভোটার আইডি')
    .replace(/Sl নং/gi, 'সিরিয়াল')
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
};

export const getAIInsight = async (query: string, voters: Voter[]) => {
  const dataSummary = voters.slice(0, 50).map(v => 
    `Name: ${v.name}, Age: ${v.age}, Gender: ${v.gender}, Ward: ${v.ward}, NID: ${v.nid}`
  ).join('\n');

  const systemPrompt = `You are a village administration assistant for Sridashgati village, Sirajganj. 
  Answer the user's questions about the voter data in Bengali. 
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
    return "দুঃখিত, বর্তমানে এআই তথ্য দিতে পারছে না।";
  }
};

export const parseVoterText = async (rawText: string): Promise<Omit<Voter, 'id'>[]> => {
  const cleanedInput = preCleanText(rawText);
  
  const systemPrompt = `You are an expert data parser for Bengali Election Commission Voter Lists.
  
  The input text follows this column pattern but might be messy: 
  "Sl নং", "নাম", "ভোটার আইডি (ID No)", "পিতা", "মাতা", "জন্ম তারিখ".

  Rules:
  1. Carefully group data that belongs to one person. Often a single record spans multiple lines.
  2. Map "নাম" -> name
  3. Map "ভোটার আইডি" or "ID No" -> nid (This is a 10, 13, or 17 digit number)
  4. Map "পিতা" -> fatherName
  5. Map "মাতা" -> motherName
  6. Map "জন্ম তারিখ" -> dob. If the year is YY (like 80), assume 1980.
  7. Age Calculation: age = 2024 - (year from dob).
  8. Default Ward: "১ নম্বর ওয়ার্ড"
  9. Default Address: "শ্রীদাসগাতী"
  10. Default Gender: 'পুরুষ' (unless it's Mohatila/Female list).

  Output MUST be a valid JSON array. Do not include markdown formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract records from this text:\n\n${cleanedInput}`,
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
              dob: { type: Type.STRING },
              age: { type: Type.NUMBER },
              gender: { type: Type.STRING, enum: ['পুরুষ', 'মহিলা', 'অন্যান্য'] },
              nid: { type: Type.STRING },
              ward: { type: Type.STRING },
              address: { type: Type.STRING }
            },
            required: ["name", "fatherName", "motherName", "dob", "age", "gender", "nid", "ward", "address"]
          }
        }
      }
    });

    const text = response.text.trim();
    // Sometimes response contains markdown code blocks even with mimeType set
    const jsonStr = text.replace(/^```json/, '').replace(/```$/, '').trim();
    const result = JSON.parse(jsonStr);
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("এআই তথ্য শনাক্ত করতে ব্যর্থ হয়েছে। অনুগ্রহ করে টেক্সটটি পুনরায় কপি করে সঠিক ফরম্যাটে পেস্ট করুন।");
  }
};
