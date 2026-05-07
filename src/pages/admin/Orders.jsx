import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const STATUTS = ["En attente", "Confirmé", "Livré", "Annulé"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirmé": "bg-blue-100 text-blue-700",
  "Livré": "bg-green-100 text-green-700",
  "Annulé": "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("Tous");
  const [selected, setSelected] = useState(null);

  useEffect(() => { chargerCommandes(); }, []);

  async function chargerCommandes() {
    const snap = await getDocs(collection(db, "commandes"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setCommandes(data);
    setLoading(false);
  }

  async function changerStatut(id, statut) {
    await updateDoc(doc(db, "commandes", id), { statut });
    setCommandes(prev =>
      prev.map(c => c.id === id ? { ...c, statut } : c)
    );
    if (selected?.id === id) setSelected(s => ({ ...s, statut }));
  }

  const filtrees = filtre === "Tous"
    ? commandes
    : commandes.filter(c => c.statut === filtre);

  function formatDate(ts) {
    if (!ts?.seconds) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="font-black text-white text-xl">MAISON<span className="text-red-500">.</span></h1>
          <p className="text-gray-400 text-xs mt-1">Administration</p>
        </div>
        <nav className="p-4 flex-1 space-y-1">
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            📊 Dashboard
          </Link>
          <Link to="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            📦 Produits
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium">
            🛒 Commandes
          </Link>
          <Link to="/shop" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🌐 Voir la boutique
          </Link>
        </nav>
      </aside>

      {/* Contenu */}
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-black text-2xl">Commandes</h2>
            <p className="text-gray-400 text-sm mt-1">{commandes.length} commande(s) au total</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["Tous", ...STATUTS].map(s => (
            <button
              key={s}
              onClick={() => setFiltre(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                filtre === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {s}
              {s !== "Tous" && (
                <span className="ml-2 text-xs opacity-60">
                  ({commandes.filter(c => c.statut === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : filtrees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
            Aucune commande trouvée.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-3">Articles</span>
              <span className="col-span-2">Total</span>
              <span className="col-span-2">Statut</span>
            </div>

            {filtrees.map((cmd, i) => (
              <div
                key={cmd.id}
                className={`grid grid-cols-12 px-6 py-4 items-center cursor-pointer hover:bg-gray-50 transition ${
                  i < filtrees.length - 1 ? "border-b border-gray-100" : ""
                } ${selected?.id === cmd.id ? "bg-blue-50" : ""}`}
                onClick={() => setSelected(selected?.id === cmd.id ? null : cmd)}
              >
                <div className="col-span-3">
                  <p className="font-medium text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                  <p className="text-gray-400 text-xs">{cmd.client?.telephone}</p>
                </div>
                <span className="col-span-2 text-sm text-gray-500">{formatDate(cmd.createdAt)}</span>
                <span className="col-span-3 text-sm text-gray-500">
                  {cmd.articles?.map(a => a.nom).join(", ")}
                </span>
                <span className="col-span-2 font-bold text-sm">{formatPrix(Number(cmd.total))}</span>
                <div className="col-span-2">
                  <select
                    value={cmd.statut}
                    onChange={e => { e.stopPropagation(); changerStatut(cmd.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Détail commande */}
        {selected && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Détail de la commande</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-black text-xl">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Client</p>
                <p className="font-medium">{selected.client?.prenom} {selected.client?.nom}</p>
                <p className="text-sm text-gray-500">{selected.client?.email}</p>
                <p className="text-sm text-gray-500">{selected.client?.telephone}</p>
                <p className="text-sm text-gray-500 mt-1">{selected.client?.adresse}, {selected.client?.ville}</p>
                <p className="text-sm text-gray-500">{selected.client?.pays}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Articles commandés</p>
                {selected.articles?.map((a, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span>{a.nom} × {a.quantite}</span>
                    <span className="font-medium">{formatPrix(a.prix * a.quantite)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className="text-gray-500">Livraison</span>
                  <span>{formatPrix(selected.livraison || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-lg mt-2">
                  <span>Total</span>
                  <span>{formatPrix(selected.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}