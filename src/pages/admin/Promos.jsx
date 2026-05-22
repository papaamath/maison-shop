import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import emailjs from "@emailjs/browser";

const FORM_VIDE = {
  code: "",
  type: "pourcentage",
  valeur: "",
  minCommande: "",
  actif: true,
  portee: "boutique",
  produitId: "",
  produitNom: "",
  dateExpiration: "",
};

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions", active: true },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0">
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
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
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

function statutPromo(p) {
  if (!p.actif) return { label: "Inactif", color: "bg-gray-100 text-gray-500" };
  if (p.dateExpiration && new Date(p.dateExpiration) < new Date()) {
    return { label: "Expire", color: "bg-red-100 text-red-600" };
  }
  return { label: "Actif", color: "bg-green-100 text-green-700" };
}

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [envoi, setEnvoi] = useState(null);

  useEffect(() => { chargerPromos(); chargerProduits(); }, []);

  async function chargerPromos() {
    const snap = await getDocs(collection(db, "promos"));
    setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function chargerProduits() {
    const snap = await getDocs(collection(db, "produits"));
    setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const produitSelectionne = form.portee === "produit" && form.produitId
        ? produits.find(p => p.id === form.produitId)
        : null;

      await addDoc(collection(db, "promos"), {
        code: form.code.toUpperCase(),
        type: form.type,
        valeur: Number(form.valeur),
        minCommande: Number(form.minCommande || 0),
        actif: true,
        utilisations: 0,
        uneFoisParClient: true,
        clientsUtilises: [],
        portee: form.portee,
        produitId: form.portee === "produit" ? form.produitId : null,
        produitNom: produitSelectionne ? (produitSelectionne.nom || "") : null,
        dateExpiration: form.dateExpiration || null,
      });
      await chargerPromos();
      setShowForm(false);
      setForm(FORM_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function toggleActif(p) {
    await updateDoc(doc(db, "promos", p.id), { actif: !p.actif });
    await chargerPromos();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce code ?")) return;
    await deleteDoc(doc(db, "promos", id));
    await chargerPromos();
  }

  async function envoyerPromoParEmail(promo) {
    if (!confirm(`Envoyer ce code promo a tous les clients inscrits ?`)) return;
    setEnvoi(promo.id);
    try {
      const clientsSnap = await getDocs(collection(db, "clients"));
      const clients = clientsSnap.docs.map(d => d.data());

      if (clients.length === 0) {
        alert("Aucun client inscrit pour l'instant.");
        setEnvoi(null);
        return;
      }

      const reduction = promo.type === "pourcentage"
        ? `${promo.valeur}% de reduction`
        : `${Number(promo.valeur).toLocaleString("fr-SN")} FCFA de reduction`;

      const portee = promo.portee === "produit"
        ? `Produit : ${promo.produitNom}`
        : "Toute la boutique";

      const dateExp = promo.dateExpiration
        ? new Date(promo.dateExpiration).toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" })
        : "Pas de date limite";

      let envoyes = 0;
      for (const client of clients) {
        if (!client.email) continue;
        try {
          await emailjs.send(
            "service_hucapuj",
            "template_8bozs4b",
            {
              client_email: client.email,
              client_prenom: client.prenom || "Client",
              code_promo: promo.code,
              reduction,
              portee,
              date_expiration: dateExp,
            },
            "GrsANLfPqrMFqvCHG"
          );
          envoyes++;
        } catch (err) {
          console.error("Erreur envoi email:", err);
        }
      }
      alert(`Email envoye a ${envoyes} client(s) avec succes !`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi.");
    }
    setEnvoi(null);
  }

  function formatDateExp(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Promotions</h2>
              <p className="text-gray-400 text-sm mt-1">{promos.length} code(s) promo</p>
            </div>
            <button onClick={() => { setShowForm(true); setForm(FORM_VIDE); }}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Nouveau code
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : promos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
              <p className="text-3xl mb-3">🎟️</p>
              <p className="font-semibold">Aucun code promo</p>
              <p className="text-sm mt-1">Creez votre premier code promo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map(p => {
                const statut = statutPromo(p);
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="font-black text-2xl tracking-widest">{p.code}</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${statut.color}`}>
                            {statut.label}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.portee === "produit" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {p.portee === "produit" ? `Produit : ${p.produitNom}` : "Toute la boutique"}
                          </span>
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                            1 fois par client
                          </span>
                        </div>

                        <p className="text-red-600 font-semibold text-sm">
                          {p.type === "pourcentage" ? `${p.valeur}% de reduction` : `${formatPrix(p.valeur)} de reduction`}
                        </p>

                        {p.minCommande > 0 && (
                          <p className="text-gray-400 text-xs mt-0.5">Commande min : {formatPrix(p.minCommande)}</p>
                        )}

                        {p.dateExpiration && (
                          <p className={`text-xs mt-0.5 font-medium ${new Date(p.dateExpiration) < new Date() ? "text-red-500" : "text-gray-500"}`}>
                            Expire le : {formatDateExp(p.dateExpiration)}
                            {new Date(p.dateExpiration) < new Date() ? " (Expire)" : ""}
                          </p>
                        )}

                        <p className="text-gray-400 text-xs mt-1">
                          {p.utilisations || 0} utilisation(s) — {p.clientsUtilises?.length || 0} client(s) ont utilise ce code
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <button onClick={() => toggleActif(p)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${p.actif ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {p.actif ? "Desactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => envoyerPromoParEmail(p)}
                          disabled={envoi === p.id}
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-100 disabled:opacity-50">
                          {envoi === p.id ? "Envoi..." : "Envoyer par email"}
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-red-100">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal creation promo */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Nouveau code promo</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">

              <div>
                <label className="text-sm text-gray-500 block mb-1">Code promo</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold tracking-widest uppercase"
                  placeholder="EX: PROMO20" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de reduction</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForm(f => ({ ...f, type: "pourcentage" }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${form.type === "pourcentage" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    % Pourcentage
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, type: "fixe" }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${form.type === "fixe" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    FCFA Fixe
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Valeur {form.type === "pourcentage" ? "(%)" : "(FCFA)"}
                </label>
                <input type="number" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder={form.type === "pourcentage" ? "20" : "5000"} />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Commande minimum (FCFA) — optionnel</label>
                <input type="number" value={form.minCommande} onChange={e => setForm(f => ({ ...f, minCommande: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="0" />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Date d'expiration — optionnel</label>
                <input type="date" value={form.dateExpiration}
                  onChange={e => setForm(f => ({ ...f, dateExpiration: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
                <p className="text-xs text-gray-400 mt-1">Laissez vide si pas de date limite</p>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-2">Ce code est valable pour :</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm(f => ({ ...f, portee: "boutique", produitId: "" }))}
                    className={`p-4 rounded-xl border-2 text-left transition ${form.portee === "boutique" ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className="text-2xl mb-1">🛍️</p>
                    <p className="font-bold text-sm">Toute la boutique</p>
                    <p className="text-xs text-gray-400 mt-0.5">Valable sur tous les articles</p>
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, portee: "produit" }))}
                    className={`p-4 rounded-xl border-2 text-left transition ${form.portee === "produit" ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className="text-2xl mb-1">📦</p>
                    <p className="font-bold text-sm">Un seul article</p>
                    <p className="text-xs text-gray-400 mt-0.5">Valable sur un produit specifique</p>
                  </button>
                </div>
              </div>

              {form.portee === "produit" && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <label className="text-sm font-bold text-purple-700 block mb-2">Choisir le produit</label>
                  <select value={form.produitId}
                    onChange={e => setForm(f => ({ ...f, produitId: e.target.value }))}
                    required
                    className="w-full border border-purple-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 bg-white">
                    <option value="">-- Selectionner un produit --</option>
                    {produits.map(p => (
                      <option key={p.id} value={p.id}>{p.nom} — {formatPrix(Number(p.prix || 0))}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <p className="text-sm font-bold text-orange-700">Utilisable une seule fois par client</p>
                  <p className="text-xs text-orange-500">Cette option est activee automatiquement</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                  {saving ? "Creation..." : "Creer le code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
