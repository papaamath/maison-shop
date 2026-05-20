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

      const data = snap.docs.map((d) => {
        const p = d.data();

        return {
          id: d.id,
          nom: p.nom || p.Nom || "",
          prix: Number(p.prix || p.Prix || 0),
          categorie: p.categorie || p.Cathégorie || "",
          image: p.image || p.Image || "",
          stock: Number(p.stock || p.Stock || 0),
          rupture: p.rupture || false,
        };
      });

      setProduits(data.slice(0, 8));
    }

    charger();
  }, []);

  function handleAjout(e, produit) {
    e.stopPropagation();

    addToCart(produit);

    setToast(produit.nom);

    setTimeout(() => setToast(null), 2000);
  }

  const categories = [
    {
      nom: "Sport",
      desc: "Ballons, crampons, equipements",
      color: "bg-orange-50 border-orange-200 text-orange-700",
      icon: "⚽",
    },
    {
      nom: "High-Tech",
      desc: "Gaming, casques, claviers",
      color: "bg-blue-50 border-blue-200 text-blue-700",
      icon: "💻",
    },
    {
      nom: "Electricite",
      desc: "Power bank, aspirateurs",
      color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      icon: "🔋",
    },
    {
      nom: "Montres",
      desc: "Montres hommes et femmes",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700",
      icon: "⌚",
    },
    {
      nom: "Sacs",
      desc: "Sacs a dos, sacs de sport",
      color: "bg-orange-50 border-orange-200 text-orange-700",
      icon: "🎒",
    },
    {
      nom: "Toilettes",
      desc: "Tondeuses, soins personnels",
      color: "bg-pink-50 border-pink-200 text-pink-700",
      icon: "🪒",
    },
    {
      nom: "Papeterie",
      desc: "Bics, fournitures",
      color: "bg-red-50 border-red-200 text-red-700",
      icon: "🖊️",
    },
    {
      nom: "Accessoires",
      desc: "Divers accessoires",
      color: "bg-gray-50 border-gray-200 text-gray-700",
      icon: "🎧",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <div className="relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-orange-500 opacity-95" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6">
              B2S STORE
            </div>

            <h1 className="font-black text-4xl md:text-6xl text-white leading-tight mb-6">
              Tout ce dont
              <br />
              <span className="text-orange-300">
                vous avez besoin
              </span>
              <br />
              en un clic.
            </h1>

            <p className="text-blue-100 text-lg mb-8 max-w-md mx-auto md:mx-0">
              Sport, High-Tech, Accessoires et plus encore.
              Livraison rapide partout au Senegal.
            </p>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={() => navigate("/shop")}
                className="bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-lg"
              >
                Decouvrir la boutique
              </button>

              <button
                onClick={() => navigate("/contact")}
                className="border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition"
              >
                Nous contacter
              </button>
            </div>
          </div>

          <div className="flex md:flex-col gap-4">
            {[
              { label: "Produits disponibles", value: "50+" },
              { label: "Livraison", value: "24-48h" },
              { label: "Satisfaction", value: "100%" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-28 border border-white/10"
              >
                <p className="font-black text-3xl text-white">
                  {s.value}
                </p>

                <p className="text-blue-100 text-xs mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AVANTAGES */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: "🚚",
              title: "Livraison rapide",
              desc: "24-48h a Dakar",
            },
            {
              icon: "💳",
              title: "Paiement flexible",
              desc: "Wave, Orange Money",
            },
            {
              icon: "↩️",
              title: "Retours faciles",
              desc: "30 jours offerts",
            },
            {
              icon: "🔒",
              title: "100% securise",
              desc: "Paiement a la livraison",
            },
          ].map((a) => (
            <div
              key={a.title}
              className="flex items-center gap-3 p-3 md:p-4 bg-white rounded-xl border border-blue-100 shadow-sm"
            >
              <span className="text-2xl">{a.icon}</span>

              <div>
                <p className="font-bold text-xs md:text-sm text-blue-950">
                  {a.title}
                </p>

                <p className="text-gray-500 text-xs hidden md:block">
                  {a.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-black text-3xl mb-2 text-blue-950">
            Nos categories
          </h2>

          <p className="text-gray-500">
            Trouvez exactement ce que vous cherchez
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.nom}
              onClick={() => navigate(`/shop?cat=${cat.nom}`)}
              className={`${cat.color} border rounded-2xl p-5 text-left transition hover:shadow-lg hover:-translate-y-1`}
            >
              <p className="text-3xl mb-3">{cat.icon}</p>

              <p className="font-bold text-sm md:text-base">
                {cat.nom}
              </p>

              <p className="text-xs mt-1 opacity-70 hidden md:block">
                {cat.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* PRODUITS */}
      {produits.length > 0 && (
        <div className="bg-blue-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-black text-2xl md:text-3xl mb-1 text-blue-950">
                  Produits vedettes
                </h2>

                <p className="text-gray-500 text-sm">
                  Nos meilleures ventes du moment
                </p>
              </div>

              <button
                onClick={() => navigate("/shop")}
                className="text-orange-500 font-semibold hover:text-orange-600 transition text-sm"
              >
                Voir tout
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {produits.map((produit) => (
                <div
                  key={produit.id}
                  onClick={() =>
                    navigate(`/product/${produit.id}`)
                  }
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden hover:-translate-y-1 transition-transform duration-200 cursor-pointer shadow-sm hover:shadow-xl"
                >
                  <div className="h-36 md:h-44 bg-gray-100 overflow-hidden">
                    {produit.image ? (
                      <img
                        src={produit.image}
                        alt={produit.nom}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50 text-gray-300">
                        Aucune image
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">
                      {produit.categorie}
                    </p>

                    <h3 className="font-bold text-sm mb-2 line-clamp-1">
                      {produit.nom}
                    </h3>

                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-sm text-orange-500">
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
                        className="bg-blue-900 text-white px-2 py-1 rounded-lg text-xs font-medium hover:bg-blue-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {produit.rupture ||
                        produit.stock === 0
                          ? "Indispo"
                          : "+ Panier"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BANNIERE */}
      <div className="bg-gradient-to-r from-blue-950 to-orange-500 text-white py-14 px-6 text-center">
        <h2 className="font-black text-3xl md:text-4xl mb-4">
          Livraison gratuite
        </h2>

        <p className="text-orange-100 text-lg mb-8 max-w-md mx-auto">
          Pour toute commande superieure a 50 000 FCFA
        </p>

        <button
          onClick={() => navigate("/shop")}
          className="bg-white text-blue-950 px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-50 transition"
        >
          Commander maintenant
        </button>
      </div>

      {/* WHATSAPP */}
      <div className="bg-green-600 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-black text-white text-xl">
              Une question ? Ecrivez-nous !
            </p>

            <p className="text-green-100 text-sm mt-1">
              Reponse garantie en moins de 30 minutes
            </p>
          </div>

          <a
            href="https://wa.me/221768730731"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-green-600 px-8 py-3 rounded-xl font-black hover:bg-green-50 transition whitespace-nowrap"
          >
            Nous contacter
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-blue-950 text-gray-400 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <h3 className="font-black text-white text-3xl mb-4">
                B2S
                <span className="text-orange-500">
                  -STORE
                </span>
              </h3>

              <p className="text-sm leading-relaxed mb-6 max-w-sm">
                Votre boutique en ligne de confiance au Senegal.
                Qualite, rapidite et satisfaction garanties.
              </p>

              <div className="flex gap-3 flex-wrap">
                <a
                  href="https://wa.me/221768730731"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition"
                >
                  WhatsApp
                </a>

                <a
                  href="mailto:syllaissa875@gmail.com"
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                >
                  Email
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">
                Navigation
              </h4>

              <div className="space-y-3 text-sm">
                <p
                  className="cursor-pointer hover:text-white transition"
                  onClick={() => navigate("/")}
                >
                  Accueil
                </p>

                <p
                  className="cursor-pointer hover:text-white transition"
                  onClick={() => navigate("/shop")}
                >
                  Boutique
                </p>

                <p
                  className="cursor-pointer hover:text-white transition"
                  onClick={() => navigate("/suivi")}
                >
                  Suivi commande
                </p>

                <p
                  className="cursor-pointer hover:text-white transition"
                  onClick={() => navigate("/contact")}
                >
                  Contact
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">
                Contact
              </h4>

              <div className="space-y-3 text-sm">
                <a
                  href="https://wa.me/221768730731"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  +221 76 873 07 31
                </a>

                <a
                  href="mailto:syllaissa875@gmail.com"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  syllaissa875@gmail.com
                </a>

                <p>Mbed Fass Yeumbeul, Dakar</p>

                <p>Disponible 24h/24</p>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p>2026 B2S STORE. Tous droits reserves.</p>

            <p>Fait avec amour au Senegal</p>
          </div>
        </div>
      </footer>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-950 text-white px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-lg">
          {toast} ajoute au panier
        </div>
      )}
    </div>
  );
}