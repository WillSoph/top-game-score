import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

type Group = {
  id: string;
  code: string;
  title: string;
  createdAt?: any;
};

export default function DashboardPage() {
  const nav = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [qrZoom, setQrZoom] = useState<Group | null>(null);
  const playBase = `${window.location.origin}/play/`;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        nav("/");
        return;
      }
      setUid(u.uid);

      const q = query(
        collection(db, "groups"),
        where("hostUid", "==", u.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setGroups(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Group[]
      );
    });
    return () => unsub();
  }, [nav]);

  async function handleLogout() {
    await signOut(auth);
    nav("/");
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Host Dashboard
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => nav("/create")}
            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 transition font-medium"
          >
            ➕ New Quiz
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Quiz List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            playUrl={`${playBase}${g.code}`}
            onOpenQR={() => setQrZoom(g)}
            onOpenHost={() => nav(`/host/${g.id}`)}
          />
        ))}

        {groups.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400 italic border border-slate-800 rounded-lg">
            You haven’t created any quizzes yet.<br /> 
            <span className="text-indigo-400">Click “New Quiz” to start!</span>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrZoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-6 max-w-md w-full text-center">
            <h3 className="font-semibold text-lg text-slate-100 mb-3">
              QR Code — {qrZoom.title || qrZoom.code}
            </h3>
            <QRCodeCanvas value={`${playBase}${qrZoom.code}`} size={220} />
            <a
              className="block text-indigo-400 hover:underline mt-4"
              href={`${playBase}${qrZoom.code}`}
              target="_blank"
              rel="noreferrer"
            >
              {playBase}{qrZoom.code}
            </a>
            <button
              onClick={() => setQrZoom(null)}
              className="mt-5 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Subcomponent: GroupCard ---------------------- */

function GroupCard({
  group,
  playUrl,
  onOpenQR,
  onOpenHost,
}: {
  group: Group;
  playUrl: string;
  onOpenQR: () => void;
  onOpenHost: () => void;
}) {
  const [winner, setWinner] = useState<{ name: string; totalScore: number } | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "groups", group.id, "answers"));
      const byPlayer = new Map<string, number>();
      snap.forEach((doc) => {
        const a = doc.data() as any;
        byPlayer.set(
          a.playerId,
          (byPlayer.get(a.playerId) ?? 0) + (a.scoreAwarded ?? 0)
        );
      });
      if (byPlayer.size === 0) return;

      const playersSnap = await getDocs(collection(db, "groups", group.id, "players"));
      const players = new Map(playersSnap.docs.map((d) => [d.id, d.data() as any]));

      let bestId = "",
        bestScore = -1;
      byPlayer.forEach((score, id) => {
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      });
      const p = players.get(bestId);
      setWinner({ name: p?.name || "Player", totalScore: bestScore });
    })();
  }, [group.id]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-600 transition-all duration-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg text-slate-100">{group.title || "Quiz"}</div>
          <div className="text-xs text-slate-500">Code: {group.code}</div>
        </div>
        <button
          onClick={onOpenQR}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
        >
          Show QR
        </button>
      </div>

      <div className="flex items-center justify-between text-sm">
        <a
          className="text-indigo-400 underline truncate hover:text-indigo-300"
          href={playUrl}
          target="_blank"
          rel="noreferrer"
        >
          {playUrl}
        </a>
        <button
          onClick={onOpenHost}
          className="px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition"
        >
          Manage
        </button>
      </div>

      <div className="text-sm mt-2">
        <div className="text-slate-400 mb-1">Top Player</div>
        {winner ? (
          <div className="flex justify-between text-slate-200">
            <span>{winner.name}</span>
            <span className="font-mono text-emerald-400">{winner.totalScore}</span>
          </div>
        ) : (
          <div className="italic text-slate-500">No players yet</div>
        )}
      </div>
    </div>
  );
}
