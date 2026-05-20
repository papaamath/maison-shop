import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";
import { useNavigate, useSearchParams } from "react-router-dom";

const CATEGORIES = [
  "Tous",
  "Sport",
  "High-Tech",
  "Electricite",
  "Montres",
  "Sacs",
  "Toilettes",
  "Papeterie",
  "Accessoires",
];

export default function Shop() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState("Tous");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { addToCart } = useCart();

  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat) setCategorie(cat);
  }, [searchParams]);

  useEffect(() => {
    async function chargerProduits() {
      const snapshot = await getDocs(collection(db, "produits"));

      const data = snapshot.docs.map((doc) => {
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

  const filtres = produits.filter((p) => {
    const matchCat =
      categorie === "Tous" || p.categorie === categorie;

    const matchSearch =
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />

      <div className="px-4 md:px-6 py-6 md:py-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="font-black text-2xl md:text-4xl text-blue-950">
            Boutique
            <span className="text-orange-500 font-bold text-base md:text-xl ml-2">
              ({filtres.length})
            </span>
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden bg-white border border-blue-100 p-2 rounded-xl text-blue-900 shadow-sm"
            >
              🔍
            </button>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="hidden md:block border border-blue-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 w-64 bg-white shadow-sm"
            />
          </div>
        </div>

        {showSearch && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="md:hidden w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white mb-4 shadow-sm"
            autoFocus
          />
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategorie(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition whitespace-nowrap flex-shrink-0 ${
                categorie === cat
                  ? "bg-gradient-to-r from-blue-950 to-orange-500 text-white border-transparent shadow-lg"
                  : "bg-white text-blue-900 border-blue-100 hover:border-orange-300 hover:text-orange-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-blue-900 text-lg">
            <p className="text-5xl mb-4 animate-bounce">🛍️</p>
            Chargement des produits...
          </div>
        ) : filtres.length === 0 ? (
          <div className="text-center py-20 text-blue-900">
            <p className="text-5xl mb-4">😕</p>

            <p className="text-2xl font-black">
              Aucun produit trouve
            </p>

            <p className="text-sm mt-2 text-gray-500">
              Essaie une autre categorie
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filtres.map((produit) => (
              <div
                key={produit.id}
                onClick={() =>
                  navigate(`/product/${produit.id}`)
                }
                className="bg-white rounded-2xl border border-blue-100 overflow-hidden hover:-translate-y-1 transition-transform duration-200 cursor-pointer shadow-sm hover:shadow-2xl"
              >
                <div className="h-36 md:h-48 bg-blue-50 overflow-hidden relative">
                  {produit.image ? (
                    <img
                      src={produit.image}
                      alt={produit.nom}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                      Aucune image
                    </div>
                  )}

                  {(produit.rupture ||
                    produit.stock === 0) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-blue-950 text-xs font-bold px-3 py-1 rounded-full">
                        Rupture de stock
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 md:p-4">
                  <p className="text-xs text-orange-500 mb-0.5 hidden md:block font-semibold">
                    {produit.categorie}
                  </p>

                  <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2 text-blue-950">
                    {produit.nom}
                  </h3>

                  <p className="text-xs text-gray-500 mb-3 line-clamp-1 hidden md:block">
                    {produit.description ||
                      "Voir les details"}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm md:text-lg text-orange-500">
                      {formatPrix(produit.prix)}
                    </span>

                    <button
                      onClick={(e) =>
                        handleAjout(e, produit)
                      }
                      disabled={
                        produit.rupture ||
                        produit.stock === 0
                      }
                      className={`px-2 md:px-4 py-1.5 rounded-xl text-xs md:text-sm font-bold transition flex-shrink-0 ${
                        produit.rupture ||
                        produit.stock === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-950 text-white hover:bg-blue-900 shadow-md"
                      }`}
                    >
                      {produit.rupture ||
                      produit.stock === 0
                        ? "Indispo"
                        : "+ Panier"}
                    </button>
                  </div>

                  {produit.stock > 0 &&
                    produit.stock <= 5 &&
                    !produit.rupture && (
                      <p className="text-xs text-orange-500 mt-1 font-bold">
                        🔥 Plus que {produit.stock} en stock
                      </p>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-950 text-white px-6 py-3 rounded-2xl text-sm font-medium z-50 shadow-2xl">
          ✓ {toast} ajoute au panier
        </div>
      )}
    </div>
  );
}