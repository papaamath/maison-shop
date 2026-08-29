import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const CATEGORIES_DEPENSES = [
  "Achat de stock",
  "Transport / Livraison",
  "Loyer / Local",
  "Marketing / Publicite",
  "Salaires",
  "Electricite / Internet",
  "Emballage",
  "Autre",
];

function formatDate(ts) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

export default function Caisse() {
  const [commandes, setCommandes] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onglet, setOnglet] = useState("tout");
  const [form, setForm] = useState({
    description: "",
    montant: "",
    categorie: "Achat de stock",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [cmdSnap, depSnap] = await Promise.all([
      getDocs(collection(db, "commandes")),
      getDocs(collection(db, "depenses")),
    ]);
    setCommandes(cmdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setDepenses(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function ajouterDepense(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "depenses"), {
        description: form.description,
        montant: Number(form.montant),
        categorie: form.categorie,
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowForm(false);
      setForm({ description: "", montant: "", categorie: "Achat de stock" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette depense ?")) return;
    await deleteDoc(doc(db, "depenses", id));
    await charger();
  }

  // Calculs
  const totalRecettes = commandes
    .filter(c => c.statut === "Livre")
    .reduce((a, c) => a + Number(c.total || 0), 0);

  const totalDepenses = depenses.reduce((a, d) => a + Number(d.montant || 0), 0);
  const solde = totalRecettes - totalDepenses;

  // Historique complet fusionné et trié
  const historique = [
    ...commandes
      .filter(c => c.statut === "Livre")
      .map(c => ({
        id: c.id,
        type: "recette",
        description: `Commande — ${c.client?.prenom || ""} ${c.client?.nom || ""}`,
        montant: Number(c.total || 0),
        categorie: "Vente",
        createdAt: c.createdAt,
      })),
    ...depenses.map(d => ({
      id: d.id,
      type: "depense",
      description: d.description,
      montant: Number(d.montant || 0),
      categorie: d.categorie,
      createdAt: d.createdAt,
      suppressible: true,
    })),
  ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const filtrees = onglet === "tout" ? historique
    : onglet === "recettes" ? historique.filter(h => h.type === "recette")
    : historique.filter(h => h.type === "depense");

  // Depenses par categorie
  const parCategorie = {};
  depenses.forEach(d => {
    parCategorie[d.categorie] = (parCategorie[d.categorie] || 0) + Number(d.montant || 0);
  });
  const topCategories = Object.entries(parCategorie)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const navLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/products", label: "Produits" },
    { to: "/admin/orders", label: "Commandes" },
    { to: "/admin/promos", label: "Promotions" },
    { to: "/admin/caisse", label: "Caisse", active: true },
    { to: "/shop", label: "Voir la boutique" },
    { to: "/admin/associes", label: "Associes" },
    { to: "/admin/journal", label: "Journal mensuel" },
    { to: "/admin/stock", label: "Valeur du stock" },
    { to: "/admin/photocopie", label: "Photocopie" },
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
              <h2 className="font-black text-xl md:text-2xl">Caisse / Tresorerie</h2>
              <p className="text-gray-400 text-sm mt-1">Suivi de vos recettes et depenses</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
              + Depense
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* 3 cartes principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <p className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-2">Total Recettes</p>
                  <p className="font-black text-2xl md:text-3xl text-green-700">{formatPrix(totalRecettes)}</p>
                  <p className="text-green-500 text-xs mt-2">
                    {commandes.filter(c => c.statut === "Livre").length} commande(s) livree(s)
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-red-600 text-xs font-semibold uppercase tracking-wide mb-2">Total Depenses</p>
                  <p className="font-black text-2xl md:text-3xl text-red-700">{formatPrix(totalDepenses)}</p>
                  <p className="text-red-500 text-xs mt-2">{depenses.length} depense(s) enregistree(s)</p>
                </div>

                <div className={`${solde >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-5`}>
                  <p className={`${solde >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-semibold uppercase tracking-wide mb-2`}>
                    Solde net
                  </p>
                  <p className={`font-black text-2xl md:text-3xl ${solde >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {solde >= 0 ? "+" : ""}{formatPrix(solde)}
                  </p>
                  <p className={`${solde >= 0 ? "text-blue-500" : "text-orange-500"} text-xs mt-2`}>
                    {solde >= 0 ? "Benefice" : "Deficit"}
                  </p>
                </div>
              </div>

              {/* Depenses par categorie */}
              {topCategories.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h3 className="font-bold text-base mb-4">Depenses par categorie</h3>
                  <div className="space-y-3">
                    {topCategories.map(([cat, montant]) => {
                      const pct = totalDepenses > 0 ? Math.round(montant / totalDepenses * 100) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{cat}</span>
                            <span className="font-semibold">{formatPrix(montant)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historique */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <h3 className="font-bold text-base">Historique des operations</h3>
                  <div className="flex gap-2">
                    {[
                      { id: "tout", label: "Tout" },
                      { id: "recettes", label: "Recettes" },
                      { id: "depenses", label: "Depenses" },
                    ].map(o => (
                      <button key={o.id} onClick={() => setOnglet(o.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${onglet === o.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filtrees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-3">Aucune operation</p>
                    <p className="text-sm">Aucune operation enregistree</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filtrees.map(op => (
                      <div key={op.id + op.type} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${op.type === "recette" ? "bg-green-100" : "bg-red-100"}`}>
                            {op.type === "recette" ? "+" : "-"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{op.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{formatDate(op.createdAt)}</span>
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {op.categorie}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-black text-sm md:text-base ${op.type === "recette" ? "text-green-600" : "text-red-600"}`}>
                            {op.type === "recette" ? "+" : "-"}{formatPrix(op.montant)}
                          </span>
                          {op.suppressible && (
                            <button onClick={() => supprimerDepense(op.id)}
                              className="text-gray-300 hover:text-red-500 transition text-lg">
                              x
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal ajouter depense */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Ajouter une depense</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Achat 10 ballons de foot" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="15000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_DEPENSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer la depense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
