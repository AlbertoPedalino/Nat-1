// The app's one way to ask for a line of text: the browser's prompt, behind an
// injectable function so callers stay testable without a real window. Returns
// the trimmed text, or null when the prompt is cancelled or left empty.
export function promptText(message, initial = '', promptFn = window.prompt) {
  const value = promptFn(message, initial);
  const text = value == null ? '' : String(value).trim();
  return text || null;
}
