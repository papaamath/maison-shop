import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import ImageUpload from "../../components/ImageUpload";

const CATEGORIES = ["Vêtements", "Accessoires", "Chaussures", "Électronique", "Maison"];
const FORM_VIDE = { nom: "", prix: "", categorie: "Vêtements", description: "", stock: "", image: "" };

export default function AdminProducts() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  useEffect(() => { chargerProduits(); }, []);

  async function chargerProduits() {
    const snap = await getDocs(collection(db, "produits"));
    setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function ouvrirNouveauForm() {
    setEditing(null);
    setForm(FORM_VIDE);
    setShowForm(true);
  }

  function ouvrirEditForm(produit) {
    setEditing(produit.id);
    setForm({
      nom: produit.nom || "",
      prix: produit.prix || "",
      categorie: produit.categorie || "Vêtements",
      description: produit.description || "",
      stock: produit.stock || "",
      image: produit.image || "",
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const data = {
      nom: form.nom,
      prix: Number(form.prix),
      categorie: form.categorie,
      description: form.description,
      stock: Number(form.stock),
      image: form.image,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "produits", editing), data);
      } else {
        await addDoc(collection(db, "produits"), data);
      }
      await chargerProduits();
      setShowForm(false);
    } catch (err) {
      alert("Erreur lors de la sauvegarde.");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce produit ?")) return;
    await deleteDoc(doc(db, "produits", id));
    await chargerProduits();
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
          <Link to="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium">
            📦 Produits
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🛒 Commandes
          </Link>
          <Link to="/admin/promos" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🎟️ Promotions
          </Link>
          <Link to="/shop" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🌐 Voir la boutique
          </Link>
        </nav>
      </aside>

      {/* Contenu */}
      <main className="flex-1 ml-56 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-black text-2xl">Produits</h2>
            <p className="text-gray-400 text-sm mt-1">{produits.length} produit(s) au total</p>
          </div>
          <button
            onClick={ouvrirNouveauForm}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition"
          >
            + Nouveau produit
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              <span className="col-span-4">Produit</span>
              <span className="col-span-2">Catégorie</span>
              <span className="col-span-2">Prix</span>
              <span className="col-span-2">Stock</span>
              <span className="col-span-2">Actions</span>
            </div>

            {produits.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                Aucun produit. Ajoutez-en un !
              </div>
            ) : (
              produits.map((p, i) => (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 px-6 py-4 items-center ${i < produits.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                      ) : "📦"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.nom}</p>
                      <p className="text-gray-400 text-xs line-clamp-1">{p.description}</p>
                    </div>
                  </div>
                  <span className="col-span-2 text-sm text-gray-500">{p.categorie}</span>
                  <span className="col-span-2 font-semibold text-sm">{formatPrix(Number(p.prix || 0))}</span>
                  <span className={`col-span-2 text-sm font-medium ${
                    Number(p.stock) === 0 ? "text-red-500" :
                    Number(p.stock) <= 5 ? "text-yellow-500" : "text-green-600"
                  }`}>
                    {Number(p.stock) === 0 ? "Rupture ⚠️" : `${p.stock} unités`}
                  </span>
                  <div className="col-span-2 flex gap-2">
                    <button
                      onClick={() => ouvrirEditForm(p)}
                      className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl">
                {editing ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black text-2xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du produit</label>
                <input
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Boubou Brodé"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={form.prix}
                    onChange={e => setForm(f => ({ ...f, prix: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  placeholder="Description du produit..."
                />
              </div>

              <ImageUpload
                onUpload={url => setForm(f => ({ ...f, image: url }))}
                imageActuelle={form.image}
              />

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