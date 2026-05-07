import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";
import { useCart } from "../context/CartContext";

export default function Home() {
  const [produits, setProduits] = useState([]);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function charger() {
      const snap = await getDocs(collection(db, "produits"));
      const data = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          nom: p.nom || p.Nom || "",
          prix: Number(p.prix || p.Prix || 0),
          categorie: p.categorie || p.Cathégorie || "",
          image: p.image || p.Image || "",
          stock: Number(p.stock || p.Stock || 0),
        };
      });
      setProduits(data.slice(0, 4));
    }
    charger();
  }, []);

  function handleAjout(e, produit) {
    e.stopPropagation();
    addToCart(produit);
    setToast(produit.nom);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 opacity-90" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6">
              ✨ Nouvelle collection
            </span>
            <h1 className="font-black text-5xl md:text-6xl text-white leading-tight mb-6">
              Tout ce dont<br/>
              <span className="text-red-400">vous avez besoin</span><br/>
              en un clic.
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-md">
              Vêtements, accessoires, électronique et plus encore. Livraison rapide partout au Sénégal.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={() => navigate("/shop")}
                className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition"
              >
                Découvrir la boutique →
              </button>
              <button
                onClick={() => navigate("/shop")}
                className="border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition"
              >
                Voir les offres
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex md:flex-col gap-4">
            {[
              { label: "Produits disponibles", value: "100+" },
              { label: "Clients satisfaits", value: "500+" },
              { label: "Livraison", value: "24-48h" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-32">
                <p className="font-black text-3xl text-white">{s.value}</p>
                <p className="text-gray-300 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avantages */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🚚", title: "Livraison rapide", desc: "24-48h à Dakar" },
            { icon: "💳", title: "Paiement flexible", desc: "Wave, Orange Money" },
            { icon: "↩️", title: "Retours faciles", desc: "30 jours offerts" },
            { icon: "🔒", title: "100% sécurisé", desc: "Paiement à la livraison" },
          ].map(a => (
            <div key={a.title} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="text-3xl">{a.icon}</span>
              <div>
                <p className="font-bold text-sm">{a.title}</p>
                <p className="text-gray-400 text-xs">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catégories */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-black text-3xl mb-2">Nos catégories</h2>
          <p className="text-gray-400">Trouvez exactement ce que vous cherchez</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { nom: "Vêtements", icon: "👕", color: "bg-blue-50 hover:bg-blue-100" },
            { nom: "Chaussures", icon: "👟", color: "bg-green-50 hover:bg-green-100" },
            { nom: "Accessoires", icon: "👜", color: "bg-yellow-50 hover:bg-yellow-100" },
            { nom: "Maison", icon: "🏠", color: "bg-red-50 hover:bg-red-100" },
          ].map(cat => (
            <button
              key={cat.nom}
              onClick={() => navigate(`/shop?cat=${cat.nom}`)}
              className={`${cat.color} rounded-2xl p-6 text-center transition cursor-pointer border border-transparent hover:border-gray-200`}
            >
              <p className="text-4xl mb-3">{cat.icon}</p>
              <p className="font-bold text-gray-800">{cat.nom}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Produits vedettes */}
      {produits.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="font-black text-3xl mb-1">Produits vedettes</h2>
                <p className="text-gray-400">Nos meilleures ventes du moment</p>
              </div>
              <button
                onClick={() => navigate("/shop")}
                className="text-red-600 font-semibold hover:text-red-700 transition"
              >
                Voir tout →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {produits.map(produit => (
                <div
                  key={produit.id}
                  onClick={() => navigate(`/product/${produit.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:-translate-y-1 transition-transform duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="h-48 bg-gray-100 overflow-hidden">
                    {produit.image ? (
                      <img
                        src={produit.image}
                        alt={produit.nom}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">{produit.categorie}</p>
                    <h3 className="font-bold mb-2 line-clamp-1">{produit.nom}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-lg text-red-600">
                        {formatPrix(produit.prix)}
                      </span>
                      <button
                        onClick={e => handleAjout(e, produit)}
                        disabled={produit.stock === 0}
                        className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition disabled:opacity-40"
                      >
                        + Panier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banner promo */}
      <div className="bg-red-600 text-white py-16 px-6 text-center">
        <h2 className="font-black text-4xl mb-4">Livraison gratuite 🎉</h2>
        <p className="text-red-100 text-lg mb-8 max-w-md mx-auto">
          Pour toute commande supérieure à 50 000 FCFA — profitez-en maintenant !
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="bg-white text-red-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition"
        >
          Commander maintenant →
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-black text-white text-xl mb-4">
              MAISON<span className="text-red-500">.</span>
            </h3>
            <p className="text-sm leading-relaxed">
              Votre boutique en ligne de confiance au Sénégal. Qualité, rapidité et satisfaction garanties.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Navigation</h4>
            <div className="space-y-2 text-sm">
              <p className="cursor-pointer hover:text-white transition" onClick={() => navigate("/")}>Accueil</p>
              <p className="cursor-pointer hover:text-white transition" onClick={() => navigate("/shop")}>Boutique</p>
              <p className="cursor-pointer hover:text-white transition" onClick={() => navigate("/checkout")}>Panier</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Contact</h4>
            <div className="space-y-2 text-sm">
              <p>📞 +221 XX XXX XX XX</p>
              <p>📧 contact@maison-shop.com</p>
              <p>📍 Dakar, Sénégal</p>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          © 2026 MAISON. Tous droits réservés.
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          ✓ {toast} ajouté au panier
        </div>
      )}
    </div>
  );
}