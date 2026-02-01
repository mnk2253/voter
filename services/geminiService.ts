
import { GoogleGenAI, Type } from "@google/genai";
import { Voter, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Enhanced Pre-clean function to fix common PDF encoding artifacts
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
    .replace(/Sl নং/gi, 'সিরিয়াল নং');
};

export const getAIInsight = async (query: string, voters: Voter[]) => {
  const dataSummary = voters.slice(0, 50).map(v => 
    `Name: ${v.name}, Age: ${v.age}, Gender: ${v.gender}, Ward: ${v.ward}, NID: ${v.nid}`
  ).join('\n');

  const systemPrompt = `You are a village administration assistant for Sridashgati village, Sirajganj. 
  Answer the user's questions about the voter data in Bengali. 
  Calculate stats accurately based on the provided list of ${voters.length} voters.
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
  const cleanedInput = preCleanText(rawText);
  
  const systemPrompt = `You are a highly accurate data extraction assistant for Bengali Election Commission (EC) Voter Lists.
  
  Input Context:
  - The text often has headers like: "Sl নং", "নাম", "ভোটার আইডি (ID No)", "পিতা", "মাতা", "জন্ম তারিখ".
  
  Instructions:
  1. Identify individual voter records.
  2. Map "নাম" to name.
  3. Map "ভোটার আইডি" or "ID No" to nid.
  4. Map "পিতা" to fatherName.
  5. Map "মাতা" to motherName.
  6. Map "জন্ম তারিখ" to dob (Date of Birth). Format should be DD/MM/YYYY if possible.
  7. Calculate 'age' using "জন্ম তারিখ". Current year is 2024.
  8. Standardize Ward to "১ নম্বর ওয়ার্ড" if not explicitly mentioned.
  9. Default Address is "শ্রীদাসগাতী".
  10. Default Gender: 'পুরুষ' unless specified otherwise.
  
  Output Requirements:
  - Return a clean JSON array of objects.
  - If no data is found, return [].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the following voter data from this text:\n\n${cleanedInput}`,
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
    const result = JSON.parse(text);
    
    if (!Array.isArray(result)) return [];
    return result;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("এআই তথ্য শনাক্ত করতে ব্যর্থ হয়েছে। টেক্সটটি পরিষ্কারভাবে কপি করে পুনরায় চেষ্টা করুন।");
  }
};
