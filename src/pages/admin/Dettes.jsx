import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/dettes", label: "Mes dettes", active: true },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
  { to: "/admin/flocage", label: "Flocage" },
];

const CATEGORIES = [
  "Fournisseur",
  "Emprunt personnel",
  "Banque / Microfinance",
  "Loyer en retard",
  "Associe",
  "Autre",
];

const MOYENS = ["Especes", "Wave", "Orange Money", "Free Money", "Virement", "Autre"];

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
  if (!ts) return "-";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
}

function joursAvantEcheance(dateStr) {
  if (!dateStr) return null;
  const e = new Date(dateStr);
  if (isNaN(e)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e - now) / (1000 * 60 * 60 * 24));
}

function etatDette(d) {
  const total = Number(d.montantTotal || 0);
  const rembourses = d.remboursements || [];
  const paye = rembourses.reduce((a, r) => a + Number(r.montant || 0), 0);
  const reste = Math.max(0, total - paye);
  const pct = total > 0 ? Math.min(100, Math.round(paye / total * 100)) : 0;

  let label, couleur;
  if (paye === 0) {
    label = "Non rembourse";
    couleur = "bg-red-100 text-red-700";
  } else if (reste <= 0) {
    label = "Solde";
    couleur = "bg-green-100 text-green-700";
  } else {
    label = "Partiel";
    couleur = "bg-orange-100 text-orange-700";
  }

  return { total, paye, reste, pct, label, couleur };
}

const DETTE_VIDE = {
  creancier: "",
  description: "",
  montantTotal: "",
  categorie: "Fournisseur",
  dateEcheance: "",
  compterDansCaisse: true,
};

