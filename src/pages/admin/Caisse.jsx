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

const CATEGORIES_RECETTES = [
  "Apport personnel",
  "Vente hors boutique",
  "Service rendu",
  "Remboursement recu",
  "Emprunt recu",
  "Don",
  "Autre",
];

const MOYENS = ["Especes", "Wave", "Orange Money", "Free Money", "Virement", "Autre"];

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse", active: true },
  { to: "/admin/dettes", label: "Mes dettes" },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
  { to: "/admin/flocage", label: "Flocage" },
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
  const [recettes, setRecettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onglet, setOnglet] = useState("tout");

  const [showDepense, setShowDepense] = useState(false);
  const [showRecette, setShowRecette] = useState(false);

  const [formDep, setFormDep] = useState({ description: "", montant: "", categorie: "Achat de stock" });
  const [formRec, setFormRec] = useState({
    description: "", montant: "", categorie: "Apport personnel", moyen: "Especes",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [cmdSnap, depSnap, recSnap] = await Promise.all([
      getDocs(collection(db, "commandes")),
      getDocs(collection(db, "depenses")),
      getDocs(collection(db, "recettes")),
    ]);
    setCommandes(cmdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setDepenses(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setRecettes(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function ajouterDepense(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "depenses"), {
        description: formDep.description,
        montant: Number(formDep.montant),
        categorie: formDep.categorie,
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowDepense(false);
      setFormDep({ description: "", montant: "", categorie: "Achat de stock" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function ajouterRecette(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "recettes"), {
        description: formRec.description,
        montant: Number(formRec.montant),
        categorie: formRec.categorie,
        moyen: formRec.moyen,
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowRecette(false);
      setFormRec({ description: "", montant: "", categorie: "Apport personnel", moyen: "Especes" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette depense ?")) return;
    await deleteDoc(doc(db, "depenses", id));
    await charger();
  }

  async function supprimerRecette(id) {
    if (!confirm("Supprimer cette recette ?")) return;
    await deleteDoc(doc(db, "recettes", id));
    await charger();
  }

  // ===== ENTREES =====
  const encaissements = [];

  // 1. Versements et ventes de la boutique
  commandes.forEach(cmd => {
    if (cmd.statut === "Annule") return;
    const nomClient = `${cmd.client?.prenom || ""} ${cmd.client?.nom || ""}`.trim() || "Client";
    const versements = cmd.versements || [];

    if (versements.length > 0) {
      versements.forEach((v, i) => {
        encaissements.push({
          id: `${cmd.id}-v${i}`,
          type: "recette",
          source: "vente",
          description: `Versement — ${nomClient}`,
          montant: Number(v.montant || 0),
          categorie: v.moyen || "Versement",
          date: v.date,
          note: v.note || "",
        });
      });
    } else if (cmd.statut === "Livre") {
      encaissements.push({
        id: `${cmd.id}-legacy`,
        type: "recette",
        source: "vente",
        description: `Commande — ${nomClient}`,
        montant: Number(cmd.total || 0),
        categorie: "Vente",
        date: cmd.createdAt,
        note: "",
      });
    }
  });

  // 2. Recettes saisies a la main
  recettes.forEach(r => {
    encaissements.push({
      id: r.id,
      type: "recette",
      source: "manuelle",
      description: r.description,
      montant: Number(r.montant || 0),
      categorie: r.categorie,
      moyen: r.moyen || "",
      date: r.createdAt,
      suppressible: true,
    });
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

  const totalVentes = encaissements.filter(e => e.source === "vente").reduce((a, e) => a + e.montant, 0);
  const totalAutresRecettes = encaissements.filter(e => e.source === "manuelle").reduce((a, e) => a + e.montant, 0);
  const totalRecettes = totalVentes + totalAutresRecettes;
  const totalDepenses = sorties.reduce((a, s) => a + s.montant, 0);
  const solde = totalRecettes - totalDepenses;

  // Creances clients
  const creances = commandes
    .filter(c => c.statut !== "Annule")
    .reduce((a, c) => {
      const paye = (c.versements || []).reduce((s, v) => s + Number(v.montant || 0), 0);
      if (paye === 0 && c.statut === "Livre") return a;
      return a + Math.max(0, Number(c.total || 0) - paye);
    }, 0);

  const nbClientsDevant = commandes.filter(c => {
    if (c.statut === "Annule") return false;
    const paye = (c.versements || []).reduce((s, v) => s + Number(v.montant || 0), 0);
    if (paye === 0 && c.statut === "Livre") return false;
    return Number(c.total || 0) - paye > 0;
  }).length;

  const parMoyen = {};
  encaissements.forEach(e => {
    const cle = e.source === "manuelle" ? (e.moyen || e.categorie) : e.categorie;
    parMoyen[cle] = (parMoyen[cle] || 0) + e.montant;
  });

  const historique = [...encaissements, ...sorties].sort((a, b) => {
    const da = toDate(a.date);
    const dbb = toDate(b.date);
    return (dbb ? dbb.getTime() : 0) - (da ? da.getTime() : 0);
  });

  const filtrees = onglet === "tout" ? historique
    : onglet === "recettes" ? historique.filter(h => h.type === "recette")
    : onglet === "autres" ? historique.filter(h => h.source === "manuelle")
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
                Tout l'argent qui entre et qui sort
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRecette(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                + Recette
              </button>
              <button onClick={() => setShowDepense(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
                + Depense
              </button>
            </div>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-xs font-bold uppercase mb-1">Ventes</p>
                  <p className="font-black text-lg text-green-700">{formatPrix(totalVentes)}</p>
                  <p className="text-green-500 text-xs mt-1">
                    {encaissements.filter(e => e.source === "vente").length} encaissement(s)
                  </p>
                </div>

                <div className={`${totalAutresRecettes > 0 ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200"} border rounded-2xl p-4`}>
                  <p className={`${totalAutresRecettes > 0 ? "text-teal-600" : "text-gray-400"} text-xs font-bold uppercase mb-1`}>
                    Autres recettes
                  </p>
                  <p className={`font-black text-lg ${totalAutresRecettes > 0 ? "text-teal-700" : "text-gray-500"}`}>
                    {formatPrix(totalAutresRecettes)}
                  </p>
                  <p className={`${totalAutresRecettes > 0 ? "text-teal-500" : "text-gray-400"} text-xs mt-1`}>
                    {recettes.length} entree(s)
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-xs font-bold uppercase mb-1">Depenses</p>
                  <p className="font-black text-lg text-red-700">{formatPrix(totalDepenses)}</p>
                  <p className="text-red-500 text-xs mt-1">{depenses.length} depense(s)</p>
                </div>

                <div className={`${solde >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-4`}>
                  <p className={`${solde >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold uppercase mb-1`}>
                    Solde en caisse
                  </p>
                  <p className={`font-black text-lg ${solde >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {solde >= 0 ? "+" : ""}{formatPrix(solde)}
                  </p>
                  <p className={`${solde >= 0 ? "text-blue-500" : "text-orange-500"} text-xs mt-1`}>
                    Entrees - sorties
                  </p>
                </div>

                <div className={`${creances > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"} border rounded-2xl p-4`}>
                  <p className={`${creances > 0 ? "text-amber-700" : "text-gray-400"} text-xs font-bold uppercase mb-1`}>
                    Reste a encaisser
                  </p>
                  <p className={`font-black text-lg ${creances > 0 ? "text-amber-800" : "text-gray-500"}`}>
                    {formatPrix(creances)}
                  </p>
                  <p className={`${creances > 0 ? "text-amber-600" : "text-gray-400"} text-xs mt-1`}>
                    {nbClientsDevant} client(s)
                  </p>
                </div>
              </div>

              {creances > 0 && (
                <Link to="/admin/orders"
                  className="block bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 hover:bg-amber-100 transition">
                  <p className="font-bold text-amber-800 text-sm">
                    {formatPrix(creances)} a recuperer aupres de {nbClientsDevant} client(s)
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    Clique pour voir les commandes non soldees
                  </p>
                </Link>
              )}

              {/* Entrees par moyen */}
              {Object.keys(parMoyen).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h3 className="font-bold text-base mb-4">Entrees par moyen de paiement</h3>
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
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
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
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
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
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "tout", label: "Tout" },
                      { id: "recettes", label: "Entrees" },
                      { id: "autres", label: "Hors ventes" },
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
                    <p className="text-sm">Aucun mouvement</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filtrees.map(op => (
                      <div key={op.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                            op.type === "recette"
                              ? (op.source === "manuelle" ? "bg-teal-100 text-teal-700" : "bg-green-100 text-green-700")
                              : "bg-red-100 text-red-700"
                          }`}>
                            {op.type === "recette" ? "+" : "-"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{op.description}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">{formatDate(op.date)}</span>
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {op.categorie}
                              </span>
                              {op.source === "manuelle" && op.moyen && (
                                <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">
                                  {op.moyen}
                                </span>
                              )}
                              {op.note && (
                                <span className="text-xs text-gray-400 italic">{op.note}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`font-black text-sm md:text-base ${
                            op.type === "recette"
                              ? (op.source === "manuelle" ? "text-teal-600" : "text-green-600")
                              : "text-red-600"
                          }`}>
                            {op.type === "recette" ? "+" : "-"}{formatPrix(op.montant)}
                          </span>
                          {op.suppressible && (
                            <button
                              onClick={() => op.type === "recette"
                                ? supprimerRecette(op.id)
                                : supprimerDepense(op.id)}
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

      {/* ===== MODAL RECETTE ===== */}
      {showRecette && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-lg">Nouvelle recette</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Une entree d'argent qui ne vient pas d'une commande
                </p>
              </div>
              <button onClick={() => setShowRecette(false)} className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={ajouterRecette} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={formRec.description}
                  onChange={e => setFormRec(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Vente d'un telephone a un voisin" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={formRec.montant}
                  onChange={e => setFormRec(f => ({ ...f, montant: e.target.value }))}
                  required min="1" autoFocus
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-green-500 font-black text-green-700"
                  placeholder="25000" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de recette</label>
                <select value={formRec.categorie}
                  onChange={e => setFormRec(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_RECETTES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Moyen de paiement</label>
                <select value={formRec.moyen}
                  onChange={e => setFormRec(f => ({ ...f, moyen: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {MOYENS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRecette(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer la recette"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DEPENSE ===== */}
      {showDepense && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Nouvelle depense</h3>
              <button onClick={() => setShowDepense(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={formDep.description}
                  onChange={e => setFormDep(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Achat 10 ballons de foot" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={formDep.montant}
                  onChange={e => setFormDep(f => ({ ...f, montant: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="15000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={formDep.categorie}
                  onChange={e => setFormDep(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_DEPENSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepense(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
