import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const STATUTS = ["En attente", "Confirme", "En livraison", "Livre", "Annule"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirme": "bg-blue-100 text-blue-700",
  "En livraison": "bg-purple-100 text-purple-700",
  "Livre": "bg-green-100 text-green-700",
  "Annule": "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { chargerCommandes(); }, []);

  async function chargerCommandes() {
    const snap = await getDocs(collection(db, "commandes"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setCommandes(data);
    setLoading(false);
  }

  async function changerStatut(id, nouveauStatut, commande) {
    const ancienStatut = commande.statut;
    await updateDoc(doc(db, "commandes", id), { statut: nouveauStatut });

    if (nouveauStatut === "Livre" && ancienStatut !== "Livre") {
      for (const article of commande.articles || []) {
        try {
          const produitRef = doc(db, "produits", article.id);
          const produitSnap = await getDoc(produitRef);
          if (produitSnap.exists()) {
            const stockActuel = Number(produitSnap.data().stock || 0);
            await updateDoc(produitRef, { stock: Math.max(0, stockActuel - article.quantite) });
          }
        } catch (err) { console.error(err); }
      }
    }

    if (nouveauStatut === "Annule" && ancienStatut === "Livre") {
      for (const article of commande.articles || []) {
        try {
          const produitRef = doc(db, "produits", article.id);
          const produitSnap = await getDoc(produitRef);
          if (produitSnap.exists()) {
            await updateDoc(produitRef, { stock: Number(produitSnap.data().stock || 0) + article.quantite });
          }
        } catch (err) { console.error(err); }
      }
    }

    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: nouveauStatut } : c));
    if (selected?.id === id) setSelected(s => ({ ...s, statut: nouveauStatut }));
  }

  const filtrees = filtre === "Tous" ? commandes : commandes.filter(c => c.statut === filtre);

  function formatDate(ts) {
    if (!ts?.seconds) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
  }

  const navLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/products", label: "Produits" },
    { to: "/admin/orders", label: "Commandes", active: true },
    { to: "/admin/promos", label: "Promotions" },
    { to: "/admin/caisse", label: "Caisse" },
    { to: "/shop", label: "Voir la boutique" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar mobile */}
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-black text-white text-lg">MAISON<span className="text-red-500">.</span></h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">
          {menuOpen ? "X" : "≡"}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex">
        <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0">
          <div className="p-6 border-b border-gray-700">
            <h1 className="font-black text-white text-xl">MAISON<span className="text-red-500">.</span></h1>
            <p className="text-gray-400 text-xs mt-1">Administration</p>
          </div>
          <nav className="p-4 flex-1 space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Commandes</h2>
              <p className="text-gray-400 text-sm mt-1">{commandes.length} commande(s)</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {["Tous", ...STATUTS].map(s => (
              <button key={s} onClick={() => setFiltre(s)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium border transition whitespace-nowrap flex-shrink-0 ${
                  filtre === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
                }`}>
                {s} {s !== "Tous" && `(${commandes.filter(c => c.statut === s).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-gray-400">Chargement...</div>
          ) : filtrees.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">Aucune commande.</div>
          ) : (
            <div className="space-y-3">
              {filtrees.map(cmd => (
                <div key={cmd.id}
                  className={`bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition ${selected?.id === cmd.id ? "border-blue-300 bg-blue-50" : ""}`}
                  onClick={() => setSelected(selected?.id === cmd.id ? null : cmd)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                      <p className="text-gray-400 text-xs">{cmd.client?.telephone}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{formatDate(cmd.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-sm">{formatPrix(Number(cmd.total))}</p>
                      <p className="text-gray-400 text-xs">{cmd.articles?.length} article(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 line-clamp-1 flex-1 mr-3">
                      {cmd.articles?.map(a => a.nom).join(", ")}
                    </p>
                    <select value={cmd.statut}
                      onChange={e => { e.stopPropagation(); changerStatut(cmd.id, e.target.value, cmd); }}
                      onClick={e => e.stopPropagation()}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer flex-shrink-0 ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}>
                      {STATUTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Detail commande */}
                  {selected?.id === cmd.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Client</p>
                        <p className="font-medium text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                        <p className="text-gray-500 text-sm">{cmd.client?.email}</p>
                        <p className="text-gray-500 text-sm">{cmd.client?.telephone}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {cmd.modeLivraison === "retrait" ? "Retrait en magasin" : `${cmd.client?.adresse}, ${cmd.client?.ville}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Articles</p>
                        {cmd.articles?.map((a, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                            <span>{a.nom} x{a.quantite}</span>
                            <span className="font-medium">{formatPrix(a.prix * a.quantite)}</span>
                          </div>
                        ))}
                        {cmd.codePromo && (
                          <div className="flex justify-between text-sm py-1 text-green-600">
                            <span>Code promo ({cmd.codePromo})</span>
                            <span>- {formatPrix(cmd.reduction || 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-base mt-2">
                          <span>Total</span>
                          <span>{formatPrix(cmd.total)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
