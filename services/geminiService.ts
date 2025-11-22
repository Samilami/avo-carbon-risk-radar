
import { GoogleGenAI, Type } from "@google/genai";
import { RiskReport, RiskLevel, RiskCategory, HistoryDataPoint } from "../types";

// Helper: Delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry wrapper for API calls with improved error detection and Aggressive Backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Detect various forms of Rate Limiting errors
    const isRateLimit = 
      error.status === 429 || 
      error.code === 429 || 
      error.status === 'RESOURCE_EXHAUSTED' ||
      (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) ||
      (error.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('exhausted') ||
        error.message.includes('RESOURCE_EXHAUSTED')
      ));

    if (isRateLimit) {
      // AGGRESSIVE BACKOFF: If we hit a 429, we must wait significantly longer.
      // 15 seconds base wait for rate limits.
      const waitTime = delayMs < 15000 ? 15000 : delayMs * 2;
      console.warn(`Rate limit (429) hit. Pausing for ${waitTime/1000}s before retry...`);
      await delay(waitTime);
      if (retries > 0) {
        return withRetry(fn, retries - 1, waitTime);
      }
    }
    
    // For non-rate-limit errors, use standard backoff
    if (retries > 0) {
      console.warn(`API Error. Retrying in ${delayMs/1000}s...`);
      await delay(delayMs);
      return withRetry(fn, retries - 1, delayMs * 1.5);
    }

    throw error;
  }
}

const determineRiskLevel = (text: string): RiskLevel => {
  const lower = text.toLowerCase();
  if (lower.includes("critical") || lower.includes("kritisch") || lower.includes("severe") || lower.includes("schwerwiegend")) return RiskLevel.CRITICAL;
  if (lower.includes("high") || lower.includes("hoch") || lower.includes("alert") || lower.includes("warnung")) return RiskLevel.HIGH;
  if (lower.includes("medium") || lower.includes("mittel") || lower.includes("moderate")) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
};

