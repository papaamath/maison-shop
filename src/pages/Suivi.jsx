import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";

const STATUS_STEPS = ["En attente", "Confirmé", "En livraison", "Livré"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirmé": "bg-blue-100 text-blue-700",
  "En livraison": "bg-purple-100 text-purple-700",
  "Livré": "bg-green-100 text-green-700",
  "Annulé": "bg-red-100 text-red-700",
};

function formatDate(ts) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export default function Suivi() {
  const [recherche, setRecherche] = useState("");
  const [type, setType] = useState("email");
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cherche, setCherche] = useState(false);

  async function handleRecherche(e) {
    e.preventDefault();
    if (!recherche.trim()) return;
    setLoading(true);
    setCherche(true);
    try {
      const snap = await getDocs(collection(db, "commandes"));
      const toutes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtrees = toutes.filter(cmd => {
        if (type === "email") return cmd.client?.email?.toLowerCase() === recherche.toLowerCase();
        return cmd.client?.telephone?.replace(/\s/g, "") === recherche.replace(/\s/g, "");
      });
      filtrees.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCommandes(filtrees);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function getStepIndex(statut) {
    return STATUS_STEPS.indexOf(statut);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-4xl mb-4">📦</p>
          <h1 className="font-black text-3xl mb-2">Suivi de commande</h1>
          <p className="text-gray-400">Entrez votre email ou téléphone pour retrouver vos commandes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <form onSubmit={handleRecherche} className="space-y-4">
            <div className="flex gap-3">
              <button type="button" onClick={() => setType("email")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type === "email" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                📧 Par email
              </button>
              <button type="button" onClick={() => setType("telephone")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type === "telephone" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                📞 Par téléphone
              </button>
            </div>
            <div className="flex gap-3">
              <input
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                required
                placeholder={type === "email" ? "votre@email.com" : "+221 77 000 00 00"}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
              <button type="submit" disabled={loading}
                className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50">
                {loading ? "..." : "Rechercher"}
              </button>
            </div>
          </form>
        </div>

        {cherche && !loading && (
          <>
            {commandes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-4">😕</p>
                <p className="font-bold text-lg mb-2">Aucune commande trouvée</p>
                <p className="text-gray-400 text-sm">Vérifiez votre {type === "email" ? "adresse email" : "numéro de téléphone"}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-500 text-sm">{commandes.length} commande(s) trouvée(s)</p>
                {commandes.map(cmd => (
                  <div key={cmd.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-bold text-lg">Commande du {formatDate(cmd.createdAt)}</p>
                        <p className="text-gray-400 text-sm mt-1">{cmd.articles?.length} article(s) · {formatPrix(cmd.total)}</p>
                      </div>
                      <span className={`text-sm font-semibold px-4 py-2 rounded-full ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}>
                        {cmd.statut}
                      </span>
                    </div>

                    {cmd.statut !== "Annulé" && (
                      <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          {STATUS_STEPS.map((step, i) => (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${i <= getStepIndex(cmd.statut) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                                {i <= getStepIndex(cmd.statut) ? "✓" : i + 1}
                              </div>
                              <p className={`text-xs text-center hidden sm:block ${i <= getStepIndex(cmd.statut) ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <p className="font-semibold text-sm mb-3">Articles commandés</p>
                      {cmd.articles?.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-50">
                          <span>{a.nom} × {a.quantite}</span>
                          <span className="font-medium">{formatPrix(a.prix * a.quantite)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-lg pt-3">
                        <span>Total</span>
                        <span>{formatPrix(cmd.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}