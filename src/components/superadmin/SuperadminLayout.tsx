import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import SuperadminSidebar from "./SuperadminSidebar";

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
};

export default function SuperadminLayout({
  children,
  title,
  description,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050B1C] text-white">
      <SuperadminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="min-h-screen lg:pl-[244px]">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050B1C]/90 px-5 py-5 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-xl border border-white/10 p-2 text-slate-300 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-slate-400">{description}</p>
              )}
            </div>

            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-[#142039] px-4 py-2 text-sm text-slate-200 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                SA
              </span>
              Superadmin
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