export default function Dettes() {
  const [dettes, setDettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtre, setFiltre] = useState("Tous");
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DETTE_VIDE);

  const [showRemb, setShowRemb] = useState(null);
  const [rembForm, setRembForm] = useState({ montant: "", moyen: "Especes", note: "" });

  useEffect(() => { charger(); }, []);

  async function charger() {
    const snap = await getDocs(collection(db, "dettes"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setDettes(data);
    setLoading(false);
  }

  function ouvrirNouvelle() {
    setEditing(null);
    setForm(DETTE_VIDE);
    setShowForm(true);
  }

  function ouvrirEdition(d) {
    setEditing(d.id);
    setForm({
      creancier: d.creancier || "",
      description: d.description || "",
      montantTotal: d.montantTotal || "",
      categorie: d.categorie || "Fournisseur",
      dateEcheance: d.dateEcheance || "",
      compterDansCaisse: d.compterDansCaisse !== false,
    });
    setShowForm(true);
  }

  async function sauverDette(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        creancier: form.creancier.trim(),
        description: form.description.trim(),
        montantTotal: Number(form.montantTotal),
        categorie: form.categorie,
        dateEcheance: form.dateEcheance || null,
        compterDansCaisse: form.compterDansCaisse,
      };
      if (editing) {
        await updateDoc(doc(db, "dettes", editing), data);
      } else {
        await addDoc(collection(db, "dettes"), {
          ...data,
          remboursements: [],
          createdAt: serverTimestamp(),
        });
      }
      await charger();
      setShowForm(false);
      setEditing(null);
      setForm(DETTE_VIDE);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  async function supprimerDette(id) {
    if (!confirm("Supprimer cette dette et tout son historique de remboursements ?")) return;
    await deleteDoc(doc(db, "dettes", id));
    await charger();
  }

  // ===== REMBOURSEMENTS =====
  function ouvrirRemboursement(d) {
    const { reste } = etatDette(d);
    setRembForm({ montant: String(reste), moyen: "Especes", note: "" });
    setShowRemb(d.id);
  }

  async function ajouterRemboursement(e) {
    e.preventDefault();
    const d = dettes.find(x => x.id === showRemb);
    if (!d) return;

    const montant = Number(rembForm.montant);
    const { reste } = etatDette(d);

    if (montant > reste) {
      if (!confirm(
        `Ce remboursement de ${formatPrix(montant)} depasse le reste du (${formatPrix(reste)}).\n\nContinuer ?`
      )) return;
    }

    setSaving(true);
    try {
      const remboursements = [...(d.remboursements || []), {
        montant,
        moyen: rembForm.moyen,
        note: rembForm.note || "",
        date: new Date().toISOString(),
      }];
      await updateDoc(doc(db, "dettes", d.id), { remboursements });
      setDettes(prev => prev.map(x => x.id === d.id ? { ...x, remboursements } : x));
      setShowRemb(null);
      setRembForm({ montant: "", moyen: "Especes", note: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur.");
    }
    setSaving(false);
  }

  async function supprimerRemboursement(d, index) {
    if (!confirm("Supprimer ce remboursement ?")) return;
    try {
      const remboursements = (d.remboursements || []).filter((_, i) => i !== index);
      await updateDoc(doc(db, "dettes", d.id), { remboursements });
      setDettes(prev => prev.map(x => x.id === d.id ? { ...x, remboursements } : x));
    } catch { alert("Erreur."); }
  }

  // ===== CALCULS =====
  const totalDu = dettes.reduce((a, d) => a + Number(d.montantTotal || 0), 0);
  const totalRembourse = dettes.reduce((a, d) => a + etatDette(d).paye, 0);
  const totalRestant = dettes.reduce((a, d) => a + etatDette(d).reste, 0);
  const nbNonSoldees = dettes.filter(d => etatDette(d).reste > 0).length;

  const enRetard = dettes.filter(d => {
    if (etatDette(d).reste <= 0 || !d.dateEcheance) return false;
    const j = joursAvantEcheance(d.dateEcheance);
    return j !== null && j < 0;
  });

  const echeancesProches = dettes.filter(d => {
    if (etatDette(d).reste <= 0 || !d.dateEcheance) return false;
    const j = joursAvantEcheance(d.dateEcheance);
    return j !== null && j >= 0 && j <= 7;
  });

  const parCategorie = {};
  dettes.forEach(d => {
    const r = etatDette(d).reste;
    if (r > 0) parCategorie[d.categorie] = (parCategorie[d.categorie] || 0) + r;
  });

  const filtrees = dettes.filter(d => {
    const { label } = etatDette(d);
    const matchFiltre = filtre === "Tous" || label === filtre;
    const q = recherche.toLowerCase().trim();
    const matchRecherche = !q ||
      (d.creancier || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q);
    return matchFiltre && matchRecherche;
  });

  const detteRemb = dettes.find(d => d.id === showRemb);
  const etatRemb = detteRemb ? etatDette(detteRemb) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Mes dettes</h2>
              <p className="text-gray-400 text-sm mt-1">
                Ce que tu dois et tes remboursements
              </p>
            </div>
            <button onClick={ouvrirNouvelle}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Nouvelle dette
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total emprunte</p>
                  <p className="font-black text-lg text-gray-800">{formatPrix(totalDu)}</p>
                  <p className="text-gray-400 text-xs mt-1">{dettes.length} dette(s)</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-600 text-xs font-bold uppercase mb-1">Deja rembourse</p>
                  <p className="font-black text-lg text-green-700">{formatPrix(totalRembourse)}</p>
                  <p className="text-green-500 text-xs mt-1">
                    {totalDu > 0 ? Math.round(totalRembourse / totalDu * 100) : 0}% du total
                  </p>
                </div>
                <div className={`${totalRestant > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} border rounded-xl p-4`}>
                  <p className={`${totalRestant > 0 ? "text-red-600" : "text-gray-400"} text-xs font-bold uppercase mb-1`}>
                    Reste a rembourser
                  </p>
                  <p className={`font-black text-lg ${totalRestant > 0 ? "text-red-700" : "text-gray-500"}`}>
                    {formatPrix(totalRestant)}
                  </p>
                  <p className={`${totalRestant > 0 ? "text-red-500" : "text-gray-400"} text-xs mt-1`}>
                    {nbNonSoldees} dette(s) ouverte(s)
                  </p>
                </div>
                <div className={`${enRetard.length > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"} border rounded-xl p-4`}>
                  <p className={`${enRetard.length > 0 ? "text-orange-600" : "text-gray-400"} text-xs font-bold uppercase mb-1`}>
                    Echeances depassees
                  </p>
                  <p className={`font-black text-lg ${enRetard.length > 0 ? "text-orange-700" : "text-gray-800"}`}>
                    {enRetard.length}
                  </p>
                </div>
              </div>

              {/* Alertes echeances */}
              {enRetard.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="font-bold text-red-700 text-sm mb-2">
                    {enRetard.length} echeance(s) depassee(s)
                  </p>
                  {enRetard.map(d => {
                    const j = joursAvantEcheance(d.dateEcheance);
                    return (
                      <p key={d.id} className="text-sm text-red-600">
                        {d.creancier} — {formatPrix(etatDette(d).reste)} du
                        <span className="font-bold"> ({Math.abs(j)} jour(s) de retard)</span>
                      </p>
                    );
                  })}
                </div>
              )}

              {echeancesProches.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <p className="font-bold text-orange-700 text-sm mb-2">
                    Echeances dans les 7 prochains jours
                  </p>
                  {echeancesProches.map(d => {
                    const j = joursAvantEcheance(d.dateEcheance);
                    return (
                      <p key={d.id} className="text-sm text-orange-600">
                        {d.creancier} — {formatPrix(etatDette(d).reste)}
                        {j === 0 ? " — aujourd'hui" : ` — dans ${j} jour(s)`}
                      </p>
                    );
                  })}
                </div>
              )}

              {/* Dettes par categorie */}
              {Object.keys(parCategorie).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h3 className="font-bold text-base mb-4">Reste a rembourser par categorie</h3>
                  <div className="space-y-3">
                    {Object.entries(parCategorie).sort((a, b) => b[1] - a[1]).map(([cat, montant]) => {
                      const pct = totalRestant > 0 ? Math.round(montant / totalRestant * 100) : 0;
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

              {/* Recherche */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <input value={recherche} onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher par creancier ou description..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
              </div>

              {/* Filtres */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                {["Tous", "Non rembourse", "Partiel", "Solde"].map(f => (
                  <button key={f} onClick={() => setFiltre(f)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${filtre === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    {f}
                    {f !== "Tous" && ` (${dettes.filter(d => etatDette(d).label === f).length})`}
                  </button>
                ))}
              </div>

              {/* Liste */}
              {filtrees.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                  <p className="font-semibold">
                    {dettes.length === 0 ? "Aucune dette enregistree" : "Aucun resultat"}
                  </p>
                  {dettes.length === 0 && (
                    <p className="text-sm mt-1">
                      Enregistre ce que tu dois a tes fournisseurs ou a tes proches
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtrees.map(d => {
                    const p = etatDette(d);
                    const estOuverte = ouverte === d.id;
                    const j = joursAvantEcheance(d.dateEcheance);
                    const retard = p.reste > 0 && j !== null && j < 0;

                    return (
                      <div key={d.id}
                        className={`bg-white rounded-xl border p-4 transition ${estOuverte ? "border-blue-300 shadow-sm" : retard ? "border-red-200" : "border-gray-200 hover:shadow-sm"}`}>

                        <div className="cursor-pointer" onClick={() => setOuverte(estOuverte ? null : d.id)}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="font-bold text-sm">{d.creancier}</p>
                              {d.description && (
                                <p className="text-gray-500 text-xs mt-0.5">{d.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {d.categorie}
                                </span>
                                {d.dateEcheance && (
                                  <span className={`text-xs font-medium ${retard ? "text-red-600" : j !== null && j <= 7 ? "text-orange-600" : "text-gray-400"}`}>
                                    Echeance : {formatDate(d.dateEcheance)}
                                    {retard && ` (${Math.abs(j)}j de retard)`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-sm">{formatPrix(p.total)}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${p.couleur}`}>
                                {p.label}
                              </span>
                            </div>
                          </div>

                          {/* Barre */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                              <span className="text-xs text-gray-500">
                                {formatPrix(p.paye)} rembourse
                              </span>
                              {p.reste > 0 && (
                                <span className="text-xs text-red-600 font-bold">
                                  Reste {formatPrix(p.reste)}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${p.reste <= 0 ? "bg-green-500" : "bg-orange-500"}`}
                                style={{ width: `${p.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {p.reste > 0 && (
                          <button onClick={() => ouvrirRemboursement(d)}
                            className="w-full mt-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition">
                            + Enregistrer un remboursement
                          </button>
                        )}

                        {/* Detail */}
                        {estOuverte && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400 uppercase tracking-wide">
                                  Remboursements ({(d.remboursements || []).length})
                                </p>
                              </div>

                              {(d.remboursements || []).length === 0 ? (
                                <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">
                                  Aucun remboursement enregistre
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {d.remboursements.map((r, i) => (
                                    <div key={i}
                                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                      <div>
                                        <p className="text-sm font-medium">
                                          {formatPrix(r.montant)}
                                          <span className="text-gray-400 font-normal text-xs ml-2">{r.moyen}</span>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {formatDate(r.date)}
                                          {r.note && ` — ${r.note}`}
                                        </p>
                                      </div>
                                      <button onClick={() => supprimerRemboursement(d, i)}
                                        className="text-gray-300 hover:text-red-500 transition text-lg px-2">x</button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-3 bg-gray-900 rounded-xl p-4 text-white">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Emprunte</p>
                                    <p className="font-black text-sm">{formatPrix(p.total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Rembourse</p>
                                    <p className="font-black text-sm text-green-400">{formatPrix(p.paye)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Reste</p>
                                    <p className={`font-black text-sm ${p.reste > 0 ? "text-red-400" : "text-green-400"}`}>
                                      {formatPrix(p.reste)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => ouvrirEdition(d)}
                                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                                Modifier la dette
                              </button>
                              <button onClick={() => supprimerDette(d.id)}
                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">
                                Supprimer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ===== MODAL DETTE ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">
                {editing ? "Modifier la dette" : "Nouvelle dette"}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={sauverDette} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  A qui dois-tu ? <span className="text-orange-500">*</span>
                </label>
                <input value={form.creancier}
                  onChange={e => setForm(f => ({ ...f, creancier: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Fournisseur Diallo" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Description — optionnel</label>
                <input value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Lot de 200 cahiers a credit" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Montant total (FCFA) <span className="text-orange-500">*</span>
                </label>
                <input type="number" value={form.montantTotal}
                  onChange={e => setForm(f => ({ ...f, montantTotal: e.target.value }))}
                  required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold"
                  placeholder="150000" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={form.categorie}
                  onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Date d'echeance — optionnel</label>
                <input type="date" value={form.dateEcheance}
                  onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
                <p className="text-xs text-gray-400 mt-1">
                  Tu seras alerte 7 jours avant
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.compterDansCaisse}
                    onChange={e => setForm(f => ({ ...f, compterDansCaisse: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-blue-700">
                      Compter les remboursements comme depense
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Coche si tu n'as pas deja enregistre cet achat en depense.
                      Decoche pour un emprunt d'argent dont la depense est deja saisie —
                      sinon tu compterais deux fois.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL REMBOURSEMENT ===== */}
      {showRemb && detteRemb && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Nouveau remboursement</h3>
              <button onClick={() => setShowRemb(null)} className="text-gray-400 text-xl">X</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="font-bold text-sm">{detteRemb.creancier}</p>
              {detteRemb.description && (
                <p className="text-gray-500 text-xs mt-0.5">{detteRemb.description}</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-gray-400 text-xs">Emprunte</p>
                  <p className="font-black text-sm">{formatPrix(etatRemb.total)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Rembourse</p>
                  <p className="font-black text-sm text-green-600">{formatPrix(etatRemb.paye)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Reste</p>
                  <p className="font-black text-sm text-red-600">{formatPrix(etatRemb.reste)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={ajouterRemboursement} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant rembourse (FCFA)</label>
                <input type="number" value={rembForm.montant}
                  onChange={e => setRembForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1" autoFocus
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-green-500 font-black text-green-700" />

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button type="button"
                    onClick={() => setRembForm(f => ({ ...f, montant: String(etatRemb.reste) }))}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                    Tout le reste
                  </button>
                  <button type="button"
                    onClick={() => setRembForm(f => ({ ...f, montant: String(Math.round(etatRemb.reste / 2)) }))}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                    La moitie
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Moyen de paiement</label>
                <select value={rembForm.moyen}
                  onChange={e => setRembForm(f => ({ ...f, moyen: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {MOYENS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Note — optionnel</label>
                <input value={rembForm.note}
                  onChange={e => setRembForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: remis en main propre" />
              </div>

              {rembForm.montant && (
                <div className={`border rounded-xl p-3 ${
                  Number(rembForm.montant) >= etatRemb.reste
                    ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                }`}>
                  <p className={`text-sm font-bold ${
                    Number(rembForm.montant) >= etatRemb.reste ? "text-green-700" : "text-orange-700"
                  }`}>
                    {Number(rembForm.montant) >= etatRemb.reste
                      ? "Cette dette sera entierement soldee"
                      : `Il restera ${formatPrix(etatRemb.reste - Number(rembForm.montant))} a rembourser`}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRemb(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Valider le remboursement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
