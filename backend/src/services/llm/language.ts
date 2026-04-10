export function getLanguageCode(language?: string): string {
  if (!language) {
    return "en";
  }

  const trimmed = language.trim().toLowerCase();
  if (!trimmed) {
    return "en";
  }

  return trimmed.split("-")[0];
}

export function getLanguagePromptInstruction(language?: string): string {
  const code = getLanguageCode(language);

  if (code === "en") {
    return "Respond in English.";
  }

  return `Respond in the language indicated by this BCP-47 locale code: \"${code}\".`;
}
