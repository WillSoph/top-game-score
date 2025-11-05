import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, ensureAnonAuth } from '../lib/firebase';
import { useEffect, useState } from 'react';

type Props = {
  groupId: string;
  onJoined?: () => void; // avisa o PlayPage para liberar a pergunta e iniciar o timer local
};

export default function PlayerJoin({ groupId, onJoined }: Props) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void ensureAnonAuth(); }, []);

  function validate(): string | null {
    const n = name.trim();
    const h = handle.trim();
    if (!n) return 'Please enter your name.';
    if (!h) return 'Please enter your @handle.';
    if (!h.startsWith('@') || h.length < 2) return 'Your handle must start with @ (e.g., @player).';
    if (/\s/.test(h)) return 'Your handle cannot contain spaces.';
    return null;
  }

  async function join() {
    const problem = validate();
    if (problem) { alert(problem); return; }

    setLoading(true);
    try {
      await ensureAnonAuth();
      const uid = auth.currentUser!.uid;

      // garante que o grupo está "open"
      const gSnap = await getDoc(doc(db, 'groups', groupId));
      const g = gSnap.data() as any;
      if (!gSnap.exists() || g?.status !== 'open') {
        alert('The quiz is not open yet.');
        return;
        }

      // cria/atualiza o player (as regras permitem o próprio usuário escrever no seu doc)
      await setDoc(
        doc(db, 'groups', groupId, 'players', uid),
        {
          name: name.trim(),
          handle: handle.trim(),
          totalScore: 0,
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setJoined(true);     // feedback visual
      onJoined?.();        // libera o quiz no PlayPage (começa o timer local por jogador)
    } catch (e: any) {
      console.error('join error', e);
      alert(`Failed to join: ${e?.code || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="w-full px-3 py-2 rounded bg-slate-800"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading || joined}
      />
      <input
        className="w-full px-3 py-2 rounded bg-slate-800"
        placeholder="@social (required)"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        disabled={loading || joined}
      />
      <button
        onClick={join}
        disabled={loading || joined}
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
      >
        {joined ? 'Joined' : (loading ? 'Joining…' : 'Join')}
      </button>
      <p className="text-xs text-amber-300/90 border border-amber-500/30 rounded p-3 mt-2">
        ⚠️ This group and its data will be automatically deleted in 7 days.
      </p>
    </div>
  );
}
