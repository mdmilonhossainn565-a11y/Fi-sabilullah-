import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function correctRecitation(audioBase64: string, expectedVerse: string, mimeType: string = "audio/webm") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64,
              },
            },
            {
              text: `I am reciting the following Quranic verse: "${expectedVerse}". 
              Please listen to my recitation carefully and identify any specific mistakes in:
              1. Tajweed (তাজবিদ) - Rules of recitation.
              2. Makhraj (মাখরাজ) - Pronunciation of letters.
              3. Harakat (হরকত) - Vowels and length.
              
              Provide the feedback in Bengali (বাংলা). Be encouraging. 
              If the recitation is correct, praise it with "মাশাআল্লাহ" (Ma Sha Allah) and mention that the Tajweed and Makhraj are accurate.
              Format the response clearly with bullet points.`,
            },
          ],
        },
      ],
    });
    return response.text || "দুঃখিত, কোনো ফলাফল পাওয়া যায়নি।";
  } catch (error: any) {
    console.error("Error in recitation correction:", error);
    if (error?.message?.includes("model not found")) {
      return "দুঃখিত, এআই মডেলটি বর্তমানে পাওয়া যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।";
    }
    return "দুঃখিত, আপনার তেলাওয়াত বিশ্লেষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
  }
}
