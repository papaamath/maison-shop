import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock", active: true },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <img src="/logo.jpeg" alt="B2S-STORE" className="h-10 w-auto object-contain rounded-lg" />
        <div>
          <p className="font-black text-white text-base">B2S-STORE</p>
          <p className="text-gray-400 text-xs">Administration</p>
        </div>
      </div>
      <nav className="p-4 flex-1 space-y-1">
        {NAV_LINKS.map(l => (
          <Link key={l.to} to={l.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav({ open, setOpen }) {
  return (
    <>
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-8 w-auto object-contain rounded" />
          <span className="font-black text-white text-base">B2S-STORE</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white text-2xl">{open ? "X" : "≡"}</button>
      </div>
      {open && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40 max-h-96 overflow-y-auto">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${l.active ? "bg-gray-700 text-white font-medium" : "text-gray-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function formatDateArrivage(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" });
}

// Nombre de jours avant l'arrivage (negatif si la date est passee)
function joursRestants(dateStr) {
  if (!dateStr) return null;
  const arrivage = new Date(dateStr);
  if (isNaN(arrivage)) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  arrivage.setHours(0, 0, 0, 0);
  return Math.round((arrivage - aujourdhui) / (1000 * 60 * 60 * 24));
}

export default function StockValeur() {
  const [produits, setProduits] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [prodSnap, cmdSnap] = await Promise.all([
      getDocs(collection(db, "produits")),
      getDocs(collection(db, "commandes")),
    ]);
    setProduits(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setCommandes(cmdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // Ventes par produit
  const ventesParProduit = {};
  commandes.forEach(cmd => {
    if (cmd.statut === "Annule") return;
    cmd.articles?.forEach(a => {
      if (!ventesParProduit[a.id]) ventesParProduit[a.id] = { quantite: 0, total: 0 };
      ventesParProduit[a.id].quantite += a.quantite;
      ventesParProduit[a.id].total += a.prix * a.quantite;
    });
  });

  const produitsAvecStats = produits.map(p => {
    const stock = Number(p.stock || 0);
    const prix = Number(p.prix || 0);
    const ventes = ventesParProduit[p.id] || { quantite: 0, total: 0 };
    const enArrivage = Boolean(p.prochainArrivage && p.dateArrivage);
    const qteArrivage = enArrivage ? Number(p.stockArrivage || 0) : 0;

    return {
      ...p,
      stock,
      prix,
      valeurStock: stock * prix,
      dejaVendu: ventes.total,
      quantiteVendue: ventes.quantite,
      enArrivage,
      qteArrivage,
      valeurArrivage: qteArrivage * prix,
      jours: enArrivage ? joursRestants(p.dateArrivage) : null,
    };
  });

  // ===== TOTAUX =====
  const totalValeurStock = produitsAvecStats.reduce((a, p) => a + p.valeurStock, 0);
  const totalDejaVendu = produitsAvecStats.reduce((a, p) => a + p.dejaVendu, 0);
  const totalArrivage = produitsAvecStats.reduce((a, p) => a + p.valeurArrivage, 0);
  const totalPotentiel = totalValeurStock + totalDejaVendu + totalArrivage;

  const enArrivage = produitsAvecStats
    .filter(p => p.enArrivage)
    .sort((a, b) => new Date(a.dateArrivage) - new Date(b.dateArrivage));

  const arrivagesEnRetard = enArrivage.filter(p => p.jours !== null && p.jours < 0);
  const arrivagesProches = enArrivage.filter(p => p.jours !== null && p.jours >= 0 && p.jours <= 7);
  const totalArrivageRetard = arrivagesEnRetard.reduce((a, p) => a + p.valeurArrivage, 0);
  const qteTotalArrivage = enArrivage.reduce((a, p) => a + p.qteArrivage, 0);

  // ===== FILTRES =====
  const produitsFiltres = produitsAvecStats
    .filter(p => {
      if (filtre === "stock") return p.stock > 0 && !p.rupture && !p.enArrivage;
      if (filtre === "rupture") return (p.rupture || p.stock === 0) && !p.enArrivage;
      if (filtre === "arrivage") return p.enArrivage;
      if (filtre === "vendu") return p.quantiteVendue > 0;
      return true;
    })
    .filter(p => {
      const q = recherche.toLowerCase().trim();
      return !q || (p.nom || "").toLowerCase().includes(q);
    })
    .sort((a, b) => b.valeurStock - a.valeurStock);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="mb-6">
            <h2 className="font-black text-xl md:text-2xl">Valeur du stock</h2>
            <p className="text-gray-400 text-sm mt-1">
              Ce que tu as en magasin, ce qui arrive, et ce que tu as deja vendu
            </p>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes resume */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Stock en magasin
                  </p>
                  <p className="font-black text-2xl text-blue-700">{formatPrix(totalValeurStock)}</p>
                  <p className="text-blue-500 text-xs mt-2">
                    {produitsAvecStats.filter(p => p.stock > 0).length} produit(s) disponibles
                  </p>
                </div>

                <div className={`${totalArrivage > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"} border-2 rounded-2xl p-5`}>
                  <p className={`${totalArrivage > 0 ? "text-amber-700" : "text-gray-400"} text-xs font-bold uppercase tracking-wide mb-1`}>
                    En arrivage
                  </p>
                  <p className={`font-black text-2xl ${totalArrivage > 0 ? "text-amber-800" : "text-gray-500"}`}>
                    {formatPrix(totalArrivage)}
                  </p>
                  <p className={`${totalArrivage > 0 ? "text-amber-600" : "text-gray-400"} text-xs mt-2`}>
                    {enArrivage.length} produit(s) — {qteTotalArrivage} unite(s)
                  </p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
                  <p className="text-green-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Deja encaisse
                  </p>
                  <p className="font-black text-2xl text-green-700">{formatPrix(totalDejaVendu)}</p>
                  <p className="text-green-500 text-xs mt-2">
                    {commandes.filter(c => c.statut !== "Annule").length} commande(s)
                  </p>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
                  <p className="text-purple-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Potentiel total
                  </p>
                  <p className="font-black text-2xl text-purple-700">{formatPrix(totalPotentiel)}</p>
                  <p className="text-purple-500 text-xs mt-2">
                    Vendu + stock + arrivage
                  </p>
                </div>
              </div>

              {/* Alertes arrivage */}
              {arrivagesEnRetard.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="font-bold text-red-700 text-sm mb-2">
                    {arrivagesEnRetard.length} arrivage(s) en retard — {formatPrix(totalArrivageRetard)}
                  </p>
                  {arrivagesEnRetard.map(p => (
                    <p key={p.id} className="text-sm text-red-600">
                      {p.nom} — prevu le {formatDateArrivage(p.dateArrivage)}
                      <span className="font-bold"> ({Math.abs(p.jours)} jour(s) de retard)</span>
                    </p>
                  ))}
                  <Link to="/admin/products"
                    className="inline-block mt-2 text-xs font-bold text-red-700 underline">
                    Mettre a jour ces produits
                  </Link>
                </div>
              )}

              {arrivagesProches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="font-bold text-amber-800 text-sm mb-2">
                    Arrivages dans les 7 prochains jours
                  </p>
                  {arrivagesProches.map(p => (
                    <p key={p.id} className="text-sm text-amber-700">
                      {p.nom} — {p.jours === 0 ? "aujourd'hui" : `dans ${p.jours} jour(s)`}
                      {" "}({p.qteArrivage} unites, {formatPrix(p.valeurArrivage)})
                    </p>
                  ))}
                </div>
              )}

              {/* Detail des arrivages */}
              {enArrivage.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden mb-6">
                  <div className="p-4 border-b border-amber-100 bg-amber-50">
                    <h3 className="font-bold text-base text-amber-900">
                      Stock en arrivage
                      <span className="font-normal text-amber-600 text-sm ml-2">
                        ({enArrivage.length} produit(s))
                      </span>
                    </h3>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Marchandise commandee mais pas encore disponible a la vente
                    </p>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {enArrivage.map(p => {
                      const retard = p.jours !== null && p.jours < 0;
                      const imminent = p.jours !== null && p.jours >= 0 && p.jours <= 7;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {p.image
                                ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{p.nom}</p>
                              <p className={`text-xs ${retard ? "text-red-600 font-bold" : imminent ? "text-amber-700 font-bold" : "text-gray-400"}`}>
                                {formatDateArrivage(p.dateArrivage)}
                                {retard && ` — ${Math.abs(p.jours)}j de retard`}
                                {p.jours === 0 && " — aujourd'hui"}
                                {imminent && p.jours > 0 && ` — dans ${p.jours}j`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-sm text-amber-700">
                              {formatPrix(p.valeurArrivage)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.qteArrivage} x {formatPrix(p.prix)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-amber-100 bg-amber-50 flex justify-between">
                    <span className="font-bold text-sm text-amber-900">
                      Valeur totale en arrivage
                    </span>
                    <span className="font-black text-amber-900">{formatPrix(totalArrivage)}</span>
                  </div>
                </div>
              )}

              {/* Progression des ventes */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm">Repartition de ton capital marchandise</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden flex">
                  <div className="h-5 bg-green-500 transition-all duration-700"
                    style={{ width: `${totalPotentiel > 0 ? totalDejaVendu / totalPotentiel * 100 : 0}%` }} />
                  <div className="h-5 bg-blue-500 transition-all duration-700"
                    style={{ width: `${totalPotentiel > 0 ? totalValeurStock / totalPotentiel * 100 : 0}%` }} />
                  <div className="h-5 bg-amber-500 transition-all duration-700"
                    style={{ width: `${totalPotentiel > 0 ? totalArrivage / totalPotentiel * 100 : 0}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-xs text-gray-600">
                      Vendu — {formatPrix(totalDejaVendu)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-xs text-gray-600">
                      En magasin — {formatPrix(totalValeurStock)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-xs text-gray-600">
                      En arrivage — {formatPrix(totalArrivage)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recherche */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <input value={recherche} onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
              </div>

              {/* Filtres */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {[
                  { id: "tous", label: `Tous (${produitsAvecStats.length})` },
                  { id: "stock", label: `En stock (${produitsAvecStats.filter(p => p.stock > 0 && !p.rupture && !p.enArrivage).length})` },
                  { id: "arrivage", label: `En arrivage (${enArrivage.length})` },
                  { id: "rupture", label: `Rupture (${produitsAvecStats.filter(p => (p.rupture || p.stock === 0) && !p.enArrivage).length})` },
                  { id: "vendu", label: `Deja vendus (${produitsAvecStats.filter(p => p.quantiteVendue > 0).length})` },
                ].map(f => (
                  <button key={f.id} onClick={() => setFiltre(f.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${filtre === f.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tableau produits */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-bold uppercase tracking-wide">
                  <span className="col-span-4">Produit</span>
                  <span className="col-span-2 text-center">Stock</span>
                  <span className="col-span-2 text-center">Vendu</span>
                  <span className="col-span-2 text-right">Encaisse</span>
                  <span className="col-span-2 text-right">Valeur stock</span>
                </div>

                {produitsFiltres.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Aucun produit</div>
                ) : (
                  produitsFiltres.map((p, i) => (
                    <div key={p.id}
                      className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center ${i < produitsFiltres.length - 1 ? "border-b border-gray-50" : ""} hover:bg-gray-50 transition`}>

                      <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.image
                            ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{p.nom}</p>
                          <p className="text-gray-400 text-xs">{formatPrix(p.prix)} / unite</p>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 md:text-center">
                        {p.enArrivage ? (
                          <span className="text-amber-700 text-xs font-bold">
                            {p.qteArrivage} en arrivage
                          </span>
                        ) : p.rupture || p.stock === 0 ? (
                          <span className="text-red-500 text-xs font-bold">Rupture</span>
                        ) : (
                          <span className={`font-bold text-sm ${p.stock <= 5 ? "text-orange-500" : "text-gray-700"}`}>
                            {p.stock}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1 md:col-span-2 md:text-center text-right">
                        <span className={`font-bold text-sm ${p.quantiteVendue > 0 ? "text-green-600" : "text-gray-300"}`}>
                          {p.quantiteVendue > 0 ? p.quantiteVendue : "-"}
                        </span>
                      </div>

                      <div className="col-span-1 md:col-span-2 text-right">
                        <span className={`font-bold text-sm ${p.dejaVendu > 0 ? "text-green-600" : "text-gray-300"}`}>
                          {p.dejaVendu > 0 ? formatPrix(p.dejaVendu) : "-"}
                        </span>
                      </div>

                      <div className="col-span-1 md:col-span-2 text-right">
                        {p.enArrivage ? (
                          <span className="font-bold text-sm text-amber-700">
                            {formatPrix(p.valeurArrivage)}
                          </span>
                        ) : (
                          <span className={`font-bold text-sm ${p.valeurStock > 0 ? "text-blue-600" : "text-gray-300"}`}>
                            {p.valeurStock > 0 ? formatPrix(p.valeurStock) : "-"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}

                <div className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-4 items-center bg-gray-900 text-white">
                  <div className="col-span-2 md:col-span-4">
                    <p className="font-black text-sm">TOTAL</p>
                  </div>
                  <div className="hidden md:block md:col-span-2" />
                  <div className="hidden md:block md:col-span-2" />
                  <div className="col-span-1 md:col-span-2 text-right">
                    <p className="font-black text-sm text-green-400">{formatPrix(totalDejaVendu)}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2 text-right">
                    <p className="font-black text-sm text-blue-400">{formatPrix(totalValeurStock)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
