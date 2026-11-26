import ptBR from './pt-BR.json';
import en from './en.json';

export type Key = keyof typeof ptBR;
const dicts: Record<string, Record<Key, string>> = { 'pt-BR': ptBR, en };

// No persistence: language comes from the browser on every load.
export const lang = navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
document.documentElement.lang = lang;

export function t(key: Key, vars?: Record<string, string | number>) {
  return dicts[lang][key].replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
}

export const formatTime = (ms: number) => new Intl.DateTimeFormat(lang, { timeStyle: 'medium' }).format(ms);
