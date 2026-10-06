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

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse", active: true },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <img src="/logo.jpeg" alt="B2S-STORE" className="h-10 w-auto object-contain rounded-lg" />
        <div>
          <p className="font-black text-white text-base">B2S-STORE</p>
          <p className="text-gray-400 text-xs">Administration</p>
        </div>
      </div>
      <nav className="p-4 flex-1 space-y-1">
        {NAV_LINKS.map(l => (
          <Link key={l.to} to={l.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav({ open, setOpen }) {
  return (
    <>
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-8 w-auto object-contain rounded" />
          <span className="font-black text-white text-base">B2S-STORE</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white text-2xl">{open ? "X" : "≡"}</button>
      </div>
      {open && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40 max-h-96 overflow-y-auto">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function toDate(ts) {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Caisse() {
  const [commandes, setCommandes] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onglet, setOnglet] = useState("tout");
  const [form, setForm] = useState({ description: "", montant: "", categorie: "Achat de stock" });

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

  // ===== ENCAISSEMENTS REELS =====
  // Chaque versement devient une entree de caisse.
  // Les anciennes commandes livrees sans versement enregistre comptent
  // pour leur total, a la date de la commande.
  const encaissements = [];

  commandes.forEach(cmd => {
    if (cmd.statut === "Annule") return;

    const nomClient = `${cmd.client?.prenom || ""} ${cmd.client?.nom || ""}`.trim() || "Client";
    const versements = cmd.versements || [];

    if (versements.length > 0) {
      versements.forEach((v, i) => {
        encaissements.push({
          id: `${cmd.id}-v${i}`,
          type: "recette",
          description: `Versement — ${nomClient}`,
          montant: Number(v.montant || 0),
          categorie: v.moyen || "Versement",
          date: v.date,
          note: v.note || "",
        });
      });
    } else if (cmd.statut === "Livre") {
      // Ancienne commande livree, avant la gestion des versements
      encaissements.push({
        id: `${cmd.id}-legacy`,
        type: "recette",
        description: `Commande — ${nomClient}`,
        montant: Number(cmd.total || 0),
        categorie: "Vente",
        date: cmd.createdAt,
        note: "",
      });
    }
  });

  const sorties = depenses.map(d => ({
    id: d.id,
    type: "depense",
    description: d.description,
    montant: Number(d.montant || 0),
    categorie: d.categorie,
    date: d.createdAt,
    suppressible: true,
  }));

  const totalRecettes = encaissements.reduce((a, e) => a + e.montant, 0);
  const totalDepenses = sorties.reduce((a, s) => a + s.montant, 0);
  const solde = totalRecettes - totalDepenses;

  // Creances : ce qui reste du par les clients
  const creances = commandes
    .filter(c => c.statut !== "Annule")
    .reduce((a, c) => {
      const paye = (c.versements || []).reduce((s, v) => s + Number(v.montant || 0), 0);
      // On ignore les anciennes commandes livrees sans versement : deja comptees
      if (paye === 0 && c.statut === "Livre") return a;
      return a + Math.max(0, Number(c.total || 0) - paye);
    }, 0);

  const nbClientsDevant = commandes.filter(c => {
    if (c.statut === "Annule") return false;
    const paye = (c.versements || []).reduce((s, v) => s + Number(v.montant || 0), 0);
    if (paye === 0 && c.statut === "Livre") return false;
    return Number(c.total || 0) - paye > 0;
  }).length;

  // Encaissements par moyen de paiement
  const parMoyen = {};
  encaissements.forEach(e => {
    parMoyen[e.categorie] = (parMoyen[e.categorie] || 0) + e.montant;
  });

  const historique = [...encaissements, ...sorties].sort((a, b) => {
    const da = toDate(a.date);
    const dbb = toDate(b.date);
    return (dbb ? dbb.getTime() : 0) - (da ? da.getTime() : 0);
  });

  const filtrees = onglet === "tout" ? historique
    : onglet === "recettes" ? historique.filter(h => h.type === "recette")
    : historique.filter(h => h.type === "depense");

  const parCategorieDepense = {};
  depenses.forEach(d => {
    parCategorieDepense[d.categorie] = (parCategorieDepense[d.categorie] || 0) + Number(d.montant || 0);
  });
  const topCategories = Object.entries(parCategorieDepense).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Caisse / Tresorerie</h2>
              <p className="text-gray-400 text-sm mt-1">
                Argent reellement encaisse, versement par versement
              </p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
              + Depense
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes principales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <p className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-2">
                    Encaisse
                  </p>
                  <p className="font-black text-2xl text-green-700">{formatPrix(totalRecettes)}</p>
                  <p className="text-green-500 text-xs mt-2">
                    {encaissements.length} entree(s)
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-red-600 text-xs font-semibold uppercase tracking-wide mb-2">
                    Depenses
                  </p>
                  <p className="font-black text-2xl text-red-700">{formatPrix(totalDepenses)}</p>
                  <p className="text-red-500 text-xs mt-2">{depenses.length} depense(s)</p>
                </div>

                <div className={`${solde >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-5`}>
                  <p className={`${solde >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-semibold uppercase tracking-wide mb-2`}>
                    Solde en caisse
                  </p>
                  <p className={`font-black text-2xl ${solde >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {solde >= 0 ? "+" : ""}{formatPrix(solde)}
                  </p>
                  <p className={`${solde >= 0 ? "text-blue-500" : "text-orange-500"} text-xs mt-2`}>
                    {solde >= 0 ? "Benefice" : "Deficit"}
                  </p>
                </div>

                <div className={`${creances > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"} border rounded-2xl p-5`}>
                  <p className={`${creances > 0 ? "text-amber-700" : "text-gray-400"} text-xs font-semibold uppercase tracking-wide mb-2`}>
                    Reste a encaisser
                  </p>
                  <p className={`font-black text-2xl ${creances > 0 ? "text-amber-800" : "text-gray-500"}`}>
                    {formatPrix(creances)}
                  </p>
                  <p className={`${creances > 0 ? "text-amber-600" : "text-gray-400"} text-xs mt-2`}>
                    {nbClientsDevant} client(s) doivent encore
                  </p>
                </div>
              </div>

              {/* Lien relances */}
              {creances > 0 && (
                <Link to="/admin/orders"
                  className="block bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 hover:bg-amber-100 transition">
                  <p className="font-bold text-amber-800 text-sm">
                    {formatPrix(creances)} a recuperer aupres de {nbClientsDevant} client(s)
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    Clique ici pour voir les commandes non soldees et faire tes relances
                  </p>
                </Link>
              )}

              {/* Encaissements par moyen */}
              {Object.keys(parMoyen).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h3 className="font-bold text-base mb-4">Encaissements par moyen de paiement</h3>
                  <div className="space-y-3">
                    {Object.entries(parMoyen).sort((a, b) => b[1] - a[1]).map(([moyen, montant]) => {
                      const pct = totalRecettes > 0 ? Math.round(montant / totalRecettes * 100) : 0;
                      return (
                        <div key={moyen}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{moyen}</span>
                            <span className="font-semibold">{formatPrix(montant)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                            <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
                  <h3 className="font-bold text-base">Mouvements de caisse</h3>
                  <div className="flex gap-2">
                    {[
                      { id: "tout", label: "Tout" },
                      { id: "recettes", label: "Entrees" },
                      { id: "depenses", label: "Sorties" },
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
                    <p className="text-sm">Aucun mouvement enregistre</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filtrees.map(op => (
                      <div key={op.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${op.type === "recette" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {op.type === "recette" ? "+" : "-"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{op.description}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">{formatDate(op.date)}</span>
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {op.categorie}
                              </span>
                              {op.note && (
                                <span className="text-xs text-gray-400 italic">{op.note}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
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

                <div className="p-4 border-t border-gray-100 bg-gray-900 text-white flex justify-between">
                  <span className="font-bold text-sm">Solde actuel</span>
                  <span className={`font-black ${solde >= 0 ? "text-green-400" : "text-orange-400"}`}>
                    {solde >= 0 ? "+" : ""}{formatPrix(solde)}
                  </span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal depense */}
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
                <input value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Achat 10 ballons de foot" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="15000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={form.categorie}
                  onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
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
