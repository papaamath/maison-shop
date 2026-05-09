import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";

export default function Product() {
  const { id } = useParams();
  const [produit, setProduit] = useState(null);
  const [similaires, setSimilaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState(false);
  const [onglet, setOnglet] = useState("description");
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function charger() {
      const snap = await getDoc(doc(db, "produits", id));
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() };
        setProduit(p);

        // Charge produits similaires
        const allSnap = await getDocs(collection(db, "produits"));
        const all = allSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.id !== id && (d.categorie || d.Cathégorie) === (p.categorie || p.Cathégorie))
          .slice(0, 4);
        setSimilaires(all);
      }
      setLoading(false);
    }
    charger();
    window.scrollTo(0, 0);
  }, [id]);

  function handleAjout() {
    for (let i = 0; i < qty; i++) addToCart(produit);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-32 text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-4 animate-bounce">📦</p>
          <p>Chargement...</p>
        </div>
      </div>
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

  const stockDisponible = Number(produit.stock || produit.Stock || 0);
  const nom = produit.nom || produit.Nom || "";
  const prix = Number(produit.prix || produit.Prix || 0);
  const categorie = produit.categorie || produit.Cathégorie || "";
  const description = produit.description || produit.Description || "";
  const image = produit.image || produit.Image || "";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Fil d'ariane */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-gray-400 flex items-center gap-2">
          <span className="cursor-pointer hover:text-black transition" onClick={() => navigate("/")}>Accueil</span>
          <span>›</span>
          <span className="cursor-pointer hover:text-black transition" onClick={() => navigate("/shop")}>Boutique</span>
          <span>›</span>
          <span className="cursor-pointer hover:text-black transition" onClick={() => navigate(`/shop?cat=${categorie}`)}>{categorie}</span>
          <span>›</span>
          <span className="text-gray-700 font-medium line-clamp-1">{nom}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">

          {/* Image */}
          <div>
            <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square border border-gray-100 mb-4">
              {image ? (
                <img src={image} alt={nom} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
              )}
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {stockDisponible > 0 && stockDisponible <= 5 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                  🔥 Plus que {stockDisponible} en stock !
                </span>
              )}
              {stockDisponible > 5 && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  ✓ En stock
                </span>
              )}
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                🚚 Livraison 24-48h
              </span>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                ↩️ Retour 30 jours
              </span>
            </div>
          </div>

          {/* Infos produit */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">{categorie}</p>
            <h1 className="font-black text-4xl mb-4 leading-tight text-gray-900">{nom}</h1>

            {/* Prix */}
            <div className="flex items-center gap-4 mb-6">
              <p className="font-black text-4xl text-red-600">{formatPrix(prix)}</p>
            </div>

            {/* Description courte */}
            <p className="text-gray-600 leading-relaxed mb-6 text-sm">
              {description || "Aucune description disponible."}
            </p>

            {/* Stock */}
            <div className="mb-6">
              {stockDisponible === 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-600 font-semibold">😔 Produit en rupture de stock</p>
                  <p className="text-red-400 text-sm mt-1">Revenez bientôt !</p>
                </div>
              ) : (
                <>
                  {/* Quantité */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm text-gray-500 font-medium">Quantité :</span>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-xl font-bold transition"
                      >
                        −
                      </button>
                      <span className="px-6 py-3 font-bold text-lg min-w-16 text-center">{qty}</span>
                      <button
                        onClick={() => setQty(q => Math.min(stockDisponible, q + 1))}
                        className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-xl font-bold transition"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">{stockDisponible} disponibles</span>
                  </div>

                  {/* Boutons */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleAjout}
                      className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
                    >
                      🛍 Ajouter au panier — {formatPrix(prix * qty)}
                    </button>
                    <button
                      onClick={() => { handleAjout(); navigate("/checkout"); }}
                      className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition"
                    >
                      ⚡ Commander maintenant
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Infos livraison */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { icon: "🚚", title: "Livraison rapide", desc: "24-48h à Dakar" },
                { icon: "💳", title: "Wave & Orange Money", desc: "Paiement facile" },
                { icon: "↩️", title: "Retours gratuits", desc: "Sous 30 jours" },
              ].map(item => (
                <div key={item.title} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-xs font-bold text-gray-700">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            {[
              { id: "description", label: "Description" },
              { id: "livraison", label: "Livraison & Retours" },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`pb-4 font-semibold text-sm border-b-2 transition ${
                  onglet === o.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-16">
          {onglet === "description" && (
            <div className="max-w-2xl">
              <p className="text-gray-600 leading-relaxed">
                {description || "Aucune description disponible pour ce produit."}
              </p>
            </div>
          )}
          {onglet === "livraison" && (
            <div className="max-w-2xl space-y-4">
              {[
                { icon: "🚚", title: "Livraison standard", desc: "24-48h à Dakar. 3-5 jours pour les autres régions du Sénégal." },
                { icon: "💰", title: "Frais de livraison", desc: "2 500 FCFA. Gratuite pour toute commande supérieure à 50 000 FCFA." },
                { icon: "↩️", title: "Politique de retour", desc: "Retours acceptés sous 30 jours après réception. Produit non utilisé et dans son emballage d'origine." },
                { icon: "📞", title: "Service client", desc: "Contactez-nous par WhatsApp ou email pour tout problème avec votre commande." },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-sm mb-1">{item.title}</p>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produits similaires */}
        {similaires.length > 0 && (
          <div>
            <h2 className="font-black text-2xl mb-6">Vous aimerez aussi</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similaires.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:-translate-y-1 transition-transform cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    {(p.image || p.Image) ? (
                      <img src={p.image || p.Image} alt={p.nom || p.Nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm line-clamp-1">{p.nom || p.Nom}</p>
                    <p className="font-black text-red-600 mt-1">{formatPrix(Number(p.prix || p.Prix || 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg flex items-center gap-2">
          ✓ {nom} ajouté au panier !
          <button
            onClick={() => navigate("/checkout")}
            className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs ml-2 hover:bg-red-700 transition"
          >
            Voir le panier →
          </button>
        </div>
      )}
    </div>
  );
}