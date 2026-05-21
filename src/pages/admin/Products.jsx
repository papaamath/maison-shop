import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import ImageUpload from "../../components/ImageUpload";

const CATEGORIES = [
  "Sport",
  "Maillot",
  "Electronique",
  "Montres",
  "Sacs",
  "Toilettes",
  "Femme",
  "Papeterie",
  "Accessoires",
];
const FORM_VIDE = { nom: "", prix: "", categorie: "Sport", description: "", stock: "", image: "", rupture: false };

export default function AdminProducts() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { chargerProduits(); }, []);

  async function chargerProduits() {
    const snap = await getDocs(collection(db, "produits"));
    setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function ouvrirNouveauForm() { setEditing(null); setForm(FORM_VIDE); setShowForm(true); }

  function ouvrirEditForm(p) {
    setEditing(p.id);
    setForm({ nom: p.nom||"", prix: p.prix||"", categorie: p.categorie||"Sport", description: p.description||"", stock: p.rupture?"": (p.stock||""), image: p.image||"", rupture: p.rupture||Number(p.stock)===0 });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const data = { nom: form.nom, prix: Number(form.prix), categorie: form.categorie, description: form.description, stock: form.rupture?0:Number(form.stock), image: form.image, rupture: form.rupture };
    try {
      if (editing) await updateDoc(doc(db,"produits",editing), data);
      else await addDoc(collection(db,"produits"), data);
      await chargerProduits(); setShowForm(false);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ?")) return;
    await deleteDoc(doc(db,"produits",id)); await chargerProduits();
  }

  async function toggleRupture(p) {
    await updateDoc(doc(db,"produits",p.id), { rupture: !p.rupture, stock: p.rupture?(p.stockAvant||0):0, stockAvant: p.rupture?0:p.stock });
    await chargerProduits();
  }

  const navLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/products", label: "Produits", active: true },
    { to: "/admin/orders", label: "Commandes" },
    { to: "/admin/promos", label: "Promotions" },
    { to: "/admin/caisse", label: "Caisse" },
    { to: "/shop", label: "Voir la boutique" },
    { to: "/admin/associes", label: "Associes" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar mobile */}
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-black text-white text-lg">MAISON<span className="text-red-500">.</span></h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">{menuOpen ? "X" : "≡"}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Produits</h2>
              <p className="text-gray-400 text-sm mt-1">{produits.length} produit(s)</p>
            </div>
            <button onClick={ouvrirNouveauForm} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Nouveau
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <div className="space-y-3">
              {produits.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">Aucun produit.</div>
              ) : produits.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.image ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Photo</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{p.nom}</p>
                          <p className="text-gray-400 text-xs">{p.categorie}</p>
                        </div>
                        <p className="font-black text-sm text-gray-900 flex-shrink-0">{formatPrix(Number(p.prix||0))}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {p.rupture || Number(p.stock)===0 ? (
                          <span className="text-red-500 text-xs font-bold">Rupture de stock</span>
                        ) : (
                          <span className={`text-xs font-medium ${Number(p.stock)<=5?"text-orange-500":"text-green-600"}`}>{p.stock} unites</span>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => ouvrirEditForm(p)} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">Editer</button>
                          <button onClick={() => toggleRupture(p)} className={`px-3 py-1 rounded-lg text-xs font-medium ${p.rupture||Number(p.stock)===0?"bg-green-50 text-green-600":"bg-orange-50 text-orange-600"}`}>
                            {p.rupture||Number(p.stock)===0?"Reappro":"Rupture"}
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-medium">Suppr</button>
                        </div>
                      </div>
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
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">{editing ? "Modifier" : "Nouveau produit"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du produit</label>
                <input value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="Ex: Ballon de football" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix (FCFA)</label>
                  <input type="number" value={form.prix} onChange={e => setForm(f=>({...f,prix:e.target.value}))} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="25000" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Stock</label>
                  <input type="number" value={form.rupture?"":form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))}
                    disabled={form.rupture} required={!form.rupture}
                    className={`w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 ${form.rupture?"bg-gray-100":""}`} placeholder="10" />
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <input type="checkbox" id="rupture" checked={form.rupture}
                  onChange={e => setForm(f=>({...f,rupture:e.target.checked,stock:e.target.checked?"":f.stock}))}
                  className="w-4 h-4 mt-0.5 accent-red-600" />
                <label htmlFor="rupture" className="text-sm font-bold text-red-700 cursor-pointer">
                  Mettre en rupture de stock
                </label>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={form.categorie} onChange={e => setForm(f=>({...f,categorie:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none" placeholder="Description du produit..." />
              </div>
              <ImageUpload onUpload={url => setForm(f=>({...f,image:url}))} imageActuelle={form.image} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
