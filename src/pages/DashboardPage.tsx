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
  const [qrZoom, setQrZoom] = useState<Group | null>(null);
  const playBase = `${window.location.origin}/play/`;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        nav("/");
        return;
      }
      const q = query(
        collection(db, "groups"),
        where("hostUid", "==", u.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setGroups(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Group[]);
    });
    return () => unsub();
  }, [nav]);

  async function handleLogout() {
    await signOut(auth);
    nav("/");
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 sm:pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
          Top Game Score
        </h1>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => nav("/create")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition font-medium"
            aria-label="Create a new quiz"
            title="Create a new quiz"
          >
            ➕ <span className="hidden xs:inline">New Quiz</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition font-medium"
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Quiz List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
          <div className="col-span-full text-center py-10 text-slate-400 italic border border-slate-800 rounded-xl bg-slate-900/40">
            You haven’t created any quizzes yet.
            <br />
            <span className="text-indigo-400 not-italic">Tap “New Quiz” to start!</span>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrZoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-xl p-5 sm:p-6 text-center">
            <h3 className="font-semibold text-lg sm:text-xl text-slate-100 mb-3">
              QR Code — {qrZoom.title || qrZoom.code}
            </h3>

            {/* QR responsivo */}
            <div className="mx-auto inline-block">
              <QRCodeCanvas
                value={`${playBase}${qrZoom.code}`}
                size={220}
                style={{ width: "min(80vw, 220px)", height: "auto" }}
              />
            </div>

            <a
              className="mt-4 block text-indigo-400 hover:underline break-all"
              href={`${playBase}${qrZoom.code}`}
              target="_blank"
              rel="noreferrer"
            >
              {playBase}
              {qrZoom.code}
            </a>

            <button
              onClick={() => setQrZoom(null)}
              className="mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-sm"
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
        byPlayer.set(a.playerId, (byPlayer.get(a.playerId) ?? 0) + (a.scoreAwarded ?? 0));
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-indigo-600 transition-all duration-200 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-base sm:text-lg text-slate-100 truncate">
            {group.title || "Quiz"}
          </div>
          <div className="text-xs text-slate-500">Code: {group.code}</div>
        </div>
        <button
          onClick={onOpenQR}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
          aria-label="Show QR code"
          title="Show QR code"
        >
          Show QR
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <a
          className="text-indigo-400 underline truncate hover:text-indigo-300 max-w-[70%]"
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          title={playUrl}
        >
          {playUrl}
        </a>
        <button
          onClick={onOpenHost}
          className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition"
        >
          Manage
        </button>
      </div>

      <div className="text-sm mt-2">
        <div className="text-slate-400 mb-1">Top Player</div>
        {winner ? (
          <div className="flex justify-between text-slate-200">
            <span className="truncate">{winner.name}</span>
            <span className="font-mono text-emerald-400">{winner.totalScore}</span>
          </div>
        ) : (
          <div className="italic text-slate-500">No players yet</div>
        )}
      </div>
    </div>
  );
}
