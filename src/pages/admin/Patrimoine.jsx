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
  { to: "/admin/dettes", label: "Mes dettes" },
  { to: "/admin/patrimoine", label: "Biens & charges", active: true },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/flocage", label: "Flocage" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

const MOIS = [
  "Janvier","Fevrier","Mars","Avril","Mai","Juin",
  "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"
];

const CATEGORIES_BIENS = [
  "Machine / Equipement",
  "Informatique",
  "Mobilier",
  "Vehicule",
  "Outillage",
  "Amenagement local",
  "Autre",
];

const CATEGORIES_CHARGES = [
  "Loyer",
  "Salaires / Equipe",
  "Electricite",
  "Internet / Telephone",
  "Transport",
  "Taxes / Impots",
  "Autre",
];

const ETATS = ["Neuf", "Bon etat", "Use", "En panne", "Vendu"];
const MOYENS = ["Especes", "Wave", "Orange Money", "Free Money", "Virement", "Autre"];
const PERIODICITES = ["Mensuel", "Hebdomadaire", "Trimestriel", "Annuel", "Ponctuel"];

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

function coutTotalBien(b) {
  const initial = Number(b.prixInitial || 0);
  const supplements = (b.couts || []).reduce((a, c) => a + Number(c.montant || 0), 0);
  return initial + supplements;
}

function totalPayeCharge(c) {
  return (c.paiements || []).reduce((a, p) => a + Number(p.montant || 0), 0);
}

const BIEN_VIDE = {
  nom: "",
  categorie: "Machine / Equipement",
  prixInitial: "",
  dateAchat: "",
  etat: "Neuf",
  notes: "",
};

const CHARGE_VIDE = {
  libelle: "",
  categorie: "Loyer",
  montantPrevu: "",
  periodicite: "Mensuel",
  notes: "",
};

