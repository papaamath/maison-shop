import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/dettes", label: "Mes dettes" },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/flocage", label: "Flocage", active: true },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

const MOIS = [
  "Janvier","Fevrier","Mars","Avril","Mai","Juin",
  "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"
];

const TYPES_FLOCAGE = [
  "Nom + numero maillot",
  "Numero seul",
  "Nom seul",
  "Logo / Ecusson",
  "T-shirt personnalise",
  "Sponsor",
  "Autre",
];

const CATEGORIES_DEPENSES = [
  "Flex / Flock",
  "Papier transfert",
  "Maillots / Textiles",
  "Maintenance machine",
  "Electricite",
  "Consommables",
  "Autre",
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

function formatDate(ts) {
  if (!ts?.seconds) return "-";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

const RECETTE_VIDE = {
  client: "",
  typeFlocage: "Nom + numero maillot",
  description: "",
  nombrePieces: "",
  prixParPiece: "1500",
  montantTotal: "",
};

const DEPENSE_VIDE = { description: "", montant: "", categorie: "Flex / Flock" };

export default function Flocage() {
  const [recettes, setRecettes] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState("apercu");
  const [recherche, setRecherche] = useState("");

  const [moisSelectionne, setMoisSelectionne] = useState(new Date().getMonth());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());

  const [showRecetteForm, setShowRecetteForm] = useState(false);
  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const [recetteForm, setRecetteForm] = useState(RECETTE_VIDE);
  const [depenseForm, setDepenseForm] = useState(DEPENSE_VIDE);

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [recSnap, depSnap] = await Promise.all([
      getDocs(collection(db, "flocage_recettes")),
      getDocs(collection(db, "flocage_depenses")),
    ]);
    setRecettes(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setDepenses(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function estDansMois(ts, mois, annee) {
    if (!ts?.seconds) return false;
    const d = new Date(ts.seconds * 1000);
    return d.getMonth() === mois && d.getFullYear() === annee;
  }

  function handleRecetteChange(e) {
    const { name, value } = e.target;
    setRecetteForm(f => {
      const updated = { ...f, [name]: value };
      if (name === "nombrePieces" || name === "prixParPiece") {
        const pieces = Number(name === "nombrePieces" ? value : f.nombrePieces);
        const prix = Number(name === "prixParPiece" ? value : f.prixParPiece);
        if (pieces > 0 && prix > 0) updated.montantTotal = String(pieces * prix);
      }
      return updated;
    });
  }

  async function ajouterRecette(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "flocage_recettes"), {
        client: recetteForm.client.trim(),
        typeFlocage: recetteForm.typeFlocage,
        description: recetteForm.description.trim(),
        nombrePieces: Number(recetteForm.nombrePieces || 0),
        prixParPiece: Number(recetteForm.prixParPiece || 0),
        montant: Number(recetteForm.montantTotal),
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowRecetteForm(false);
      setRecetteForm(RECETTE_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function ajouterDepense(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "flocage_depenses"), {
        description: depenseForm.description,
        montant: Number(depenseForm.montant),
        categorie: depenseForm.categorie,
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowDepenseForm(false);
      setDepenseForm(DEPENSE_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerRecette(id) {
    if (!confirm("Supprimer cette recette ?")) return;
    await deleteDoc(doc(db, "flocage_recettes", id));
    await charger();
  }

  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette depense ?")) return;
    await deleteDoc(doc(db, "flocage_depenses", id));
    await charger();
  }

  // ===== CALCULS =====
  const totalRecettesGlobal = recettes.reduce((a, r) => a + Number(r.montant || 0), 0);
  const totalDepensesGlobal = depenses.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeGlobal = totalRecettesGlobal - totalDepensesGlobal;
  const totalPiecesGlobal = recettes.reduce((a, r) => a + Number(r.nombrePieces || 0), 0);

  const recettesDuMois = recettes.filter(r => estDansMois(r.createdAt, moisSelectionne, anneeSelectionnee));
  const depensesDuMois = depenses.filter(d => estDansMois(d.createdAt, moisSelectionne, anneeSelectionnee));
  const totalRecettesMois = recettesDuMois.reduce((a, r) => a + Number(r.montant || 0), 0);
  const totalDepensesMois = depensesDuMois.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeMois = totalRecettesMois - totalDepensesMois;
  const totalPiecesMois = recettesDuMois.reduce((a, r) => a + Number(r.nombrePieces || 0), 0);

  const parCategorie = {};
  depenses.forEach(d => {
    parCategorie[d.categorie] = (parCategorie[d.categorie] || 0) + Number(d.montant || 0);
  });

  const parType = {};
  recettes.forEach(r => {
    const t = r.typeFlocage || "Autre";
    if (!parType[t]) parType[t] = { type: t, pieces: 0, montant: 0 };
    parType[t].pieces += Number(r.nombrePieces || 0);
    parType[t].montant += Number(r.montant || 0);
  });
  const typesTries = Object.values(parType).sort((a, b) => b.montant - a.montant);

  const annees = [...new Set([
    ...recettes.map(r => r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).getFullYear() : null),
    ...depenses.map(d => d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).getFullYear() : null),
    new Date().getFullYear(),
  ].filter(Boolean))].sort((a, b) => b - a);

  const recettesFiltrees = [...recettes]
    .filter(r => {
      const q = recherche.toLowerCase().trim();
      if (!q) return true;
      return (r.client || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.typeFlocage || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Service Flocage</h2>
              <p className="text-gray-400 text-sm mt-1">
                Marquage maillots et textiles — comptabilite separee
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDepenseForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
                + Depense
              </button>
              <button onClick={() => setShowRecetteForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                + Travail
              </button>
            </div>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-xs font-bold uppercase mb-1">Total recettes</p>
                  <p className="font-black text-xl text-green-700">{formatPrix(totalRecettesGlobal)}</p>
                  <p className="text-green-500 text-xs mt-1">{recettes.length} travail(aux)</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-xs font-bold uppercase mb-1">Total depenses</p>
                  <p className="font-black text-xl text-red-700">{formatPrix(totalDepensesGlobal)}</p>
                  <p className="text-red-500 text-xs mt-1">{depenses.length} depense(s)</p>
                </div>
                <div className={`${beneficeGlobal >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-4`}>
                  <p className={`${beneficeGlobal >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold uppercase mb-1`}>Benefice net</p>
                  <p className={`font-black text-xl ${beneficeGlobal >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {beneficeGlobal >= 0 ? "+" : ""}{formatPrix(beneficeGlobal)}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <p className="text-purple-600 text-xs font-bold uppercase mb-1">Pieces floquees</p>
                  <p className="font-black text-xl text-purple-700">{totalPiecesGlobal.toLocaleString("fr-SN")}</p>
                  <p className="text-purple-500 text-xs mt-1">Depuis le debut</p>
                </div>
              </div>

              {/* Onglets */}
              <div className="flex gap-2 flex-wrap mb-6">
                {[
                  { id: "apercu", label: "Apercu du mois" },
                  { id: "travaux", label: `Travaux (${recettes.length})` },
                  { id: "depenses", label: `Depenses (${depenses.length})` },
                ].map(o => (
                  <button key={o.id} onClick={() => setOnglet(o.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${onglet === o.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    {o.label}
                  </button>
                ))}
              </div>

              {/* ===== APERCU MOIS ===== */}
              {onglet === "apercu" && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center gap-4 flex-wrap">
                    <select value={moisSelectionne} onChange={e => setMoisSelectionne(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
                      {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anneeSelectionnee} onChange={e => setAnneeSelectionnee(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
                      {annees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-green-600 text-xs font-bold mb-1">Recettes du mois</p>
                      <p className="font-black text-lg text-green-700">{formatPrix(totalRecettesMois)}</p>
                      <p className="text-green-500 text-xs mt-1">{recettesDuMois.length} travail(aux)</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-xs font-bold mb-1">Depenses du mois</p>
                      <p className="font-black text-lg text-red-700">{formatPrix(totalDepensesMois)}</p>
                      <p className="text-red-500 text-xs mt-1">{depensesDuMois.length} depense(s)</p>
                    </div>
                    <div className={`${beneficeMois >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-xl p-4`}>
                      <p className={`${beneficeMois >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold mb-1`}>Benefice du mois</p>
                      <p className={`font-black text-lg ${beneficeMois >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                        {beneficeMois >= 0 ? "+" : ""}{formatPrix(beneficeMois)}
                      </p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <p className="text-purple-600 text-xs font-bold mb-1">Pieces du mois</p>
                      <p className="font-black text-lg text-purple-700">{totalPiecesMois}</p>
                    </div>
                  </div>

                  {/* Travaux du mois */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-sm">Travaux de {MOIS[moisSelectionne]}</h3>
                      <button onClick={() => setShowRecetteForm(true)}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700">
                        + Ajouter
                      </button>
                    </div>
                    {recettesDuMois.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucun travail ce mois-ci</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {[...recettesDuMois].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(r => (
                          <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {r.client || "Client comptoir"}
                                <span className="text-gray-400 font-normal"> — {r.typeFlocage}</span>
                              </p>
                              <p className="text-gray-400 text-xs truncate">
                                {formatDate(r.createdAt)}
                                {r.nombrePieces > 0 && ` — ${r.nombrePieces} piece(s) a ${formatPrix(r.prixParPiece)}`}
                                {r.description && ` — ${r.description}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <p className="font-black text-sm text-green-600">+{formatPrix(r.montant)}</p>
                              <button onClick={() => supprimerRecette(r.id)}
                                className="text-gray-300 hover:text-red-500 transition text-lg">x</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {recettesDuMois.length > 0 && (
                      <div className="p-4 border-t border-gray-100 flex justify-between bg-green-50">
                        <span className="font-bold text-sm text-green-700">Total</span>
                        <span className="font-black text-green-700">{formatPrix(totalRecettesMois)}</span>
                      </div>
                    )}
                  </div>

                  {/* Depenses du mois */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-sm">Depenses de {MOIS[moisSelectionne]}</h3>
                      <button onClick={() => setShowDepenseForm(true)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-700">
                        + Ajouter
                      </button>
                    </div>
                    {depensesDuMois.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucune depense ce mois-ci</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {[...depensesDuMois].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(d => (
                          <div key={d.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{d.description}</p>
                              <p className="text-gray-400 text-xs">{formatDate(d.createdAt)} — {d.categorie}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-sm text-red-600">-{formatPrix(d.montant)}</p>
                              <button onClick={() => supprimerDepense(d.id)}
                                className="text-gray-300 hover:text-red-500 transition text-lg">x</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {depensesDuMois.length > 0 && (
                      <div className="p-4 border-t border-gray-100 flex justify-between bg-red-50">
                        <span className="font-bold text-sm text-red-700">Total</span>
                        <span className="font-black text-red-700">{formatPrix(totalDepensesMois)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-2xl p-5 text-white">
                    <h3 className="font-black text-base mb-3">
                      Bilan Flocage — {MOIS[moisSelectionne]} {anneeSelectionnee}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Recettes</p>
                        <p className="font-black text-green-400">{formatPrix(totalRecettesMois)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Depenses</p>
                        <p className="font-black text-red-400">{formatPrix(totalDepensesMois)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Benefice</p>
                        <p className={`font-black ${beneficeMois >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                          {beneficeMois >= 0 ? "+" : ""}{formatPrix(beneficeMois)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Pieces</p>
                        <p className="font-black text-purple-400">{totalPiecesMois}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ===== TRAVAUX ===== */}
              {onglet === "travaux" && (
                <>
                  {typesTries.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <h3 className="font-bold text-sm mb-4">Repartition par type de flocage</h3>
                      <div className="space-y-3">
                        {typesTries.map(t => {
                          const pct = totalRecettesGlobal > 0
                            ? Math.round(t.montant / totalRecettesGlobal * 100) : 0;
                          return (
                            <div key={t.type}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  {t.type}
                                  <span className="text-gray-400 text-xs ml-2">{t.pieces} piece(s)</span>
                                </span>
                                <span className="font-semibold">{formatPrix(t.montant)} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                    <input value={recherche} onChange={e => setRecherche(e.target.value)}
                      placeholder="Rechercher par client, type ou description..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-base">
                        Historique des travaux
                        <span className="text-gray-400 font-normal ml-2 text-sm">({recettesFiltrees.length})</span>
                      </h3>
                      <button onClick={() => setShowRecetteForm(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                        + Travail
                      </button>
                    </div>
                    {recettesFiltrees.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        {recettes.length === 0 ? "Aucun travail enregistre" : "Aucun resultat"}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recettesFiltrees.map(r => (
                          <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {r.client || "Client comptoir"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                  {r.typeFlocage}
                                </span>
                                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                                {r.nombrePieces > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {r.nombrePieces} x {formatPrix(r.prixParPiece)}
                                  </span>
                                )}
                              </div>
                              {r.description && (
                                <p className="text-gray-400 text-xs mt-0.5 truncate">{r.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <p className="font-black text-sm text-green-600">+{formatPrix(r.montant)}</p>
                              <button onClick={() => supprimerRecette(r.id)}
                                className="text-gray-300 hover:text-red-500 transition text-lg">x</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-4 border-t border-gray-100 flex justify-between bg-green-50">
                      <span className="font-bold text-sm text-green-700">Total general</span>
                      <span className="font-black text-green-700">{formatPrix(totalRecettesGlobal)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ===== DEPENSES ===== */}
              {onglet === "depenses" && (
                <>
                  {Object.keys(parCategorie).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <h3 className="font-bold text-sm mb-4">Depenses par categorie</h3>
                      <div className="space-y-3">
                        {Object.entries(parCategorie).sort((a,b) => b[1]-a[1]).map(([cat, montant]) => {
                          const pct = totalDepensesGlobal > 0 ? Math.round(montant / totalDepensesGlobal * 100) : 0;
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

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-base">Toutes les depenses</h3>
                      <button onClick={() => setShowDepenseForm(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                        + Depense
                      </button>
                    </div>
                    {depenses.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">Aucune depense enregistree</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {[...depenses].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(d => (
                          <div key={d.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{d.description}</p>
                              <p className="text-gray-400 text-xs">{formatDate(d.createdAt)} — {d.categorie}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-sm text-red-600">-{formatPrix(d.montant)}</p>
                              <button onClick={() => supprimerDepense(d.id)}
                                className="text-gray-300 hover:text-red-500 transition text-lg">x</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-4 border-t border-gray-100 flex justify-between bg-red-50">
                      <span className="font-bold text-sm text-red-700">Total general</span>
                      <span className="font-black text-red-700">{formatPrix(totalDepensesGlobal)}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ===== MODAL TRAVAIL ===== */}
      {showRecetteForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Nouveau travail de flocage</h3>
              <button onClick={() => setShowRecetteForm(false)} className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={ajouterRecette} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du client — optionnel</label>
                <input name="client" value={recetteForm.client} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Equipe ASC Yeumbeul" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de flocage</label>
                <select name="typeFlocage" value={recetteForm.typeFlocage} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {TYPES_FLOCAGE.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Detail — optionnel</label>
                <input name="description" value={recetteForm.description} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: 11 maillots rouges, noms des joueurs" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Nombre de pieces</label>
                  <input type="number" name="nombrePieces" value={recetteForm.nombrePieces}
                    onChange={handleRecetteChange} min="1"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="11" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix par piece (FCFA)</label>
                  <input type="number" name="prixParPiece" value={recetteForm.prixParPiece}
                    onChange={handleRecetteChange} min="1"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="1500" />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <label className="text-sm text-green-700 font-bold block mb-1">Montant total (FCFA)</label>
                <input type="number" name="montantTotal" value={recetteForm.montantTotal}
                  onChange={handleRecetteChange} required min="1"
                  className="w-full border border-green-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white font-bold text-green-700"
                  placeholder="16500" />
                <p className="text-xs text-green-500 mt-1">
                  Calcule automatiquement — modifiable si tu fais un prix de groupe
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRecetteForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DEPENSE ===== */}
      {showDepenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Nouvelle depense flocage</h3>
              <button onClick={() => setShowDepenseForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={depenseForm.description}
                  onChange={e => setDepenseForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Rouleau de flex blanc" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={depenseForm.montant}
                  onChange={e => setDepenseForm(f => ({ ...f, montant: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="25000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={depenseForm.categorie}
                  onChange={e => setDepenseForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_DEPENSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepenseForm(false)}
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
