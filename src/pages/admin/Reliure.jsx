import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { formatPrix } from "../../utils/format";
import { Sidebar, MobileNav } from "../../components/AdminNav";

const MOIS = [
  "Janvier","Fevrier","Mars","Avril","Mai","Juin",
  "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"
];

const TYPES_TRAVAUX = [
  "Cahier A4 100 pages",
  "Cahier A4 200 pages",
  "Cahier A4 300 pages",
  "Reliure spirale",
  "Reliure thermique",
  "Memoire / Rapport",
  "Plastification",
  "Autre",
];

const CATEGORIES_DEPENSES = [
  "Papier / Rames",
  "Spirales / Baguettes",
  "Couvertures",
  "Maintenance machine",
  "Electricite",
  "Consommables",
  "Autre",
];

function formatDate(ts) {
  if (!ts?.seconds) return "-";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

const RECETTE_VIDE = {
  client: "",
  typeTravail: "Cahier A4 100 pages",
  description: "",
  nombre: "",
  prixUnitaire: "1000",
  montantTotal: "",
};

const DEPENSE_VIDE = { description: "", montant: "", categorie: "Papier / Rames" };

export default function Reliure() {
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
      getDocs(collection(db, "reliure_recettes")),
      getDocs(collection(db, "reliure_depenses")),
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
      if (name === "nombre" || name === "prixUnitaire") {
        const n = Number(name === "nombre" ? value : f.nombre);
        const p = Number(name === "prixUnitaire" ? value : f.prixUnitaire);
        if (n > 0 && p > 0) updated.montantTotal = String(n * p);
      }
      return updated;
    });
  }

  async function ajouterRecette(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "reliure_recettes"), {
        client: recetteForm.client.trim(),
        typeTravail: recetteForm.typeTravail,
        description: recetteForm.description.trim(),
        nombre: Number(recetteForm.nombre || 0),
        prixUnitaire: Number(recetteForm.prixUnitaire || 0),
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
      await addDoc(collection(db, "reliure_depenses"), {
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
    if (!confirm("Supprimer ce travail ?")) return;
    await deleteDoc(doc(db, "reliure_recettes", id));
    await charger();
  }

  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette depense ?")) return;
    await deleteDoc(doc(db, "reliure_depenses", id));
    await charger();
  }

  // ===== CALCULS =====
  const totalRecettesGlobal = recettes.reduce((a, r) => a + Number(r.montant || 0), 0);
  const totalDepensesGlobal = depenses.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeGlobal = totalRecettesGlobal - totalDepensesGlobal;
  const totalUnitesGlobal = recettes.reduce((a, r) => a + Number(r.nombre || 0), 0);

  const recettesDuMois = recettes.filter(r => estDansMois(r.createdAt, moisSelectionne, anneeSelectionnee));
  const depensesDuMois = depenses.filter(d => estDansMois(d.createdAt, moisSelectionne, anneeSelectionnee));
  const totalRecettesMois = recettesDuMois.reduce((a, r) => a + Number(r.montant || 0), 0);
  const totalDepensesMois = depensesDuMois.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeMois = totalRecettesMois - totalDepensesMois;
  const totalUnitesMois = recettesDuMois.reduce((a, r) => a + Number(r.nombre || 0), 0);

  const parCategorie = {};
  depenses.forEach(d => {
    parCategorie[d.categorie] = (parCategorie[d.categorie] || 0) + Number(d.montant || 0);
  });

  const parType = {};
  recettes.forEach(r => {
    const t = r.typeTravail || "Autre";
    if (!parType[t]) parType[t] = { type: t, unites: 0, montant: 0 };
    parType[t].unites += Number(r.nombre || 0);
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
        (r.typeTravail || "").toLowerCase().includes(q);
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
              <h2 className="font-black text-xl md:text-2xl">Service Reliure</h2>
              <p className="text-gray-400 text-sm mt-1">
                Fabrication de cahiers et reliures — comptabilite separee
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
                  <p className="text-purple-600 text-xs font-bold uppercase mb-1">Unites produites</p>
                  <p className="font-black text-xl text-purple-700">{totalUnitesGlobal.toLocaleString("fr-SN")}</p>
                  <p className="text-purple-500 text-xs mt-1">Cahiers et reliures</p>
                </div>
              </div>

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

              {/* ===== APERCU ===== */}
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
                      <p className="text-purple-600 text-xs font-bold mb-1">Unites du mois</p>
                      <p className="font-black text-lg text-purple-700">{totalUnitesMois}</p>
                    </div>
                  </div>

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
                                <span className="text-gray-400 font-normal"> — {r.typeTravail}</span>
                              </p>
                              <p className="text-gray-400 text-xs truncate">
                                {formatDate(r.createdAt)}
                                {r.nombre > 0 && ` — ${r.nombre} x ${formatPrix(r.prixUnitaire)}`}
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
                      Bilan Reliure — {MOIS[moisSelectionne]} {anneeSelectionnee}
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
                        <p className="text-gray-400 text-xs mb-1">Unites</p>
                        <p className="font-black text-purple-400">{totalUnitesMois}</p>
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
                      <h3 className="font-bold text-sm mb-4">Repartition par type de travail</h3>
                      <div className="space-y-3">
                        {typesTries.map(t => {
                          const pct = totalRecettesGlobal > 0
                            ? Math.round(t.montant / totalRecettesGlobal * 100) : 0;
                          return (
                            <div key={t.type}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  {t.type}
                                  <span className="text-gray-400 text-xs ml-2">{t.unites} unite(s)</span>
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
                              <p className="font-medium text-sm truncate">{r.client || "Client comptoir"}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                  {r.typeTravail}
                                </span>
                                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                                {r.nombre > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {r.nombre} x {formatPrix(r.prixUnitaire)}
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
              <h3 className="font-black text-lg">Nouveau travail de reliure</h3>
              <button onClick={() => setShowRecetteForm(false)} className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={ajouterRecette} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du client — optionnel</label>
                <input name="client" value={recetteForm.client} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Ecole Serigne Fallou" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de travail</label>
                <select name="typeTravail" value={recetteForm.typeTravail} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {TYPES_TRAVAUX.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Detail — optionnel</label>
                <input name="description" value={recetteForm.description} onChange={handleRecetteChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: couverture bleue, grands carreaux" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Nombre</label>
                  <input type="number" name="nombre" value={recetteForm.nombre}
                    onChange={handleRecetteChange} min="1"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="50" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix unitaire (FCFA)</label>
                  <input type="number" name="prixUnitaire" value={recetteForm.prixUnitaire}
                    onChange={handleRecetteChange} min="1"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="1000" />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <label className="text-sm text-green-700 font-bold block mb-1">Montant total (FCFA)</label>
                <input type="number" name="montantTotal" value={recetteForm.montantTotal}
                  onChange={handleRecetteChange} required min="1"
                  className="w-full border border-green-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white font-bold text-green-700"
                  placeholder="50000" />
                <p className="text-xs text-green-500 mt-1">
                  Calcule automatiquement — modifiable pour un prix de gros
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
              <h3 className="font-black text-lg">Nouvelle depense reliure</h3>
              <button onClick={() => setShowDepenseForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={depenseForm.description}
                  onChange={e => setDepenseForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: 10 rames de papier A4" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={depenseForm.montant}
                  onChange={e => setDepenseForm(f => ({ ...f, montant: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="35000" />
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