export default function Patrimoine() {
  const [biens, setBiens] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState("biens");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(null);

  const [moisSelectionne, setMoisSelectionne] = useState(new Date().getMonth());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());

  const [showBienForm, setShowBienForm] = useState(false);
  const [editingBien, setEditingBien] = useState(null);
  const [bienForm, setBienForm] = useState(BIEN_VIDE);

  const [showCoutForm, setShowCoutForm] = useState(null);
  const [coutForm, setCoutForm] = useState({ libelle: "", montant: "" });

  const [showChargeForm, setShowChargeForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [chargeForm, setChargeForm] = useState(CHARGE_VIDE);

  const [showPaiementForm, setShowPaiementForm] = useState(null);
  const [paiementForm, setPaiementForm] = useState({
    montant: "", moyen: "Especes", periode: "", note: "",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [bSnap, cSnap] = await Promise.all([
      getDocs(collection(db, "biens")),
      getDocs(collection(db, "charges")),
    ]);
    setBiens(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setCharges(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // ===== BIENS =====
  function ouvrirNouveauBien() {
    setEditingBien(null);
    setBienForm(BIEN_VIDE);
    setShowBienForm(true);
  }

  function ouvrirEditionBien(b) {
    setEditingBien(b.id);
    setBienForm({
      nom: b.nom || "",
      categorie: b.categorie || "Machine / Equipement",
      prixInitial: b.prixInitial || "",
      dateAchat: b.dateAchat || "",
      etat: b.etat || "Neuf",
      notes: b.notes || "",
    });
    setShowBienForm(true);
  }

  async function sauverBien(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nom: bienForm.nom.trim(),
        categorie: bienForm.categorie,
        prixInitial: Number(bienForm.prixInitial),
        dateAchat: bienForm.dateAchat || null,
        etat: bienForm.etat,
        notes: bienForm.notes.trim(),
      };
      if (editingBien) {
        await updateDoc(doc(db, "biens", editingBien), data);
      } else {
        await addDoc(collection(db, "biens"), {
          ...data, couts: [], createdAt: serverTimestamp(),
        });
      }
      await charger();
      setShowBienForm(false);
      setEditingBien(null);
      setBienForm(BIEN_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerBien(id) {
    if (!confirm("Supprimer ce bien et tous ses couts ?")) return;
    await deleteDoc(doc(db, "biens", id));
    await charger();
  }

  async function ajouterCout(e) {
    e.preventDefault();
    const b = biens.find(x => x.id === showCoutForm);
    if (!b) return;
    setSaving(true);
    try {
      const couts = [...(b.couts || []), {
        libelle: coutForm.libelle.trim(),
        montant: Number(coutForm.montant),
        date: new Date().toISOString(),
      }];
      await updateDoc(doc(db, "biens", b.id), { couts });
      setBiens(prev => prev.map(x => x.id === b.id ? { ...x, couts } : x));
      setShowCoutForm(null);
      setCoutForm({ libelle: "", montant: "" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerCout(b, index) {
    if (!confirm("Supprimer cette ligne de cout ?")) return;
    const couts = (b.couts || []).filter((_, i) => i !== index);
    await updateDoc(doc(db, "biens", b.id), { couts });
    setBiens(prev => prev.map(x => x.id === b.id ? { ...x, couts } : x));
  }

  // ===== CHARGES =====
  function ouvrirNouvelleCharge() {
    setEditingCharge(null);
    setChargeForm(CHARGE_VIDE);
    setShowChargeForm(true);
  }

  function ouvrirEditionCharge(c) {
    setEditingCharge(c.id);
    setChargeForm({
      libelle: c.libelle || "",
      categorie: c.categorie || "Loyer",
      montantPrevu: c.montantPrevu || "",
      periodicite: c.periodicite || "Mensuel",
      notes: c.notes || "",
    });
    setShowChargeForm(true);
  }

  async function sauverCharge(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        libelle: chargeForm.libelle.trim(),
        categorie: chargeForm.categorie,
        montantPrevu: Number(chargeForm.montantPrevu || 0),
        periodicite: chargeForm.periodicite,
        notes: chargeForm.notes.trim(),
      };
      if (editingCharge) {
        await updateDoc(doc(db, "charges", editingCharge), data);
      } else {
        await addDoc(collection(db, "charges"), {
          ...data, paiements: [], createdAt: serverTimestamp(),
        });
      }
      await charger();
      setShowChargeForm(false);
      setEditingCharge(null);
      setChargeForm(CHARGE_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerCharge(id) {
    if (!confirm("Supprimer cette charge et son historique ?")) return;
    await deleteDoc(doc(db, "charges", id));
    await charger();
  }

  function ouvrirPaiement(c) {
    const maintenant = new Date();
    setPaiementForm({
      montant: String(c.montantPrevu || ""),
      moyen: "Especes",
      periode: `${MOIS[maintenant.getMonth()]} ${maintenant.getFullYear()}`,
      note: "",
    });
    setShowPaiementForm(c.id);
  }

  async function ajouterPaiement(e) {
    e.preventDefault();
    const c = charges.find(x => x.id === showPaiementForm);
    if (!c) return;
    setSaving(true);
    try {
      const paiements = [...(c.paiements || []), {
        montant: Number(paiementForm.montant),
        moyen: paiementForm.moyen,
        periode: paiementForm.periode.trim(),
        note: paiementForm.note.trim(),
        date: new Date().toISOString(),
      }];
      await updateDoc(doc(db, "charges", c.id), { paiements });
      setCharges(prev => prev.map(x => x.id === c.id ? { ...x, paiements } : x));
      setShowPaiementForm(null);
      setPaiementForm({ montant: "", moyen: "Especes", periode: "", note: "" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerPaiement(c, index) {
    if (!confirm("Supprimer ce paiement ?")) return;
    const paiements = (c.paiements || []).filter((_, i) => i !== index);
    await updateDoc(doc(db, "charges", c.id), { paiements });
    setCharges(prev => prev.map(x => x.id === c.id ? { ...x, paiements } : x));
  }

  // ===== CALCULS =====
  const totalBiens = biens.reduce((a, b) => a + coutTotalBien(b), 0);
  const totalAchatInitial = biens.reduce((a, b) => a + Number(b.prixInitial || 0), 0);
  const totalSupplements = totalBiens - totalAchatInitial;

  const totalChargesPayees = charges.reduce((a, c) => a + totalPayeCharge(c), 0);
  const chargesMensuelles = charges
    .filter(c => c.periodicite === "Mensuel")
    .reduce((a, c) => a + Number(c.montantPrevu || 0), 0);

  function paiementDansMois(p, mois, annee) {
    if (!p.date) return false;
    const d = new Date(p.date);
    if (isNaN(d)) return false;
    return d.getMonth() === mois && d.getFullYear() === annee;
  }

  const chargesDuMois = charges.reduce((a, c) => {
    const m = (c.paiements || [])
      .filter(p => paiementDansMois(p, moisSelectionne, anneeSelectionnee))
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    return a + m;
  }, 0);

  const parCategorieBiens = {};
  biens.forEach(b => {
    parCategorieBiens[b.categorie] = (parCategorieBiens[b.categorie] || 0) + coutTotalBien(b);
  });

  const parCategorieCharges = {};
  charges.forEach(c => {
    parCategorieCharges[c.categorie] = (parCategorieCharges[c.categorie] || 0) + totalPayeCharge(c);
  });

  const annees = [...new Set([
    ...charges.flatMap(c => (c.paiements || []).map(p => {
      const d = new Date(p.date);
      return isNaN(d) ? null : d.getFullYear();
    })),
    new Date().getFullYear(),
  ].filter(Boolean))].sort((a, b) => b - a);

  const biensFiltres = biens
    .filter(b => {
      const q = recherche.toLowerCase().trim();
      if (!q) return true;
      return (b.nom || "").toLowerCase().includes(q) ||
        (b.categorie || "").toLowerCase().includes(q);
    })
    .sort((a, b) => coutTotalBien(b) - coutTotalBien(a));

  const chargesFiltrees = charges
    .filter(c => {
      const q = recherche.toLowerCase().trim();
      if (!q) return true;
      return (c.libelle || "").toLowerCase().includes(q) ||
        (c.categorie || "").toLowerCase().includes(q);
    })
    .sort((a, b) => totalPayeCharge(b) - totalPayeCharge(a));

  const bienCout = biens.find(b => b.id === showCoutForm);
  const chargePaiement = charges.find(c => c.id === showPaiementForm);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Biens & charges</h2>
              <p className="text-gray-400 text-sm mt-1">
                Ce que tu possedes et ce que tu payes regulierement
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={ouvrirNouvelleCharge}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition">
                + Charge
              </button>
              <button onClick={ouvrirNouveauBien}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
                + Bien
              </button>
            </div>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <p className="text-indigo-600 text-xs font-bold uppercase mb-1">Valeur des biens</p>
                  <p className="font-black text-lg text-indigo-700">{formatPrix(totalBiens)}</p>
                  <p className="text-indigo-500 text-xs mt-1">{biens.length} bien(s)</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">Couts additionnels</p>
                  <p className="font-black text-lg text-gray-800">{formatPrix(totalSupplements)}</p>
                  <p className="text-gray-400 text-xs mt-1">Cartouches, reparations...</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-orange-600 text-xs font-bold uppercase mb-1">Charges payees</p>
                  <p className="font-black text-lg text-orange-700">{formatPrix(totalChargesPayees)}</p>
                  <p className="text-orange-500 text-xs mt-1">{charges.length} charge(s)</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-xs font-bold uppercase mb-1">Charges mensuelles</p>
                  <p className="font-black text-lg text-red-700">{formatPrix(chargesMensuelles)}</p>
                  <p className="text-red-500 text-xs mt-1">A prevoir chaque mois</p>
                </div>
              </div>

              {/* Onglets */}
              <div className="flex gap-2 flex-wrap mb-6">
                {[
                  { id: "biens", label: `Mes biens (${biens.length})` },
                  { id: "charges", label: `Charges (${charges.length})` },
                ].map(o => (
                  <button key={o.id} onClick={() => { setOnglet(o.id); setOuvert(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${onglet === o.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <input value={recherche} onChange={e => setRecherche(e.target.value)}
                  placeholder={onglet === "biens" ? "Rechercher un bien..." : "Rechercher une charge..."}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
              </div>

              {/* ===== BIENS ===== */}
              {onglet === "biens" && (
                <>
                  {Object.keys(parCategorieBiens).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <h3 className="font-bold text-sm mb-4">Repartition par categorie</h3>
                      <div className="space-y-3">
                        {Object.entries(parCategorieBiens).sort((a, b) => b[1] - a[1]).map(([cat, montant]) => {
                          const pct = totalBiens > 0 ? Math.round(montant / totalBiens * 100) : 0;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{cat}</span>
                                <span className="font-semibold">{formatPrix(montant)} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {biensFiltres.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                      <p className="font-semibold">
                        {biens.length === 0 ? "Aucun bien enregistre" : "Aucun resultat"}
                      </p>
                      {biens.length === 0 && (
                        <p className="text-sm mt-1">
                          Enregistre ton imprimante, ta machine de flocage, ton mobilier...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {biensFiltres.map(b => {
                        const total = coutTotalBien(b);
                        const supplements = (b.couts || []).reduce((a, c) => a + Number(c.montant || 0), 0);
                        const estOuvert = ouvert === b.id;
                        return (
                          <div key={b.id}
                            className={`bg-white rounded-xl border p-4 transition ${estOuvert ? "border-indigo-300 shadow-sm" : "border-gray-200 hover:shadow-sm"}`}>

                            <div className="cursor-pointer" onClick={() => setOuvert(estOuvert ? null : b.id)}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm">{b.nom}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                      {b.categorie}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      b.etat === "En panne" ? "bg-red-100 text-red-700"
                                      : b.etat === "Vendu" ? "bg-gray-100 text-gray-500"
                                      : b.etat === "Use" ? "bg-orange-100 text-orange-700"
                                      : "bg-green-100 text-green-700"
                                    }`}>
                                      {b.etat}
                                    </span>
                                    {b.dateAchat && (
                                      <span className="text-xs text-gray-400">
                                        Achete le {formatDate(b.dateAchat)}
                                      </span>
                                    )}
                                  </div>
                                  {b.notes && (
                                    <p className="text-gray-400 text-xs mt-1">{b.notes}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-black text-base text-indigo-700">{formatPrix(total)}</p>
                                  {supplements > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatPrix(b.prixInitial)} + {formatPrix(supplements)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button onClick={() => { setShowCoutForm(b.id); setCoutForm({ libelle: "", montant: "" }); }}
                              className="w-full mt-3 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition">
                              + Ajouter un cout
                            </button>

                            {estOuvert && (
                              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                                    Couts additionnels ({(b.couts || []).length})
                                  </p>
                                  {(b.couts || []).length === 0 ? (
                                    <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">
                                      Aucun cout ajoute depuis l'achat
                                    </p>
                                  ) : (
                                    <div className="space-y-1">
                                      {b.couts.map((c, i) => (
                                        <div key={i}
                                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                          <div>
                                            <p className="text-sm font-medium">{c.libelle}</p>
                                            <p className="text-xs text-gray-400">{formatDate(c.date)}</p>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm">{formatPrix(c.montant)}</span>
                                            <button onClick={() => supprimerCout(b, i)}
                                              className="text-gray-300 hover:text-red-500 text-lg transition">x</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="mt-3 bg-gray-900 rounded-xl p-4 text-white">
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Prix d'achat</p>
                                        <p className="font-black text-sm">{formatPrix(b.prixInitial)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Couts ajoutes</p>
                                        <p className="font-black text-sm text-orange-400">{formatPrix(supplements)}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Cout total</p>
                                        <p className="font-black text-sm text-indigo-400">{formatPrix(total)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => ouvrirEditionBien(b)}
                                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                                    Modifier le bien
                                  </button>
                                  <button onClick={() => supprimerBien(b.id)}
                                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex justify-between">
                        <span className="font-bold text-sm text-indigo-700">Valeur totale des biens</span>
                        <span className="font-black text-indigo-700">{formatPrix(totalBiens)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===== CHARGES ===== */}
              {onglet === "charges" && (
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
                    <div className="ml-auto text-right">
                      <p className="text-xs text-gray-400">Paye en {MOIS[moisSelectionne]}</p>
                      <p className="font-black text-orange-700">{formatPrix(chargesDuMois)}</p>
                    </div>
                  </div>

                  {Object.keys(parCategorieCharges).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <h3 className="font-bold text-sm mb-4">Total paye par categorie</h3>
                      <div className="space-y-3">
                        {Object.entries(parCategorieCharges).sort((a, b) => b[1] - a[1]).map(([cat, montant]) => {
                          const pct = totalChargesPayees > 0 ? Math.round(montant / totalChargesPayees * 100) : 0;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{cat}</span>
                                <span className="font-semibold">{formatPrix(montant)} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {chargesFiltrees.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                      <p className="font-semibold">
                        {charges.length === 0 ? "Aucune charge enregistree" : "Aucun resultat"}
                      </p>
                      {charges.length === 0 && (
                        <p className="text-sm mt-1">
                          Enregistre ton loyer, les salaires de l'equipe, l'electricite...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chargesFiltrees.map(c => {
                        const paye = totalPayeCharge(c);
                        const nbPaiements = (c.paiements || []).length;
                        const estOuvert = ouvert === c.id;
                        const payeCeMois = (c.paiements || [])
                          .filter(p => paiementDansMois(p, moisSelectionne, anneeSelectionnee))
                          .reduce((a, p) => a + Number(p.montant || 0), 0);

                        return (
                          <div key={c.id}
                            className={`bg-white rounded-xl border p-4 transition ${estOuvert ? "border-orange-300 shadow-sm" : "border-gray-200 hover:shadow-sm"}`}>

                            <div className="cursor-pointer" onClick={() => setOuvert(estOuvert ? null : c.id)}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm">{c.libelle}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                      {c.categorie}
                                    </span>
                                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                                      {c.periodicite}
                                    </span>
                                    {c.montantPrevu > 0 && (
                                      <span className="text-xs text-gray-400">
                                        Prevu : {formatPrix(c.montantPrevu)}
                                      </span>
                                    )}
                                  </div>
                                  {c.notes && (
                                    <p className="text-gray-400 text-xs mt-1">{c.notes}</p>
                                  )}
                                  {payeCeMois > 0 ? (
                                    <p className="text-xs text-green-600 font-bold mt-1">
                                      Paye en {MOIS[moisSelectionne]} : {formatPrix(payeCeMois)}
                                    </p>
                                  ) : c.periodicite === "Mensuel" && (
                                    <p className="text-xs text-orange-600 font-bold mt-1">
                                      Rien de paye en {MOIS[moisSelectionne]}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-black text-base text-orange-700">{formatPrix(paye)}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {nbPaiements} paiement(s)
                                  </p>
                                </div>
                              </div>
                            </div>

                            <button onClick={() => ouvrirPaiement(c)}
                              className="w-full mt-3 bg-orange-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-orange-700 transition">
                              + Enregistrer un paiement
                            </button>

                            {estOuvert && (
                              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                                    Historique ({nbPaiements})
                                  </p>
                                  {nbPaiements === 0 ? (
                                    <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">
                                      Aucun paiement enregistre
                                    </p>
                                  ) : (
                                    <div className="space-y-1">
                                      {[...c.paiements]
                                        .map((p, i) => ({ ...p, _i: i }))
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(p => (
                                          <div key={p._i}
                                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                            <div>
                                              <p className="text-sm font-medium">
                                                {formatPrix(p.montant)}
                                                {p.periode && (
                                                  <span className="text-gray-500 font-normal text-xs ml-2">
                                                    {p.periode}
                                                  </span>
                                                )}
                                              </p>
                                              <p className="text-xs text-gray-400">
                                                {formatDate(p.date)} — {p.moyen}
                                                {p.note && ` — ${p.note}`}
                                              </p>
                                            </div>
                                            <button onClick={() => supprimerPaiement(c, p._i)}
                                              className="text-gray-300 hover:text-red-500 text-lg transition px-2">x</button>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => ouvrirEditionCharge(c)}
                                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                                    Modifier la charge
                                  </button>
                                  <button onClick={() => supprimerCharge(c.id)}
                                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between">
                        <span className="font-bold text-sm text-orange-700">Total paye depuis le debut</span>
                        <span className="font-black text-orange-700">{formatPrix(totalChargesPayees)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ===== MODAL BIEN ===== */}
      {showBienForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">{editingBien ? "Modifier le bien" : "Nouveau bien"}</h3>
              <button onClick={() => { setShowBienForm(false); setEditingBien(null); }}
                className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={sauverBien} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du bien</label>
                <input value={bienForm.nom}
                  onChange={e => setBienForm(f => ({ ...f, nom: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Imprimante Canon G3010" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={bienForm.categorie}
                  onChange={e => setBienForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_BIENS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix d'achat (FCFA)</label>
                  <input type="number" value={bienForm.prixInitial}
                    onChange={e => setBienForm(f => ({ ...f, prixInitial: e.target.value }))}
                    required min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold"
                    placeholder="150000" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Etat</label>
                  <select value={bienForm.etat}
                    onChange={e => setBienForm(f => ({ ...f, etat: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                    {ETATS.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Date d'achat — optionnel</label>
                <input type="date" value={bienForm.dateAchat}
                  onChange={e => setBienForm(f => ({ ...f, dateAchat: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Notes — optionnel</label>
                <input value={bienForm.notes}
                  onChange={e => setBienForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: numero de serie, garantie 1 an" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  Mets ici le prix paye le jour de l'achat. Les cartouches, reparations
                  et accessoires s'ajoutent apres avec le bouton "+ Ajouter un cout".
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowBienForm(false); setEditingBien(null); }}
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

      {/* ===== MODAL COUT ===== */}
      {showCoutForm && bienCout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Ajouter un cout</h3>
              <button onClick={() => setShowCoutForm(null)} className="text-gray-400 text-xl">X</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="font-bold text-sm">{bienCout.nom}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Cout actuel : {formatPrix(coutTotalBien(bienCout))}
              </p>
            </div>

            <form onSubmit={ajouterCout} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">De quoi s'agit-il ?</label>
                <input value={coutForm.libelle}
                  onChange={e => setCoutForm(f => ({ ...f, libelle: e.target.value }))} required
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Cartouche noire" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={coutForm.montant}
                  onChange={e => setCoutForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1"
                  className="w-full border-2 border-indigo-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 font-black text-indigo-700"
                  placeholder="12000" />
              </div>

              {coutForm.montant && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <p className="text-sm font-bold text-indigo-700">
                    Nouveau cout total : {formatPrix(coutTotalBien(bienCout) + Number(coutForm.montant))}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCoutForm(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL CHARGE ===== */}
      {showChargeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">
                {editingCharge ? "Modifier la charge" : "Nouvelle charge"}
              </h3>
              <button onClick={() => { setShowChargeForm(false); setEditingCharge(null); }}
                className="text-gray-400 text-xl">X</button>
            </div>

            <form onSubmit={sauverCharge} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Libelle</label>
                <input value={chargeForm.libelle}
                  onChange={e => setChargeForm(f => ({ ...f, libelle: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Loyer boutique — ou — Salaire Moussa" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={chargeForm.categorie}
                  onChange={e => setChargeForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_CHARGES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Montant prevu (FCFA)</label>
                  <input type="number" value={chargeForm.montantPrevu}
                    onChange={e => setChargeForm(f => ({ ...f, montantPrevu: e.target.value }))}
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold"
                    placeholder="50000" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Periodicite</label>
                  <select value={chargeForm.periodicite}
                    onChange={e => setChargeForm(f => ({ ...f, periodicite: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                    {PERIODICITES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Notes — optionnel</label>
                <input value={chargeForm.notes}
                  onChange={e => setChargeForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: a payer avant le 5 du mois" />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs text-orange-700">
                  Le montant prevu sert de valeur par defaut quand tu enregistres un paiement.
                  Tu pourras toujours mettre un autre montant.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowChargeForm(false); setEditingCharge(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL PAIEMENT ===== */}
      {showPaiementForm && chargePaiement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Enregistrer un paiement</h3>
              <button onClick={() => setShowPaiementForm(null)} className="text-gray-400 text-xl">X</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="font-bold text-sm">{chargePaiement.libelle}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {chargePaiement.categorie} — {chargePaiement.periodicite}
                {chargePaiement.montantPrevu > 0 && ` — prevu ${formatPrix(chargePaiement.montantPrevu)}`}
              </p>
            </div>

            <form onSubmit={ajouterPaiement} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant paye (FCFA)</label>
                <input type="number" value={paiementForm.montant}
                  onChange={e => setPaiementForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1" autoFocus
                  className="w-full border-2 border-orange-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-orange-500 font-black text-orange-700" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Periode concernee</label>
                <input value={paiementForm.periode}
                  onChange={e => setPaiementForm(f => ({ ...f, periode: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Octobre 2026" />
                <p className="text-xs text-gray-400 mt-1">
                  Utile si tu payes en retard ou en avance
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Moyen de paiement</label>
                <select value={paiementForm.moyen}
                  onChange={e => setPaiementForm(f => ({ ...f, moyen: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {MOYENS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Note — optionnel</label>
                <input value={paiementForm.note}
                  onChange={e => setPaiementForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: avance sur salaire" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaiementForm(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Valider le paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
