import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const STATUTS = ["En attente", "Confirme", "En livraison", "Livre", "Annule"];

// Seuls ces statuts acceptent l'enregistrement de versements
const STATUTS_VERSEMENT = ["Confirme"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirme": "bg-blue-100 text-blue-700",
  "En livraison": "bg-purple-100 text-purple-700",
  "Livre": "bg-green-100 text-green-700",
  "Annule": "bg-red-100 text-red-700",
};

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes", active: true },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
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

function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
}

// Etat de paiement d'une commande
function etatPaiement(cmd) {
  const total = Number(cmd.total || 0);
  const versements = cmd.versements || [];
  const paye = versements.reduce((a, v) => a + Number(v.montant || 0), 0);

  // Commande livree sans versement enregistre : reglee a la livraison
  if (versements.length === 0 && cmd.statut === "Livre") {
    return {
      total, paye: total, reste: 0, pct: 100,
      label: "Paye", couleur: "bg-green-100 text-green-700",
      regleALivraison: true,
    };
  }

  const reste = Math.max(0, total - paye);
  const pct = total > 0 ? Math.min(100, Math.round(paye / total * 100)) : 0;

  let label, couleur;
  if (paye === 0) {
    label = "Non paye";
    couleur = "bg-gray-100 text-gray-600";
  } else if (reste <= 0) {
    label = "Paye";
    couleur = "bg-green-100 text-green-700";
  } else {
    label = "Partiel";
    couleur = "bg-orange-100 text-orange-700";
  }

  return { total, paye, reste, pct, label, couleur, regleALivraison: false };
}

// La commande peut-elle recevoir un versement ?
function peutRecevoirVersement(cmd) {
  if (!STATUTS_VERSEMENT.includes(cmd.statut)) return false;
  return etatPaiement(cmd).reste > 0;
}

const MOYENS = ["Especes", "Wave", "Orange Money", "Free Money", "Virement", "Autre"];

