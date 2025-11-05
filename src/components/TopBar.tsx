import LanguageSwitcher from './LanguageSwitcher';
import { Link } from 'react-router-dom';

export default function TopBar() {
  return (
    <div className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800">
      <Link to="/" className="text-slate-300 hover:text-white text-sm">← Back</Link>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
