import { useState } from "react";
import { collection, addDoc, getDocs, serverTimestamp, updateDoc, doc } from "firebase/firestore";
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
    .map(a => `• ${a.nom}${a.taille ? ` (Pointure: ${a.taille})` : ""} x${a.quantite} — ${Number(a.prix * a.quantite).toLocaleString("fr-SN")} FCFA`)
    .join("\n");
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        client_nom: `${commande.client.prenom} ${commande.client.nom}`,
        client_telephone: commande.client.telephone,
        client_email: commande.client.email,
        client_ville: `${commande.client.ville || "Retrait en magasin"}, ${commande.client.pays || ""}`,
        articles,
        total: Number(commande.total).toLocaleString("fr-SN"),
      },
      EMAILJS_PUBLIC_KEY
    );
  } catch (err) {
    console.error("Erreur email:", err);
  }
}

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modeLivraison, setModeLivraison] = useState("livraison");
  const [codePromo, setCodePromo] = useState("");
  const [promoAppliquee, setPromoAppliquee] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "",
    adresse: "", ville: "", pays: "Senegal",
  });

  const livraison = modeLivraison === "retrait" ? 0 : (total >= 50000 ? 0 : 2500);

  function calcReduction() {
    if (!promoAppliquee) return 0;
    if (promoAppliquee.type === "pourcentage") return Math.round(total * promoAppliquee.valeur / 100);
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
      const promo = toutes.find(p => p.code === codePromo.toUpperCase() && p.actif);

      if (!promo) {
        setPromoError("Code promo invalide ou expire.");
      } else if (promo.dateExpiration && new Date(promo.dateExpiration) < new Date()) {
        setPromoError("Ce code promo a expire.");
      } else if (promo.clientsUtilises?.includes(form.email)) {
        setPromoError("Vous avez deja utilise ce code promo.");
      } else if (promo.minCommande > 0 && total < promo.minCommande) {
        setPromoError(`Commande minimum de ${formatPrix(promo.minCommande)} requis.`);
      } else if (promo.portee === "produit") {
        const produitDansPanier = cart.find(i => i.id === promo.produitId);
        if (!produitDansPanier) {
          setPromoError(`Ce code est valable uniquement pour : ${promo.produitNom}`);
        } else {
          setPromoAppliquee(promo);
        }
      } else {
        setPromoAppliquee(promo);
      }
    } catch {
      setPromoError("Erreur lors de la verification.");
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
          taille: i.tailleChoisie || null,
        })),
        total: totalFinal,
        livraison,
        reduction,
        codePromo: promoAppliquee?.code || null,
        modeLivraison,
        statut: "En attente",
        createdAt: serverTimestamp(),
      });

      if (promoAppliquee) {
        await updateDoc(doc(db, "promos", promoAppliquee.id), {
          utilisations: (promoAppliquee.utilisations || 0) + 1,
          clientsUtilises: [...(promoAppliquee.clientsUtilises || []), form.email],
        });
      }

      await envoyerEmailAdmin({
        client: form,
        articles: cart.map(i => ({ nom: i.nom, quantite: i.qty, prix: i.prix, taille: i.tailleChoisie || null })),
        total: totalFinal,
      });

      clearCart();
      navigate("/confirmation");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la commande. Reessayez.");
    }

    setLoading(false);
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-blue-950">
          <p className="text-6xl mb-4">🛍</p>
          <p className="text-2xl font-black mb-2">Votre panier est vide</p>
          <button onClick={() => navigate("/shop")}
            className="mt-4 bg-gradient-to-r from-blue-950 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg">
            Voir la boutique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-black text-3xl md:text-4xl mb-8 text-blue-950">
          Finaliser la commande
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleCommande} className="space-y-4">

            {/* Mode de reception */}
            <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-blue-950">Mode de reception</h2>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setModeLivraison("livraison")}
                  className={`p-4 rounded-2xl border-2 text-left transition ${modeLivraison === "livraison" ? "border-orange-400 bg-orange-50 shadow-md" : "border-blue-100 hover:border-orange-300 bg-white"}`}>
                  <p className="text-2xl mb-2">🚚</p>
                  <p className="font-bold text-sm text-blue-950">Livraison a domicile</p>
                  <p className="text-xs text-gray-500 mt-1">24-48h · 2 500 FCFA</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">Gratuite des 50 000 FCFA</p>
                </button>
                <button type="button" onClick={() => setModeLivraison("retrait")}
                  className={`p-4 rounded-2xl border-2 text-left transition ${modeLivraison === "retrait" ? "border-orange-400 bg-orange-50 shadow-md" : "border-blue-100 hover:border-orange-300 bg-white"}`}>
                  <p className="text-2xl mb-2">🏪</p>
                  <p className="font-bold text-sm text-blue-950">Retrait en magasin</p>
                  <p className="text-xs text-gray-500 mt-1">Dakar · Gratuit</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">Disponible sous 24h</p>
                </button>
              </div>
            </div>

            {/* Infos personnelles */}
            <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-blue-950">Informations personnelles</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-blue-950 font-medium block mb-1">Prenom</label>
                  <input name="prenom" value={form.prenom} onChange={handleChange} required
                    className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Mamadou" />
                </div>
                <div>
                  <label className="text-sm text-blue-950 font-medium block mb-1">Nom</label>
                  <input name="nom" value={form.nom} onChange={handleChange} required
                    className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Diallo" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-blue-950 font-medium block mb-1">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required
                  className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="mamadou@email.com" />
              </div>
              <div className="mt-4">
                <label className="text-sm text-blue-950 font-medium block mb-1">Telephone</label>
                <input name="telephone" value={form.telephone} onChange={handleChange} required
                  className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="+221 77 000 00 00" />
              </div>
            </div>

            {/* Adresse livraison */}
            {modeLivraison === "livraison" && (
              <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm">
                <h2 className="font-black text-lg mb-4 text-blue-950">Adresse de livraison</h2>
                <div>
                  <label className="text-sm text-blue-950 font-medium block mb-1">Adresse</label>
                  <input name="adresse" value={form.adresse} onChange={handleChange} required
                    className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Rue 10, Quartier Almadies" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-blue-950 font-medium block mb-1">Ville</label>
                    <input name="ville" value={form.ville} onChange={handleChange} required
                      className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      placeholder="Dakar" />
                  </div>
                  <div>
                    <label className="text-sm text-blue-950 font-medium block mb-1">Pays</label>
                    <select name="pays" value={form.pays} onChange={handleChange}
                      className="w-full border border-blue-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
                      <option>Senegal</option>
                      <option>Cote d'Ivoire</option>
                      <option>Mali</option>
                      <option>Guinee</option>
                      <option>Burkina Faso</option>
                      <option>Cameroun</option>
                      <option>France</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {modeLivraison === "retrait" && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-blue-900 mb-1">Informations de retrait</p>
                <p className="text-sm text-blue-700">Adresse : Mbed Fass Yeumbeul, Dakar</p>
                <p className="text-sm text-blue-700">Horaires : Disponible 24h/24</p>
                <p className="text-sm text-blue-700 mt-1">Vous serez contacte quand votre commande est prete !</p>
              </div>
            )}

            {/* Code promo */}
            <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-blue-950">Code promo</h2>
              {promoAppliquee ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-green-700">{promoAppliquee.code} applique</p>
                    <p className="text-sm text-green-600">
                      Reduction de {promoAppliquee.type === "pourcentage" ? `${promoAppliquee.valeur}%` : formatPrix(promoAppliquee.valeur)}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setPromoAppliquee(null); setCodePromo(""); }}
                    className="text-orange-500 text-sm hover:text-orange-600 font-bold">
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input value={codePromo} onChange={e => setCodePromo(e.target.value.toUpperCase())}
                    placeholder="Entrez votre code"
                    className="flex-1 border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-bold tracking-widest uppercase" />
                  <button type="button" onClick={appliquerPromo} disabled={promoLoading || !codePromo}
                    className="bg-blue-950 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition disabled:opacity-50">
                    {promoLoading ? "..." : "Appliquer"}
                  </button>
                </div>
              )}
              {promoError && <p className="text-red-500 text-sm mt-2">{promoError}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-950 to-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:opacity-90 transition disabled:opacity-50 shadow-lg">
              {loading ? "Envoi en cours..." : `Confirmer — ${formatPrix(totalFinal)}`}
            </button>
          </form>

          {/* Recap commande */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-blue-950">Recapitulatif</h2>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={`${item.id}_${item.tailleChoisie || ""}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-blue-100">
                      {item.image ? (
                        <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
                      ) : "📦"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-blue-950">{item.nom}</p>
                      {item.tailleChoisie && (
                        <p className="text-orange-500 text-xs font-bold">Pointure : {item.tailleChoisie}</p>
                      )}
                      <p className="text-gray-400 text-xs">Qte : {item.qty}</p>
                    </div>
                    <span className="font-bold text-sm text-orange-500">
                      {formatPrix(item.prix * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-blue-100 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span className="text-blue-950 font-medium">{formatPrix(total)}</span>
                </div>
                {reduction > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Reduction ({promoAppliquee?.code})</span>
                    <span>- {formatPrix(reduction)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Livraison</span>
                  <span className={livraison === 0 ? "text-green-600 font-bold" : "text-blue-950 font-medium"}>
                    {livraison === 0
                      ? (modeLivraison === "retrait" ? "Retrait gratuit" : "Gratuite")
                      : formatPrix(livraison)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-lg border-t border-blue-100 pt-2 mt-2 text-blue-950">
                  <span>Total</span>
                  <span className="text-orange-500">{formatPrix(totalFinal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950 to-orange-500 rounded-3xl p-5 text-sm text-white shadow-lg">
              Paiement a la livraison disponible
              <br />
              Wave et Orange Money acceptes
              <br />
              Livraison sous 24-48h a Dakar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
