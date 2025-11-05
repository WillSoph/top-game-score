import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' }
];

export default function LanguageSwitcher(){
  const { i18n } = useTranslation();
  return (
    <div className="flex gap-2 text-sm">
      {langs.map(l => (
        <button key={l.code}
          onClick={()=> i18n.changeLanguage(l.code)}
          className={`px-2 py-1 rounded border ${i18n.language.startsWith(l.code)? 'bg-slate-800 border-slate-600':'border-slate-800'}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
