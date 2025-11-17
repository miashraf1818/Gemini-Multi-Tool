import { GoogleGenAI, Modality, Chat, Type } from "@google/genai";
import { ChatMessage, AspectRatio, BillData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a bill image and returns structured data.
 */
export const analyzeBill = async (
  base64Data: string, 
  mimeType: string
): Promise<BillData> => {
  const prompt = "Analyze the provided image of a bill. Extract all line items, including their name/description, quantity, and price. Also, identify the final total amount. Return this information in a structured JSON format.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: 'List of items purchased.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name or description of the item." },
                  quantity: { type: Type.ONE_OF, oneOf: [{type: Type.NUMBER}, {type: Type.STRING}], description: "Quantity of the item. Can be a number or text like '1kg'." },
                  price: { type: Type.ONE_OF, oneOf: [{type: Type.NUMBER}, {type: Type.STRING}], description: "Price of the item. Can be a number or text with currency." },
                },
                required: ["name", "quantity", "price"],
              },
            },
            total: {
              type: Type.ONE_OF,
              oneOf: [{type: Type.NUMBER}, {type: Type.STRING}],
              description: "The total amount of the bill, including currency symbol if present.",
            },
          },
          required: ["items", "total"],
        },
      },
    });

    const jsonText = response.text.trim();
    if (jsonText.startsWith("```json")) {
        return JSON.parse(jsonText.substring(7, jsonText.length - 3).trim()) as BillData;
    }
    return JSON.parse(jsonText) as BillData;
  } catch (error: any) {
    console.error("Error analyzing bill image:", error);

    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse the AI's response. The bill might be too blurry, unreadable, or in an unsupported format.");
    }

    // Check for common API error messages from Gemini
    if (error.message && error.message.includes('SAFETY')) {
        throw new Error("The image was blocked for safety reasons. Please use a clear image of a standard bill.");
    }

    // Generic fallback for other API errors
    throw new Error("The AI failed to process the image. This could be due to a temporary service issue or an unsupported image. Please try again.");
  }
};

/**
 * Extracts plain text from an image using OCR.
 */
export const extractTextFromImage = async (
  base64Data: string,
  mimeType: string
): Promise<string> => {
  const prompt = "Extract all text from the provided image. Present the text exactly as it appears, maintaining original line breaks and formatting as much as possible.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Error extracting text from image:", error);
    if (error.message && error.message.includes('SAFETY')) {
        throw new Error("The image was blocked for safety reasons. Please use a different image.");
    }
    throw new Error("The AI failed to process the image. Please try again.");
  }
};


/**
 * Generates an image using Imagen 4.
 */
export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });
    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    }
    throw new Error("No image was generated.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Gemini API call failed.");
  }
};

/**
 * Edits an image based on a text prompt using Gemini 2.5 Flash Image.
 */
export const editImage = async (
  base64Data: string, 
  mimeType: string, 
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No edited image was returned.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Gemini API call failed.");
  }
};

/**
 * Continues a chat conversation with Gemini.
 * Uses different models based on the selected mode.
 */
export const continueChat = async (history: ChatMessage[], mode: 'fast' | 'pro'): Promise<string> => {
  // FIX: Updated model name to 'gemini-flash-lite-latest' for 'fast' mode per guidelines.
  const modelName = mode === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-2.5-pro';
  
  try {
    const config = mode === 'pro' 
        ? { config: { thinkingConfig: { thinkingBudget: 32768 } } }
        : {};
            
    // FIX: Removed flawed chat session caching. A new chat is created for each turn with the full history.
    // This is inefficient but matches the component's stateless design without causing a memory leak.
    const chat = ai.chats.create({
        model: modelName,
        ...config,
        history: history.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
    });
    
    const lastMessage = history[history.length - 1];
    
    const result = await chat.sendMessage({ message: lastMessage.text });
    return result.text;
  } catch (error) {
    console.error("Error in chat:", error);
    throw new Error("Gemini API call failed.");
  }
};