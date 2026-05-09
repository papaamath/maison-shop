import { useState } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = "service_hucapuj";
const EMAILJS_TEMPLATE_ID = "template_s4bau5m";
const EMAILJS_PUBLIC_KEY = "GrsANLfPqrMFqvCHG";

async function envoyerEmailAdmin(commande) {
  const articles = commande.articles
    .map(a => `• ${a.nom} x${a.quantite} — ${Number(a.prix * a.quantite).toLocaleString("fr-SN")} FCFA`)
    .join("\n");

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        client_nom: `${commande.client.prenom} ${commande.client.nom}`,
        client_telephone: commande.client.telephone,
        client_email: commande.client.email,
        client_ville: `${commande.client.ville}, ${commande.client.pays}`,
        articles,
        total: Number(commande.total).toLocaleString("fr-SN"),
      },
      EMAILJS_PUBLIC_KEY
    );
  } catch (err) {
    console.error("❌ Erreur email:", err);
  }
}

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [codePromo, setCodePromo] = useState("");
  const [promoAppliquee, setPromoAppliquee] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    ville: "",
    pays: "Sénégal",
  });

  const livraison = total >= 50000 ? 0 : 2500;

  // Calcul réduction
  function calcReduction() {
    if (!promoAppliquee) return 0;
    if (promoAppliquee.type === "pourcentage") {
      return Math.round(total * promoAppliquee.valeur / 100);
    }
    return Math.min(promoAppliquee.valeur, total);
  }

  const reduction = calcReduction();
  const totalFinal = total - reduction + livraison;

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function appliquerPromo() {
    if (!codePromo.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoAppliquee(null);

    try {
      const snap = await getDocs(collection(db, "promos"));
      const toutes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const promo = toutes.find(p =>
        p.code === codePromo.toUpperCase() && p.actif
      );

      if (!promo) {
        setPromoError("Code promo invalide ou expiré.");
      } else if (promo.minCommande > 0 && total < promo.minCommande) {
        setPromoError(`Commande minimum de ${formatPrix(promo.minCommande)} requis.`);
      } else {
        setPromoAppliquee(promo);
      }
    } catch (err) {
      setPromoError("Erreur lors de la vérification.");
    }
    setPromoLoading(false);
  }

  async function handleCommande(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "commandes"), {
        client: form,
        articles: cart.map(i => ({
          id: i.id,
          nom: i.nom,
          prix: i.prix,
          quantite: i.qty,
        })),
        total: totalFinal,
        livraison,
        reduction,
        codePromo: promoAppliquee?.code || null,
        statut: "En attente",
        createdAt: serverTimestamp(),
      });

      // Incrémente le compteur d'utilisations
      if (promoAppliquee) {
        await updateDoc(doc(db, "promos", promoAppliquee.id), {
          utilisations: (promoAppliquee.utilisations || 0) + 1,
        });
      }

      await envoyerEmailAdmin({
        client: form,
        articles: cart.map(i => ({ nom: i.nom, quantite: i.qty, prix: i.prix })),
        total: totalFinal,
      });

      clearCart();
      navigate("/confirmation");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la commande. Réessayez.");
    }
    setLoading(false);
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <p className="text-5xl mb-4">🛍</p>
          <p className="text-xl font-semibold mb-2">Votre panier est vide</p>
          <button
            onClick={() => navigate("/shop")}
            className="mt-4 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition"
          >
            Voir la boutique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-black text-3xl mb-8">Finaliser la commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <form onSubmit={handleCommande} className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg mb-4">Informations personnelles</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prénom</label>
                  <input
                    name="prenom"
                    value={form.prenom}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Mamadou"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Nom</label>
                  <input
                    name="nom"
                    value={form.nom}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Diallo"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-500 block mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="mamadou@email.com"
                />
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-500 block mb-1">Téléphone</label>
                <input
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg mb-4">Adresse de livraison</h2>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Adresse</label>
                <input
                  name="adresse"
                  value={form.adresse}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Rue 10, Quartier Almadies"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Ville</label>
                  <input
                    name="ville"
                    value={form.ville}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Dakar"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Pays</label>
                  <select
                    name="pays"
                    value={form.pays}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option>Sénégal</option>
                    <option>Côte d'Ivoire</option>
                    <option>Mali</option>
                    <option>Guinée</option>
                    <option>Burkina Faso</option>
                    <option>Cameroun</option>
                    <option>France</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Code promo */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg mb-4">🎟️ Code promo</h2>
              {promoAppliquee ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-bold text-green-700">{promoAppliquee.code} appliqué ✅</p>
                    <p className="text-sm text-green-600">
                      Réduction de {promoAppliquee.type === "pourcentage"
                        ? `${promoAppliquee.valeur}%`
                        : formatPrix(promoAppliquee.valeur)
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPromoAppliquee(null); setCodePromo(""); }}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    value={codePromo}
                    onChange={e => setCodePromo(e.target.value.toUpperCase())}
                    placeholder="Entrez votre code"
                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold tracking-widest uppercase"
                  />
                  <button
                    type="button"
                    onClick={appliquerPromo}
                    disabled={promoLoading || !codePromo}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    {promoLoading ? "..." : "Appliquer"}
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-red-500 text-sm mt-2">{promoError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? "Envoi en cours..." : `Confirmer — ${formatPrix(totalFinal)}`}
            </button>
          </form>

          {/* Récapitulatif */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg mb-4">Récapitulatif</h2>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
                      ) : "📦"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nom}</p>
                      <p className="text-gray-400 text-xs">Qté : {item.qty}</p>
                    </div>
                    <span className="font-semibold text-sm">{formatPrix(item.prix * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{formatPrix(total)}</span>
                </div>
                {reduction > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>🎟️ Réduction ({promoAppliquee?.code})</span>
                    <span>- {formatPrix(reduction)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Livraison</span>
                  <span className={livraison === 0 ? "text-green-600 font-medium" : ""}>
                    {livraison === 0 ? "Gratuite 🎉" : formatPrix(livraison)}
                  </span>
                </div>
                {livraison > 0 && (
                  <p className="text-xs text-gray-400">
                    Livraison gratuite dès {formatPrix(50000)} d'achat
                  </p>
                )}
                <div className="flex justify-between font-black text-lg border-t border-gray-100 pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatPrix(totalFinal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              ✅ Paiement à la livraison disponible<br/>
              ✅ Wave & Orange Money acceptés<br/>
              ✅ Livraison sous 24-48h à Dakar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}