export const fetchRiskAnalysis = async (
  category: RiskCategory, 
  promptContext: string, 
  apiKey: string
): Promise<RiskReport> => {
  
  const ai = new GoogleGenAI({ apiKey });
  
  const now = new Date();
  const currentDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  const systemInstruction = `Du bist ein Senior Risikoanalyst für Avo Carbon Germany.
  Antworte professionell auf Deutsch.
  WICHTIG: Heute ist ${currentDate}. Nutze NUR aktuelle Daten aus 2025 und den letzten Wochen/Monaten.
  Fokus: Fakten, PREISE, DATEN und TRENDS.

  FORMAT:
  1. Start: [NIEDRIG], [MITTEL], [HOCH] oder [KRITISCH].
  2. Bei Preisen: (TREND: STEIGEND/FALLEND/STABIL).
  3. Nutze **Fett** für Zahlen.
  4. Verwende ECHTE aktuelle Marktdaten, keine veralteten Informationen aus 2023 oder 2024.
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptContext,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: systemInstruction,
        },
      });
    });

    const fullText = response.text || "Keine Daten verfügbar.";
    
    let level = RiskLevel.UNKNOWN;
    const riskMatch = fullText.match(/^\[(NIEDRIG|MITTEL|HOCH|KRITISCH)\]/i);
    if (riskMatch) {
      const match = riskMatch[1].toUpperCase();
      if (match === 'NIEDRIG') level = RiskLevel.LOW;
      if (match === 'MITTEL') level = RiskLevel.MEDIUM;
      if (match === 'HOCH') level = RiskLevel.HIGH;
      if (match === 'KRITISCH') level = RiskLevel.CRITICAL;
    } else {
      level = determineRiskLevel(fullText);
    }

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Quelle",
        uri: chunk.web?.uri || "#"
      }))
      .filter((s: any) => s.uri !== "#") || [];

    const summary = fullText.replace(/^\[(NIEDRIG|MITTEL|HOCH|KRITISCH)\]\s*/i, "").trim();

    return {
      id: Math.random().toString(36).substr(2, 9),
      category: category,
      title: `${category} Monitor`,
      summary: summary,
      level: level,
      timestamp: Date.now(),
      sources: sources.slice(0, 5)
    };

  } catch (error) {
    console.error(`Error fetching ${category}:`, error);
    // Return a graceful error state instead of throwing
    return {
      id: Math.random().toString(36).substr(2, 9),
      category: category,
      title: `${category} (Nicht verfügbar)`,
      summary: "Aktuell keine Datenabfrage möglich (Quota Limit). Dieser Bericht wird beim nächsten Update erneut versucht.",
      level: RiskLevel.UNKNOWN,
      timestamp: Date.now(),
      sources: []
    };
  }
};

// New Streaming Implementation to handle Rate Limits better
export const streamRiskAnalysis = async (
  apiKey: string, 
  onReportLoaded: (report: RiskReport) => void
) => {
  const now = new Date();
  const currentMonth = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const prompts: { cat: RiskCategory; text: string }[] = [
    {
      cat: 'Wetter',
      text: `Aktuelle Extremwetter-Situation ${currentMonth}: Frankfurt, Indien, China, Tunesien. Welche aktuellen Wetterrisiken gibt es HEUTE/diese Woche?`
    },
    {
      cat: 'Logistik',
      text: `Aktuelle Logistik-Risiken ${currentMonth}: Hamburger Hafen, Suezkanal, Luftfracht. Was sind die neuesten Entwicklungen?`
    },
    {
      cat: 'Rohstoffe',
      text: `KUPFER und GRAPHIT aktuelle Preise ${currentMonth} (USD/Tonne). Genaue Zahlen der letzten Wochen. Welcher Trend zeigt sich aktuell (letzte 4-8 Wochen)? Nutze aktuelle Börsen-/Marktdaten.`
    },
    {
      cat: 'Energie',
      text: `Industriestrom und Erdgas Preise Deutschland ${currentMonth}. Aktuelle Preise in Cent/kWh bzw. EUR/MWh. Trend der letzten Wochen? Nutze aktuelle Energiemarkt-Daten.`
    },
    {
      cat: 'Verkehr',
      text: `Aktuelle Verkehrslage ${currentMonth}: Frankfurt am Main (A3, A5, A66), Hessen (A7, A45), Deutschland Hauptrouten, Europa Transitwege. Gibt es HEUTE/diese Woche Staus, Baustellen, Unfälle? Durchschnittliche LKW-Transportkosten pro Kilometer in EUR (aktuell 2025).`
    },
    {
      cat: 'Politik',
      text: `Aktuelle politische Risiken ${currentMonth}: Neue Gesetze/Regulierungen Deutschland, China/Russland/Nahost. Was sind die neuesten Entwicklungen?`
    },
    {
      cat: 'Wirtschaft',
      text: `Autoindustrie Wirtschaftslage ${currentMonth}: Aktuelle Inflation, Zinsen, Konjunktur. Was sind die neuesten Zahlen und Trends?`
    },
    {
      cat: 'Kunden',
      text: `Aktuelle News ${currentMonth}: Bosch, Nidec, Mahle, Denso, Valeo. Welche neuen Entwicklungen gibt es bei diesen Unternehmen?`
    },
    {
      cat: 'Feiertage',
      text: `Kommende Feiertage (nächste 4 Wochen ab ${currentMonth}): Indien, China, Tunesien, Frankreich. Welche Feiertage stehen an?`
    }
  ];

  // We process items sequentially with significant delays to respect the free tier limit (~15 RPM or lower with complex queries)
  for (const p of prompts) {
    const result = await fetchRiskAnalysis(p.cat, p.text, apiKey);
    onReportLoaded(result);
    
    // 10 SECONDS DELAY between requests. 
    // This is slow, but necessary to avoid "RESOURCE_EXHAUSTED".
    await delay(10000);
  }
};

export const fetchCommodityHistory = async (apiKey: string, topic: string): Promise<HistoryDataPoint[]> => {
  const ai = new GoogleGenAI({ apiKey });

  // Get current date to ensure we request 2025 data
  const now = new Date();
  const currentMonth = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  const prompt = `WICHTIG: Heute ist ${currentMonth}. Liefere die aktuellsten verfügbaren Preise für ${topic} der letzten 6 Monate (von ${now.getMonth() - 5 < 0 ? 12 + (now.getMonth() - 5) : now.getMonth() - 5}/2024 bis ${currentMonth}). Nutze ECHTE aktuelle Marktdaten, keine historischen Daten aus 2023. JSON Format mit label (z.B. "Nov 2024"), value (Zahl), unit (Einheit).`;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER },
                unit: { type: Type.STRING }
              },
              required: ["label", "value", "unit"]
            }
          }
        }
      });
    }, 3, 15000); // 15s initial delay for history retry

    const json = JSON.parse(response.text || "[]");
    return json;
  } catch (e) {
    console.error(`History fetch failed for ${topic}`, e);
    return [
      { label: 'N/A', value: 0, unit: 'N/A' },
      { label: 'N/A', value: 0, unit: 'N/A' },
      { label: 'N/A', value: 0, unit: 'N/A' },
      { label: 'N/A', value: 0, unit: 'N/A' },
      { label: 'N/A', value: 0, unit: 'N/A' },
      { label: 'N/A', value: 0, unit: 'N/A' },
    ];
  }
};
