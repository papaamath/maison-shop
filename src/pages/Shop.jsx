import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["Tous", "Vêtements", "Accessoires", "Chaussures", "Électronique", "Maison"];

export default function Shop() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous");
  const [search, setSearch] = useState("");
  const { addToCart } = useCart();
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function chargerProduits() {
      const snapshot = await getDocs(collection(db, "produits"));
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          nom: d.nom || d.Nom || "",
          prix: Number(d.prix || d.Prix || 0),
          categorie: d.categorie || d.Cathégorie || d.Categorie || "",
          description: d.description || d.Description || "",
          stock: Number(d.stock || d.Stock || 0),
          image: d.image || d.Image || "",
        };
      });
      setProduits(data);
      setLoading(false);
    }
    chargerProduits();
  }, []);

  function handleAjout(e, produit) {
    e.stopPropagation();
    addToCart(produit);
    setToast(produit.nom);
    setTimeout(() => setToast(null), 2000);
  }

  const filtres = produits.filter(p => {
    const matchCat = categorie === "Tous" || p.categorie === categorie;
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="px-6 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="font-black text-3xl">
            Boutique{" "}
            <span className="text-gray-400 font-normal text-xl">
              ({filtres.length} produits)
            </span>
          </h1>

          {/* Barre de recherche */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un produit..."
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400 w-64 bg-white"
          />
        </div>

        {/* Filtres catégories */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategorie(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                categorie === cat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-lg">
            Chargement des produits...
          </div>
        ) : filtres.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">😕</p>
            <p className="text-lg font-semibold">Aucun produit trouvé</p>
            <p className="text-sm mt-2">Essaie une autre catégorie ou un autre mot clé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtres.map(produit => (
              <div
                key={produit.id}
                onClick={() => navigate(`/product/${produit.id}`)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
              >
                {/* Image */}
                <div className="h-52 bg-gray-100 overflow-hidden">
                  {produit.image ? (
                    <img
                      src={produit.image}
                      alt={produit.nom}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                    {produit.categorie}
                  </p>
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{produit.nom}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {produit.description || "Cliquez pour voir les détails"}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="font-black text-xl text-gray-900">
                      {formatPrix(produit.prix)}
                    </span>
                    <button
                      onClick={(e) => handleAjout(e, produit)}
                      disabled={produit.stock === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        produit.stock === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-900 text-white hover:bg-gray-700"
                      }`}
                    >
                      {produit.stock === 0 ? "Rupture" : "+ Panier"}
                    </button>
                  </div>

                  {produit.stock > 0 && produit.stock <= 5 && (
                    <p className="text-xs text-red-500 mt-2">
                      ⚠️ Plus que {produit.stock} en stock !
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          ✓ {toast} ajouté au panier
        </div>
      )}
    </div>
  );
}