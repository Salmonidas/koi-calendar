export class GeminiTranslator {
  static async translateText(text: string, lang: string, wordsToProtect: string[] = []): Promise<string> {
    if (!text || lang === 'en') return text;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return text;

    const langMap: Record<string, string> = { en: "English", es: "Spanish" };
    const targetLanguageName = langMap[lang] || lang;
    const originalText = text;

    const requestBody = {
      contents: [{
        parts: [{
          text: `You are a professional translator specializing in esports. Translate the following text to ${targetLanguageName}. RETURN ONLY THE TRANSLATED TEXT AND NOTHING ELSE. Do not include any extra characters like quotation marks, bolding, or explanations. Maintain the exact capitalization for words that are not translated (e.g., "Team" remains "Team" if not translated). For words that are translated, their capitalization should match the original word's capitalization (e.g., "Word" translates to "Palabra", "WORD" translates to "PALABRA", "word" translates to "palabra").
          
          Do not translate the following words/names: ${wordsToProtect.join(', ')}.\n\nText to translate: ${text}`
        }]
      }]
    };

    const MAX_RETRIES = 3;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 200) {
          const data = await response.json();
          let translatedText = data.candidates[0]?.content?.parts[0]?.text || originalText;
          translatedText = this.restoreVsFromContra(originalText, translatedText, lang);
          return translatedText.trim();
        } else if (response.status === 429) {
          break;
        }

        attempts++;
        if (attempts < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.min(8000, Math.pow(2, attempts) * 1000)));
        }
      } catch (e) {
        attempts++;
        if (attempts < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    return originalText;
  }

  static restoreVsFromContra(originalText: string, translatedText: string, lang: string): string {
    if (lang === 'en') return translatedText;

    const vsRegex = /\bvs\b|\bVS\b/gi;
    let vsMatches = [];
    let match;
    let tempOriginal = originalText;

    while ((match = vsRegex.exec(tempOriginal)) !== null) {
      vsMatches.push(match[0]);
    }

    if (vsMatches.length === 0) return translatedText;

    const contraRegex = /\b(\w+)\s+contra\s+(\w+)\b/gi;
    return translatedText.replace(contraRegex, (m, palabra1, palabra2) => {
      return `${palabra1} vs ${palabra2}`;
    });
  }
}
