import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const FORM_VIDE = {
  code: "",
  type: "pourcentage",
  valeur: "",
  minCommande: "",
  actif: true,
};

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  useEffect(() => { chargerPromos(); }, []);

  async function chargerPromos() {
    const snap = await getDocs(collection(db, "promos"));
    setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "promos"), {
        code: form.code.toUpperCase(),
        type: form.type,
        valeur: Number(form.valeur),
        minCommande: Number(form.minCommande || 0),
        actif: true,
        utilisations: 0,
      });
      await chargerPromos();
      setShowForm(false);
      setForm(FORM_VIDE);
    } catch (err) {
      alert("Erreur lors de la sauvegarde.");
    }
    setSaving(false);
  }

  async function toggleActif(promo) {
    await updateDoc(doc(db, "promos", promo.id), { actif: !promo.actif });
    await chargerPromos();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await deleteDoc(doc(db, "promos", id));
    await chargerPromos();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 min-h-screen flex flex-col fixed left-0 top-0">
        <div className="p-6 border-b border-gray-700">
          <h1 className="font-black text-white text-xl">MAISON<span className="text-red-500">.</span></h1>
          <p className="text-gray-400 text-xs mt-1">Administration</p>
        </div>
        <nav className="p-4 flex-1 space-y-1">
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            📊 Dashboard
          </Link>
          <Link to="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            📦 Produits
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🛒 Commandes
          </Link>
          <Link to="/admin/promos" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium">
            🎟️ Promotions
          </Link>
          <Link to="/shop" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🌐 Voir la boutique
          </Link>
        </nav>
      </aside>

      <main className="flex-1 ml-56 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-black text-2xl">Promotions</h2>
            <p className="text-gray-400 text-sm mt-1">{promos.length} code(s) promo</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition"
          >
            + Nouveau code
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : promos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🎟️</p>
            <p className="font-semibold">Aucun code promo</p>
            <p className="text-sm mt-1">Créez votre premier code promo !</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              <span className="col-span-3">Code</span>
              <span className="col-span-2">Réduction</span>
              <span className="col-span-2">Min. commande</span>
              <span className="col-span-2">Utilisations</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-1">Action</span>
            </div>
            {promos.map((p, i) => (
              <div key={p.id} className={`grid grid-cols-12 px-6 py-4 items-center ${i < promos.length - 1 ? "border-b border-gray-100" : ""}`}>
                <span className="col-span-3 font-black text-lg tracking-widest text-gray-900">
                  {p.code}
                </span>
                <span className="col-span-2 font-semibold text-red-600">
                  {p.type === "pourcentage" ? `${p.valeur}%` : formatPrix(p.valeur)}
                </span>
                <span className="col-span-2 text-sm text-gray-500">
                  {p.minCommande > 0 ? formatPrix(p.minCommande) : "Aucun"}
                </span>
                <span className="col-span-2 text-sm text-gray-500">
                  {p.utilisations || 0} fois
                </span>
                <div className="col-span-2">
                  <button
                    onClick={() => toggleActif(p)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                      p.actif
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {p.actif ? "✅ Actif" : "⏸ Inactif"}
                  </button>
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl">Nouveau code promo</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black text-2xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Code promo</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold tracking-widest uppercase"
                  placeholder="EX: PROMO20"
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de réduction</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: "pourcentage" }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                      form.type === "pourcentage"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    % Pourcentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: "fixe" }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                      form.type === "fixe"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    FCFA Fixe
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Valeur {form.type === "pourcentage" ? "(%)" : "(FCFA)"}
                </label>
                <input
                  type="number"
                  value={form.valeur}
                  onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))}
                  required
                  min="1"
                  max={form.type === "pourcentage" ? "100" : undefined}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder={form.type === "pourcentage" ? "20" : "5000"}
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Commande minimum (FCFA) — optionnel</label>
                <input
                  type="number"
                  value={form.minCommande}
                  onChange={e => setForm(f => ({ ...f, minCommande: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {saving ? "Création..." : "Créer le code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}