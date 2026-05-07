import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCommandes: 0,
    chiffreAffaires: 0,
    totalProduits: 0,
    commandesEnAttente: 0,
  });
  const [dernieresCommandes, setDernieresCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function chargerStats() {
      const [commandesSnap, produitsSnap] = await Promise.all([
        getDocs(collection(db, "commandes")),
        getDocs(collection(db, "produits")),
      ]);

      const commandes = commandesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ca = commandes
        .filter(c => c.statut !== "Annulé")
        .reduce((a, c) => a + (Number(c.total) || 0), 0);
      const enAttente = commandes.filter(c => c.statut === "En attente").length;

      setStats({
        totalCommandes: commandes.length,
        chiffreAffaires: ca,
        totalProduits: produitsSnap.size,
        commandesEnAttente: enAttente,
      });

      setDernieresCommandes(commandes.slice(0, 5));
      setLoading(false);
    }
    chargerStats();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    navigate("/admin/login");
  }

  const STATUS_COLORS = {
    "En attente": "bg-yellow-100 text-yellow-700",
    "Confirmé": "bg-blue-100 text-blue-700",
    "Livré": "bg-green-100 text-green-700",
    "Annulé": "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="font-black text-white text-xl">
            MAISON<span className="text-red-500">.</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Administration</p>
        </div>
        <nav className="p-4 flex-1 space-y-1">
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium">
            📊 Dashboard
          </Link>
          <Link to="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            📦 Produits
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🛒 Commandes
          </Link>
          <Link to="/shop" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm transition">
            🌐 Voir la boutique
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-gray-400 hover:text-white text-sm py-2 transition"
          >
            Déconnexion →
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="font-black text-2xl">Tableau de bord</h2>
          <p className="text-gray-400 text-sm mt-1">Bienvenue dans votre espace admin</p>
        </div>

        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Chiffre d'affaires", value: formatPrix(stats.chiffreAffaires), icon: "💰" },
                { label: "Commandes totales", value: stats.totalCommandes, icon: "🛒" },
                { label: "En attente", value: stats.commandesEnAttente, icon: "⏳", alert: stats.commandesEnAttente > 0 },
                { label: "Produits", value: stats.totalProduits, icon: "📦" },
              ].map(s => (
                <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.alert ? "border-yellow-300" : "border-gray-200"}`}>
                  <p className="text-2xl mb-2">{s.icon}</p>
                  <p className="text-gray-400 text-xs mb-1">{s.label}</p>
                  <p className={`font-black text-2xl ${s.alert ? "text-yellow-600" : ""}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Dernières commandes */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-lg">Dernières commandes</h3>
                <Link to="/admin/orders" className="text-sm text-gray-400 hover:text-black transition">
                  Voir tout →
                </Link>
              </div>

              {dernieresCommandes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  Aucune commande pour l'instant.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {dernieresCommandes.map(cmd => (
                    <div key={cmd.id} className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
                      <div>
                        <p className="font-medium text-sm">
                          {cmd.client?.prenom} {cmd.client?.nom}
                        </p>
                        <p className="text-gray-400 text-xs">{cmd.client?.telephone}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {cmd.articles?.length} article(s)
                      </div>
                      <div className="font-bold">{formatPrix(cmd.total)}</div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}>
                        {cmd.statut}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}