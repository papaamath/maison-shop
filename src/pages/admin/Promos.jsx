import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const FORM_VIDE = { code: "", type: "pourcentage", valeur: "", minCommande: "", actif: true };

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { chargerPromos(); }, []);

  async function chargerPromos() {
    const snap = await getDocs(collection(db, "promos"));
    setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db, "promos"), { code: form.code.toUpperCase(), type: form.type, valeur: Number(form.valeur), minCommande: Number(form.minCommande||0), actif: true, utilisations: 0 });
      await chargerPromos(); setShowForm(false); setForm(FORM_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function toggleActif(p) {
    await updateDoc(doc(db,"promos",p.id), { actif: !p.actif });
    await chargerPromos();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce code ?")) return;
    await deleteDoc(doc(db,"promos",id)); await chargerPromos();
  }

  const navLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/products", label: "Produits" },
    { to: "/admin/orders", label: "Commandes" },
    { to: "/admin/promos", label: "Promotions", active: true },
    { to: "/shop", label: "Voir la boutique" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-black text-white text-lg">MAISON<span className="text-red-500">.</span></h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">{menuOpen?"X":"≡"}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active?"bg-gray-700 text-white font-medium":"text-gray-400 hover:text-white"}`}>
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active?"bg-gray-700 text-white font-medium":"text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Promotions</h2>
              <p className="text-gray-400 text-sm mt-1">{promos.length} code(s) promo</p>
            </div>
            <button onClick={() => setShowForm(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Nouveau code
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : promos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
              <p className="text-3xl mb-3">Aucun code</p>
              <p className="font-semibold">Creez votre premier code promo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-xl tracking-widest">{p.code}</p>
                      <p className="text-red-600 font-semibold text-sm mt-0.5">
                        {p.type === "pourcentage" ? `${p.valeur}% de reduction` : `${formatPrix(p.valeur)} de reduction`}
                      </p>
                      {p.minCommande > 0 && <p className="text-gray-400 text-xs mt-0.5">Min: {formatPrix(p.minCommande)}</p>}
                      <p className="text-gray-400 text-xs mt-0.5">{p.utilisations||0} utilisation(s)</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button onClick={() => toggleActif(p)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${p.actif?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-medium">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Nouveau code promo</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Code promo</label>
                <input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase()}))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold tracking-widest uppercase"
                  placeholder="EX: PROMO20" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Type de reduction</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForm(f=>({...f,type:"pourcentage"}))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${form.type==="pourcentage"?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200"}`}>
                    % Pourcentage
                  </button>
                  <button type="button" onClick={() => setForm(f=>({...f,type:"fixe"}))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${form.type==="fixe"?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200"}`}>
                    FCFA Fixe
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Valeur {form.type==="pourcentage"?"(%)":"(FCFA)"}</label>
                <input type="number" value={form.valeur} onChange={e => setForm(f=>({...f,valeur:e.target.value}))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder={form.type==="pourcentage"?"20":"5000"} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Commande minimum (FCFA) - optionnel</label>
                <input type="number" value={form.minCommande} onChange={e => setForm(f=>({...f,minCommande:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="0" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                  {saving?"Creation...":"Creer le code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
