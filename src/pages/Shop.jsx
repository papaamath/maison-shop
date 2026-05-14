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
  const [showSearch, setShowSearch] = useState(false);
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
          rupture: d.rupture || false,
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

      <div className="px-4 md:px-6 py-6 md:py-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="font-black text-2xl md:text-3xl">
            Boutique{" "}
            <span className="text-gray-400 font-normal text-base md:text-xl">
              ({filtres.length})
            </span>
          </h1>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden bg-gray-100 p-2 rounded-lg text-gray-600"
          >
            🔍
          </button>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher..."
            className="hidden md:block border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400 w-64 bg-white"
          />
        </div>

        {/* Recherche mobile */}
        {showSearch && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="md:hidden w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white mb-4"
            autoFocus
          />
        )}

        {/* Filtres catégories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategorie(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition whitespace-nowrap flex-shrink-0 ${
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
            <p className="text-sm mt-2">Essaie une autre catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {filtres.map(produit => (
              <div
                key={produit.id}
                onClick={() => navigate(`/product/${produit.id}`)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
              >
                {/* Image */}
                <div className="h-36 md:h-52 bg-gray-100 overflow-hidden relative">
                  {produit.image ? (
                    <img
                      src={produit.image}
                      alt={produit.nom}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl md:text-5xl">
                      📦
                    </div>
                  )}
                  {(produit.rupture || produit.stock === 0) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Rupture
                      </span>
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="p-3 md:p-4">
                  <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide hidden md:block">
                    {produit.categorie}
                  </p>
                  <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-2">{produit.nom}</h3>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1 hidden md:block">
                    {produit.description || "Voir les détails"}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm md:text-xl text-gray-900">
                      {formatPrix(produit.prix)}
                    </span>
                    <button
                      onClick={(e) => handleAjout(e, produit)}
                      disabled={produit.rupture || produit.stock === 0}
                      className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition flex-shrink-0 ${
                        produit.rupture || produit.stock === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-900 text-white hover:bg-gray-700"
                      }`}
                    >
                      {produit.rupture || produit.stock === 0 ? "Indispo" : "+ Panier"}
                    </button>
                  </div>

                  {produit.stock > 0 && produit.stock <= 5 && !produit.rupture && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Plus que {produit.stock} !
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          ✓ {toast} ajouté au panier
        </div>
      )}
    </div>
  );
}