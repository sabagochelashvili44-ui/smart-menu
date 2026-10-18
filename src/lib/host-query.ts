export function looksLikeCulinaryQuestion(raw: string) {
  const text = raw.trim();
  if (text.length < 8) return false;
  if (/[?؟]/.test(text)) return true;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 5) return true;

  return (
    /(რა |რომელ|გაქვთ|შევუკვეთ|უგლუტენ|გლუტენ|ღვინო|ალერგ|დიეტ|შევუხამ|რეკომენდ|ვეგან|ვეგეტარ)/i.test(
      text,
    ) ||
    /\b(what|which|recommend|pairing|wine|gluten|vegan|allerg|how|can i|do you have)\b/i.test(
      text,
    ) ||
    /(что |какое|какие |у вас|без глютен|вино|аллерг|веган|посовет)/i.test(text)
  );
}