export default function AdminOrders() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("Tous");
  const [filtrePaiement, setFiltrePaiement] = useState("Tous");
  const [recherche, setRecherche] = useState("");
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [showVersement, setShowVersement] = useState(null);
  const [versementForm, setVersementForm] = useState({ montant: "", moyen: "Especes", note: "" });
  const [saving, setSaving] = useState(false);

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
    const p = etatPaiement(commande);

    // Alerte si on livre une commande pas entierement payee
    if (nouveauStatut === "Livre" && p.reste > 0 && (commande.versements || []).length > 0) {
      const ok = confirm(
        `Cette commande n'est pas entierement payee.\n\n` +
        `Total : ${formatPrix(p.total)}\n` +
        `Paye : ${formatPrix(p.paye)}\n` +
        `Reste : ${formatPrix(p.reste)}\n\n` +
        `Une fois livree, tu ne pourras plus enregistrer de versement dessus.\n\n` +
        `Marquer quand meme comme livree ?`
      );
      if (!ok) return;
    }

    await updateDoc(doc(db, "commandes", id), { statut: nouveauStatut });

    if (nouveauStatut === "Livre" && ancienStatut !== "Livre") {
      for (const article of commande.articles || []) {
        try {
          const ref = doc(db, "produits", article.id);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            await updateDoc(ref, { stock: Math.max(0, Number(snap.data().stock || 0) - article.quantite) });
          }
        } catch {}
      }
    }

    if (nouveauStatut === "Annule" && ancienStatut === "Livre") {
      for (const article of commande.articles || []) {
        try {
          const ref = doc(db, "produits", article.id);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            await updateDoc(ref, { stock: Number(snap.data().stock || 0) + article.quantite });
          }
        } catch {}
      }
    }

    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: nouveauStatut } : c));
    if (selected?.id === id) setSelected(s => ({ ...s, statut: nouveauStatut }));
  }

  // ===== VERSEMENTS =====
  function ouvrirVersement(cmd) {
    const { reste } = etatPaiement(cmd);
    setVersementForm({ montant: String(reste), moyen: "Especes", note: "" });
    setShowVersement(cmd.id);
  }

  async function ajouterVersement(e) {
    e.preventDefault();
    const cmd = commandes.find(c => c.id === showVersement);
    if (!cmd) return;

    if (!STATUTS_VERSEMENT.includes(cmd.statut)) {
      alert("Les versements ne sont possibles que sur les commandes confirmees.");
      setShowVersement(null);
      return;
    }

    const montant = Number(versementForm.montant);
    const { reste } = etatPaiement(cmd);

    if (montant > reste) {
      if (!confirm(
        `Ce versement de ${formatPrix(montant)} depasse le reste a payer (${formatPrix(reste)}).\n\nContinuer quand meme ?`
      )) return;
    }

    setSaving(true);
    try {
      const nouveauVersement = {
        montant,
        moyen: versementForm.moyen,
        note: versementForm.note || "",
        date: new Date().toISOString(),
      };
      const versements = [...(cmd.versements || []), nouveauVersement];

      await updateDoc(doc(db, "commandes", cmd.id), { versements });

      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, versements } : c));
      if (selected?.id === cmd.id) setSelected(s => ({ ...s, versements }));

      setShowVersement(null);
      setVersementForm({ montant: "", moyen: "Especes", note: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  async function supprimerVersement(cmd, index) {
    if (!confirm("Supprimer ce versement ?")) return;
    try {
      const versements = (cmd.versements || []).filter((_, i) => i !== index);
      await updateDoc(doc(db, "commandes", cmd.id), { versements });
      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, versements } : c));
      if (selected?.id === cmd.id) setSelected(s => ({ ...s, versements }));
    } catch {
      alert("Erreur.");
    }
  }

  // ===== FILTRES =====
  const filtrees = commandes.filter(c => {
    const matchStatut = filtre === "Tous" || c.statut === filtre;
    const { label } = etatPaiement(c);
    const matchPaiement = filtrePaiement === "Tous" || label === filtrePaiement;

    const q = recherche.toLowerCase().trim();
    const matchRecherche = !q ||
      `${c.client?.prenom || ""} ${c.client?.nom || ""}`.toLowerCase().includes(q) ||
      (c.client?.telephone || "").includes(q) ||
      (c.client?.email || "").toLowerCase().includes(q);

    return matchStatut && matchPaiement && matchRecherche;
  });

  // Totaux
  const actives = commandes.filter(c => c.statut !== "Annule");
  const totalDu = actives.reduce((a, c) => a + Number(c.total || 0), 0);
  const totalEncaisse = actives.reduce((a, c) => a + etatPaiement(c).paye, 0);
  const totalRestant = actives.reduce((a, c) => a + etatPaiement(c).reste, 0);
  const nbImpayees = actives.filter(c => etatPaiement(c).reste > 0).length;

  const cmdVersement = commandes.find(c => c.id === showVersement);
  const etatCmdVersement = cmdVersement ? etatPaiement(cmdVersement) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Commandes</h2>
              <p className="text-gray-400 text-sm mt-1">{commandes.length} commande(s)</p>
            </div>
          </div>

          {/* Cartes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total commandes</p>
              <p className="font-black text-lg text-gray-800">{formatPrix(totalDu)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-600 text-xs font-bold uppercase mb-1">Encaisse</p>
              <p className="font-black text-lg text-green-700">{formatPrix(totalEncaisse)}</p>
            </div>
            <div className={`${totalRestant > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"} border rounded-xl p-4`}>
              <p className={`${totalRestant > 0 ? "text-orange-600" : "text-gray-400"} text-xs font-bold uppercase mb-1`}>
                Reste a encaisser
              </p>
              <p className={`font-black text-lg ${totalRestant > 0 ? "text-orange-700" : "text-gray-500"}`}>
                {formatPrix(totalRestant)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Commandes impayees</p>
              <p className={`font-black text-lg ${nbImpayees > 0 ? "text-orange-600" : "text-gray-800"}`}>
                {nbImpayees}
              </p>
            </div>
          </div>

          {/* Recherche */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <input value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher par nom, telephone ou email..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
          </div>

          {/* Filtres statut */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {["Tous", ...STATUTS].map(s => (
              <button key={s} onClick={() => setFiltre(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${filtre === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                {s} {s !== "Tous" && `(${commandes.filter(c => c.statut === s).length})`}
              </button>
            ))}
          </div>

          {/* Filtres paiement */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {["Tous", "Non paye", "Partiel", "Paye"].map(p => (
              <button key={p} onClick={() => setFiltrePaiement(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${filtrePaiement === p ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"}`}>
                {p === "Tous" ? "Tous paiements" : p}
                {p !== "Tous" && ` (${commandes.filter(c => etatPaiement(c).label === p).length})`}
              </button>
            ))}
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : filtrees.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
              Aucune commande ne correspond.
            </div>
          ) : (
            <div className="space-y-3">
              {filtrees.map(cmd => {
                const p = etatPaiement(cmd);
                const ouvert = selected?.id === cmd.id;
                const versementPossible = peutRecevoirVersement(cmd);
                const aDesVersements = (cmd.versements || []).length > 0;

                return (
                  <div key={cmd.id}
                    className={`bg-white rounded-xl border p-4 transition ${ouvert ? "border-blue-300 shadow-sm" : "border-gray-200 hover:shadow-sm"}`}>

                    <div className="cursor-pointer" onClick={() => setSelected(ouvert ? null : cmd)}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                          <p className="text-gray-400 text-xs">{cmd.client?.telephone}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{formatDate(cmd.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-sm">{formatPrix(p.total)}</p>
                          <p className="text-gray-400 text-xs">{cmd.articles?.length} article(s)</p>
                        </div>
                      </div>

                      {/* Etat de paiement */}
                      {cmd.statut !== "Annule" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.couleur}`}>
                              {p.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {p.regleALivraison ? (
                                <span className="text-green-600">Regle a la livraison</span>
                              ) : (
                                <>
                                  {formatPrix(p.paye)} paye
                                  {p.reste > 0 && (
                                    <span className="text-orange-600 font-bold">
                                      {" "}— reste {formatPrix(p.reste)}
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                          {!p.regleALivraison && (
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${p.reste <= 0 ? "bg-green-500" : "bg-orange-500"}`}
                                style={{ width: `${p.pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 line-clamp-1 flex-1">
                          {cmd.articles?.map(a => a.nom).join(", ")}
                        </p>
                        <select value={cmd.statut}
                          onChange={e => { e.stopPropagation(); changerStatut(cmd.id, e.target.value, cmd); }}
                          onClick={e => e.stopPropagation()}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer flex-shrink-0 ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}>
                          {STATUTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Bouton versement — uniquement sur les commandes confirmees */}
                    {versementPossible && (
                      <button onClick={() => ouvrirVersement(cmd)}
                        className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition">
                        + Enregistrer un versement
                      </button>
                    )}

                    {/* Rappel si en attente */}
                    {cmd.statut === "En attente" && (
                      <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">
                        Confirme la commande pour pouvoir enregistrer des versements
                      </p>
                    )}

                    {/* Detail */}
                    {ouvert && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Client</p>
                            <p className="font-medium text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                            <p className="text-gray-500 text-sm">{cmd.client?.email}</p>
                            <p className="text-gray-500 text-sm">{cmd.client?.telephone}</p>
                            <p className="text-gray-500 text-sm mt-1">
                              {cmd.modeLivraison === "retrait"
                                ? "Retrait en magasin"
                                : `${cmd.client?.adresse || ""}, ${cmd.client?.ville || ""}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Articles</p>
                            {cmd.articles?.map((a, i) => (
                              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                                <span>
                                  {a.nom}
                                  {a.taille && <span className="text-orange-500 text-xs"> ({a.taille})</span>}
                                  {" "}x{a.quantite}
                                </span>
                                <span className="font-medium">{formatPrix(a.prix * a.quantite)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-black text-base mt-2">
                              <span>Total</span><span>{formatPrix(cmd.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Versements */}
                        {cmd.statut !== "Annule" && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">
                                Versements ({(cmd.versements || []).length})
                              </p>
                              {versementPossible && (
                                <button onClick={() => ouvrirVersement(cmd)}
                                  className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-100">
                                  + Versement
                                </button>
                              )}
                            </div>

                            {!aDesVersements ? (
                              <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">
                                {p.regleALivraison
                                  ? "Commande reglee a la livraison"
                                  : "Aucun versement enregistre"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {cmd.versements.map((v, i) => (
                                  <div key={i}
                                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">
                                        {formatPrix(v.montant)}
                                        <span className="text-gray-400 font-normal text-xs ml-2">
                                          {v.moyen}
                                        </span>
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {formatDate(v.date)}
                                        {v.note && ` — ${v.note}`}
                                      </p>
                                    </div>
                                    {cmd.statut === "Confirme" && (
                                      <button onClick={() => supprimerVersement(cmd, i)}
                                        className="text-gray-300 hover:text-red-500 transition text-lg px-2">
                                        x
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Recap */}
                            {aDesVersements && (
                              <div className="mt-3 bg-gray-900 rounded-xl p-4 text-white">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Total</p>
                                    <p className="font-black text-sm">{formatPrix(p.total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Paye</p>
                                    <p className="font-black text-sm text-green-400">{formatPrix(p.paye)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400 text-xs mb-1">Reste</p>
                                    <p className={`font-black text-sm ${p.reste > 0 ? "text-orange-400" : "text-green-400"}`}>
                                      {formatPrix(p.reste)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Avertissement livree impayee */}
                            {cmd.statut === "Livre" && aDesVersements && p.reste > 0 && (
                              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                                <p className="text-sm font-bold text-orange-700">
                                  Livree avec {formatPrix(p.reste)} impaye
                                </p>
                                <p className="text-xs text-orange-600 mt-0.5">
                                  Repasse la commande en "Confirme" pour enregistrer le solde
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL VERSEMENT */}
      {showVersement && cmdVersement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Nouveau versement</h3>
              <button onClick={() => setShowVersement(null)} className="text-gray-400 text-xl">X</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="font-bold text-sm">
                {cmdVersement.client?.prenom} {cmdVersement.client?.nom}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-gray-400 text-xs">Total</p>
                  <p className="font-black text-sm">{formatPrix(etatCmdVersement.total)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Deja paye</p>
                  <p className="font-black text-sm text-green-600">{formatPrix(etatCmdVersement.paye)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Reste</p>
                  <p className="font-black text-sm text-orange-600">{formatPrix(etatCmdVersement.reste)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={ajouterVersement} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant verse (FCFA)</label>
                <input type="number" value={versementForm.montant}
                  onChange={e => setVersementForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1" autoFocus
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-green-500 font-black text-green-700" />

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button type="button"
                    onClick={() => setVersementForm(f => ({ ...f, montant: String(etatCmdVersement.reste) }))}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                    Tout le reste
                  </button>
                  <button type="button"
                    onClick={() => setVersementForm(f => ({ ...f, montant: String(Math.round(etatCmdVersement.reste / 2)) }))}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                    La moitie
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Moyen de paiement</label>
                <select value={versementForm.moyen}
                  onChange={e => setVersementForm(f => ({ ...f, moyen: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {MOYENS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Note — optionnel</label>
                <input value={versementForm.note}
                  onChange={e => setVersementForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: remis par son frere" />
              </div>

              {versementForm.montant && (
                <div className={`border rounded-xl p-3 ${
                  Number(versementForm.montant) >= etatCmdVersement.reste
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-200"
                }`}>
                  <p className={`text-sm font-bold ${
                    Number(versementForm.montant) >= etatCmdVersement.reste
                      ? "text-green-700" : "text-orange-700"
                  }`}>
                    {Number(versementForm.montant) >= etatCmdVersement.reste
                      ? "La commande sera entierement payee"
                      : `Il restera ${formatPrix(etatCmdVersement.reste - Number(versementForm.montant))} a payer`}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowVersement(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Valider le versement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
