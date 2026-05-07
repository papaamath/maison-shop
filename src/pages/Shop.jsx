import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";

const CATEGORIES = ["Tous", "Vêtements", "Accessoires", "Chaussures"];

export default function Shop() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous");
  const { addToCart } = useCart();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function chargerProduits() {
      const snapshot = await getDocs(collection(db, "produits"));
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          nom: d.nom || d.Nom || "",
          prix: d.prix || d.Prix || 0,
          categorie: d.categorie || d.Cathégorie || d.Categorie || "",
          description: d.description || d.Description || "",
          stock: d.stock || d.Stock || 0,
          image: d.image || d.Image || "",
        };
      });
      setProduits(data);
      setLoading(false);
    }
    chargerProduits();
  }, []);

  function handleAjout(produit) {
    addToCart(produit);
    setToast(produit.nom);
    setTimeout(() => setToast(null), 2000);
  }

  const filtres = produits.filter(p =>
    categorie === "Tous" || p.categorie === categorie
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="px-6 py-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <h1 className="font-black text-3xl">
            Boutique <span className="text-gray-400 font-normal text-xl">({filtres.length} produits)</span>
          </h1>
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-lg">
            Chargement des produits...
          </div>
        ) : filtres.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-lg">
            Aucun produit trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtres.map(produit => (
              <div
                key={produit.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="h-52 bg-gray-100 overflow-hidden">
                  {produit.image ? (
                    <img
                      src={produit.image}
                      alt={produit.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                    {produit.categorie}
                  </p>
                  <h3 className="font-bold text-lg mb-1">{produit.nom}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {produit.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xl text-gray-900">
                      {formatPrix(produit.prix)}
                    </span>
                    <button
                      onClick={() => handleAjout(produit)}
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          ✓ {toast} ajouté au panier
        </div>
      )}
    </div>
  );
}