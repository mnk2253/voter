
import { GoogleGenAI, Type } from "@google/genai";
import { Voter, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const preCleanText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/Ïমাঃ/g, 'মোঃ')
    .replace(/Ïমাছাঃ/g, 'মোছাঃ')
    .replace(/Ïম/g, 'মো') 
    .replace(/Ï/g, 'মো') 
    .replace(/Řীদাসগাতী/g, 'শ্রীদাসগাতী')
    .replace(/Řী/g, 'শ্রী')
    .replace(/Ř/g, 'শ্র')
    .replace(/Ĵামািনক/g, 'প্রামানিক')
    .replace(/Ĵকােশর/g, 'প্রকাশের')
    .replace(/Ĵ/g, 'প্র')
    .replace(/জĥ/g, 'জন্ম')
    .replace(/তািরখ/g, 'তারিখ')
    .replace(/িঠকানা/g, 'ঠিকানা')
    .replace(/িপতা/g, 'পিতা')
    .replace(/মাড়া/g, 'মাতা')
    .replace(/Voter Number/gi, 'ভোটার আইডি')
    .replace(/ID No/gi, 'ভোটার আইডি')
    .replace(/Sl নং/gi, 'ক্রমিক নং')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

export const getAIInsight = async (query: string, voters: Voter[]) => {
  const dataSummary = voters.slice(0, 50).map(v => 
    `Name: ${v.name}, Age: ${v.age}, Gender: ${v.gender}, Ward: ${v.ward}, NID: ${v.nid}`
  ).join('\n');

  const systemPrompt = `You are a village administration assistant for Sridashgati village. 
  Answer in Bengali based on the voter list data.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: systemPrompt,
      },
    });
    return response.text;
  } catch (error) {
    return "দুঃখিত, এআই বর্তমানে ব্যস্ত।";
  }
};

/**
 * Parses a single chunk of text.
 */
export const parseVoterChunk = async (chunk: string): Promise<Omit<Voter, 'id'>[]> => {
  const cleanedInput = preCleanText(chunk);
  
  const systemPrompt = `You are an expert data extractor for Bengali Voter List PDFs.
  The input text follows this column order: Sl, Name, Voter Number (NID), Father Name, Mother Name, BirthDate.
  The text has ANSI/SutonnyMJ encoding issues: "Ïমাঃ" -> "মোঃ", "Řী" -> "শ্রী", "জĥ" -> "জন্ম".
  
  TASK:
  Extract EVERY SINGLE voter record found in the provided text. Do NOT skip any row.
  
  FIELD MAPPING:
  - "Sl" -> slNo (The Serial Number exactly as written in the PDF, e.g., "১" or "001")
  - "Name" -> name
  - "Voter Number" or numeric ID -> nid
  - "Father Name" -> fatherName
  - "Mother Name" -> motherName
  - "BirthDate" -> dob (Format: DD/MM/YYYY)
  
  RULES:
  1. Each voter starts with a Serial Number (Sl). This MUST be captured in slNo.
  2. If BirthDate is missing, estimate age as 30. If present, age = 2024 - Birth Year.
  3. Default Ward: "১ নম্বর ওয়ার্ড", Address: "শ্রীদাসগাতী", Gender: "পুরুষ".
  4. Ensure the output is a complete JSON array of objects.
  
  IMPORTANT: Capture the slNo field exactly as it appears in the text for each person.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract ALL voter records with their Sl numbers from this segment:\n\n${cleanedInput}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              slNo: { type: Type.STRING },
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
            required: ["slNo", "name", "fatherName", "motherName", "dob", "age", "gender", "nid", "ward", "address"]
          }
        }
      }
    });

    const text = response.text.trim();
    const result = JSON.parse(text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Chunk Parsing Error:", error);
    return [];
  }
};
