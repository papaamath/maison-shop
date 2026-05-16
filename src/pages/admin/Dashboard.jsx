import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#1a1a18", "#C84B31", "#3B6D11", "#BA7517", "#5DCAA5"];

export default function Dashboard() {
  const [commandes, setCommandes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function charger() {
      const [cmdSnap, prodSnap] = await Promise.all([
        getDocs(collection(db, "commandes")),
        getDocs(collection(db, "produits")),
      ]);
      const cmds = cmdSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      cmds.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setCommandes(cmds);
      setProduits(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    charger();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    navigate("/admin/login");
  }

  const ca = commandes.filter(c => c.statut !== "Annule").reduce((a, c) => a + Number(c.total || 0), 0);
  const enAttente = commandes.filter(c => c.statut === "En attente").length;
  const livrees = commandes.filter(c => c.statut === "Livre").length;
  const tauxConversion = commandes.length > 0 ? Math.round((livrees / commandes.length) * 100) : 0;

  const caParJour = {};
  commandes.forEach(cmd => {
    if (!cmd.createdAt?.seconds || cmd.statut === "Annule") return;
    const date = new Date(cmd.createdAt.seconds * 1000).toLocaleDateString("fr-SN", { day: "2-digit", month: "short" });
    caParJour[date] = (caParJour[date] || 0) + Number(cmd.total || 0);
  });
  const dataCA = Object.entries(caParJour).map(([date, total]) => ({ date, total }));

  const dataStatuts = [
    { name: "En attente", value: enAttente },
    { name: "Confirme", value: commandes.filter(c => c.statut === "Confirme").length },
    { name: "Livre", value: livrees },
    { name: "Annule", value: commandes.filter(c => c.statut === "Annule").length },
  ].filter(d => d.value > 0);

  const ventesParProduit = {};
  commandes.forEach(cmd => {
    if (cmd.statut === "Annule") return;
    cmd.articles?.forEach(a => {
      ventesParProduit[a.nom] = (ventesParProduit[a.nom] || 0) + a.quantite;
    });
  });
  const topProduits = Object.entries(ventesParProduit).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nom, ventes]) => ({ nom, ventes }));
  const ruptures = produits.filter(p => Number(p.stock || 0) === 0);
  const stockFaible = produits.filter(p => { const s = Number(p.stock || 0); return s > 0 && s <= 5; });

  const STATUS_COLORS = {
    "En attente": "bg-yellow-100 text-yellow-700",
    "Confirme": "bg-blue-100 text-blue-700",
    "En livraison": "bg-purple-100 text-purple-700",
    "Livre": "bg-green-100 text-green-700",
    "Annule": "bg-red-100 text-red-700",
  };

  const navLinks = [
    { to: "/admin", label: "Dashboard", active: true },
    { to: "/admin/products", label: "Produits", active: false },
    { to: "/admin/orders", label: "Commandes", active: false },
    { to: "/admin/promos", label: "Promotions", active: false },
    { to: "/shop", label: "Voir la boutique", active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar mobile */}
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-black text-white text-lg">MAISON<span className="text-red-500">.</span></h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">
          {menuOpen ? "X" : "≡"}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-red-400 text-sm">
            Deconnexion
          </button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0">
          <div className="p-6 border-b border-gray-700">
            <h1 className="font-black text-white text-xl">MAISON<span className="text-red-500">.</span></h1>
            <p className="text-gray-400 text-xs mt-1">Administration</p>
          </div>
          <nav className="p-4 flex-1 space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-700">
            <button onClick={handleLogout} className="w-full text-gray-400 hover:text-white text-sm py-2 transition">
              Deconnexion
            </button>
          </div>
        </aside>

        {/* Contenu */}
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="mb-6">
            <h2 className="font-black text-xl md:text-2xl">Tableau de bord</h2>
            <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre activite</p>
          </div>

          {loading ? (
            <div className="text-gray-400">Chargement...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Chiffre d'affaires", value: formatPrix(ca), color: "text-green-600" },
                  { label: "Commandes totales", value: commandes.length, color: "" },
                  { label: "En attente", value: enAttente, color: enAttente > 0 ? "text-yellow-600" : "" },
                  { label: "Taux livraison", value: tauxConversion + "%", color: "text-blue-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-gray-400 text-xs mb-1">{s.label}</p>
                    <p className={`font-black text-xl md:text-2xl ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Alertes */}
              {(ruptures.length > 0 || stockFaible.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {ruptures.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="font-bold text-red-700 mb-2">Ruptures de stock ({ruptures.length})</p>
                      {ruptures.map(p => (
                        <p key={p.id} className="text-sm text-red-600">- {p.nom || p.Nom}</p>
                      ))}
                    </div>
                  )}
                  {stockFaible.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="font-bold text-yellow-700 mb-2">Stock faible ({stockFaible.length})</p>
                      {stockFaible.map(p => (
                        <p key={p.id} className="text-sm text-yellow-600">- {p.nom || p.Nom} ({p.stock} restant)</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Graphiques */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-4">Evolution du CA</h3>
                  {dataCA.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Pas encore de donnees</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={dataCA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0) + "k"} />
                        <Tooltip formatter={v => formatPrix(v)} />
                        <Line type="monotone" dataKey="total" stroke="#C84B31" strokeWidth={2} dot={{ fill: "#C84B31" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-4">Repartition commandes</h3>
                  {dataStatuts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Pas encore de donnees</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={180}>
                        <PieChart>
                          <Pie data={dataStatuts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                            {dataStatuts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {dataStatuts.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-600 truncate">{d.name}</span>
                            <span className="font-bold ml-auto">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-4">Top produits vendus</h3>
                  {topProduits.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Pas encore de ventes</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={topProduits} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="nom" type="category" tick={{ fontSize: 9 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="ventes" fill="#1a1a18" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base md:text-lg">Dernieres commandes</h3>
                    <Link to="/admin/orders" className="text-sm text-gray-400 hover:text-black transition">Voir tout</Link>
                  </div>
                  {commandes.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Aucune commande</p>
                  ) : (
                    <div className="space-y-3">
                      {[...commandes].reverse().slice(0, 4).map(cmd => (
                        <div key={cmd.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                          <div>
                            <p className="font-medium text-sm">{cmd.client?.prenom} {cmd.client?.nom}</p>
                            <p className="text-gray-400 text-xs">{cmd.articles?.length} article(s)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatPrix(cmd.total)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[cmd.statut] || "bg-gray-100"}`}>
                              {cmd.statut}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
