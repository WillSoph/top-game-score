import React from 'react';
import LanguageSwitcher from '../LanguageSwitcher';

type FooterProps = {
  siteName?: string;
};

export default function Footer({ siteName = 'TopGameScore' }: FooterProps) {
  return (
    <footer className="mt-12 border-t border-slate-800/60 bg-slate-950/40">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* brand */}
          <div>
            <div className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              {siteName}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Crie quizzes em segundos. Simples, rápido e divertido.
            </p>
          </div>

          {/* links */}
          <nav className="grid grid-cols-2 gap-2 text-sm">
            <a href="/#pricing" className="text-slate-300 hover:text-white transition">Preços</a>
            <a href="/privacy" className="text-slate-300 hover:text-white transition">Privacidade</a>
            <a href="/terms" className="text-slate-300 hover:text-white transition">Termos</a>
            <a href="/contact" className="text-slate-300 hover:text-white transition">Contato</a>
          </nav>

          {/* controls */}
          <div className="flex items-center justify-start sm:justify-end gap-3">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {siteName}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
