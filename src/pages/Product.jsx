import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";

export default function Product() {
  const { id } = useParams();
  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function charger() {
      const snap = await getDoc(doc(db, "produits", id));
      if (snap.exists()) {
        setProduit({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }
    charger();
  }, [id]);

  function handleAjout() {
    for (let i = 0; i < qty; i++) addToCart(produit);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-32 text-gray-400">Chargement...</div>
    </div>
  );

  if (!produit) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-xl font-semibold mb-4">Produit introuvable</p>
        <button onClick={() => navigate("/shop")} className="bg-gray-900 text-white px-6 py-3 rounded-lg">
          Retour à la boutique
        </button>
      </div>
    </div>
  );

  const stockDisponible = Number(produit.stock || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Fil d'ariane */}
      <div className="max-w-5xl mx-auto px-6 py-4 text-sm text-gray-400">
        <span className="cursor-pointer hover:text-black" onClick={() => navigate("/")}>Accueil</span>
        <span className="mx-2">›</span>
        <span className="cursor-pointer hover:text-black" onClick={() => navigate("/shop")}>Boutique</span>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{produit.nom}</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Image */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden aspect-square flex items-center justify-center">
            {produit.image ? (
              <img
                src={produit.image}
                alt={produit.nom}
                className="w-full h-full object-cover"
              />
            ) : (
              <p className="text-8xl">📦</p>
            )}
          </div>

          {/* Infos */}
          <div className="flex flex-col justify-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              {produit.categorie}
            </p>
            <h1 className="font-black text-4xl mb-4 leading-tight">{produit.nom}</h1>
            <p className="font-black text-3xl text-gray-900 mb-6">
              {formatPrix(Number(produit.prix || 0))}
            </p>

            {/* Description complète */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
              <p className="text-gray-600 leading-relaxed text-sm">
                {produit.description || "Aucune description disponible."}
              </p>
            </div>

            {/* Stock */}
            <div className="mb-6">
              {stockDisponible === 0 ? (
                <span className="bg-red-100 text-red-600 text-sm font-semibold px-3 py-1 rounded-full">
                  Rupture de stock
                </span>
              ) : stockDisponible <= 5 ? (
                <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-full">
                  ⚠️ Plus que {stockDisponible} en stock !
                </span>
              ) : (
                <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                  ✓ En stock ({stockDisponible} disponibles)
                </span>
              )}
            </div>

            {/* Quantité */}
            {stockDisponible > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm text-gray-500">Quantité</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-lg font-bold transition"
                  >
                    −
                  </button>
                  <span className="px-5 py-2 font-semibold text-lg">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(stockDisponible, q + 1))}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-lg font-bold transition"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAjout}
                disabled={stockDisponible === 0}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {stockDisponible === 0 ? "Indisponible" : "🛍 Ajouter au panier"}
              </button>
              <button
                onClick={() => navigate("/shop")}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                ← Continuer les achats
              </button>
            </div>

            {/* Infos livraison */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🚚", text: "Livraison 24-48h" },
                { icon: "💳", text: "Wave & Orange Money" },
                { icon: "↩️", text: "Retour 30 jours" },
              ].map(item => (
                <div key={item.text} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-xs text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          ✓ {produit.nom} ajouté au panier !
        </div>
      )}
    </div>
  );
}