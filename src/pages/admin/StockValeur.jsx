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
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
  { to: "/admin/photocopie", label: "Photocopie" },
];

function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 bg-gray-900 min-h-screen flex-col fixed left-0 top-0">
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
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40">
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

export default function StockValeur() {
  const [produits, setProduits] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtre, setFiltre] = useState("tous");

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

  // Calcul des ventes par produit
  const ventesParProduit = {};
  commandes.forEach(cmd => {
    if (cmd.statut === "Annule") return;
    cmd.articles?.forEach(a => {
      if (!ventesParProduit[a.id]) ventesParProduit[a.id] = { quantite: 0, total: 0 };
      ventesParProduit[a.id].quantite += a.quantite;
      ventesParProduit[a.id].total += a.prix * a.quantite;
    });
  });

  // Enrichir les produits avec les stats
  const produitsAvecStats = produits.map(p => {
    const stock = Number(p.stock || 0);
    const prix = Number(p.prix || 0);
    const ventes = ventesParProduit[p.id] || { quantite: 0, total: 0 };
    const valeurStock = stock * prix;
    const dejaVendu = ventes.total;
    const quantiteVendue = ventes.quantite;

    return {
      ...p,
      stock,
      prix,
      valeurStock,
      dejaVendu,
      quantiteVendue,
    };
  });

  // Totaux globaux
  const totalValeurStock = produitsAvecStats.reduce((a, p) => a + p.valeurStock, 0);
  const totalDejaVendu = produitsAvecStats.reduce((a, p) => a + p.dejaVendu, 0);
  const totalPotentiel = totalValeurStock + totalDejaVendu;

  // Filtres
  const produitsFiltres = produitsAvecStats.filter(p => {
    if (filtre === "stock") return p.stock > 0 && !p.rupture;
    if (filtre === "rupture") return p.rupture || p.stock === 0;
    if (filtre === "vendu") return p.quantiteVendue > 0;
    return true;
  }).sort((a, b) => b.valeurStock - a.valeurStock);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="mb-6">
            <h2 className="font-black text-xl md:text-2xl">Valeur du stock</h2>
            <p className="text-gray-400 text-sm mt-1">
              Ce que tu gagnerais si tu vendais tout ton stock restant
            </p>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* Cartes resume */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* Valeur stock restant */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Si tu vendais tout le stock restant
                  </p>
                  <p className="font-black text-2xl text-blue-700">{formatPrix(totalValeurStock)}</p>
                  <p className="text-blue-500 text-xs mt-2">
                    {produitsAvecStats.filter(p => p.stock > 0).length} produit(s) en stock
                  </p>
                  <div className="mt-3 bg-blue-100 rounded-xl p-2">
                    <p className="text-blue-600 text-xs">
                      C'est ce que tu peux encore gagner avec ton stock actuel
                    </p>
                  </div>
                </div>

                {/* Deja vendu */}
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
                  <p className="text-green-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Deja encaisse (toutes commandes)
                  </p>
                  <p className="font-black text-2xl text-green-700">{formatPrix(totalDejaVendu)}</p>
                  <p className="text-green-500 text-xs mt-2">
                    {commandes.filter(c => c.statut !== "Annule").length} commande(s) validee(s)
                  </p>
                  <div className="mt-3 bg-green-100 rounded-xl p-2">
                    <p className="text-green-600 text-xs">
                      Chiffre d'affaires total depuis le debut
                    </p>
                  </div>
                </div>

                {/* Potentiel total */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
                  <p className="text-purple-600 text-xs font-bold uppercase tracking-wide mb-1">
                    Potentiel total (vendu + stock)
                  </p>
                  <p className="font-black text-2xl text-purple-700">{formatPrix(totalPotentiel)}</p>
                  <p className="text-purple-500 text-xs mt-2">
                    Si tout est vendu
                  </p>
                  <div className="mt-3 bg-purple-100 rounded-xl p-2">
                    <p className="text-purple-600 text-xs">
                      Vendu : {Math.round(totalDejaVendu / totalPotentiel * 100) || 0}% — 
                      Restant : {Math.round(totalValeurStock / totalPotentiel * 100) || 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Barre de progression globale */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm">Progression des ventes</p>
                  <p className="text-sm font-black text-gray-600">
                    {Math.round(totalDejaVendu / totalPotentiel * 100) || 0}% vendu
                  </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round(totalDejaVendu / totalPotentiel * 100) || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Vendu : {formatPrix(totalDejaVendu)}</span>
                  <span>Restant : {formatPrix(totalValeurStock)}</span>
                </div>
              </div>

              {/* Filtres */}
              <div className="flex gap-2 flex-wrap mb-4">
                {[
                  { id: "tous", label: `Tous (${produitsAvecStats.length})` },
                  { id: "stock", label: `En stock (${produitsAvecStats.filter(p => p.stock > 0 && !p.rupture).length})` },
                  { id: "rupture", label: `Rupture (${produitsAvecStats.filter(p => p.rupture || p.stock === 0).length})` },
                  { id: "vendu", label: `Deja vendus (${produitsAvecStats.filter(p => p.quantiteVendue > 0).length})` },
                ].map(f => (
                  <button key={f.id} onClick={() => setFiltre(f.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${filtre === f.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Liste des produits */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-bold uppercase tracking-wide">
                  <span className="col-span-4">Produit</span>
                  <span className="col-span-2 text-center">Stock restant</span>
                  <span className="col-span-2 text-center">Quantite vendue</span>
                  <span className="col-span-2 text-right">Deja vendu</span>
                  <span className="col-span-2 text-right">Valeur stock</span>
                </div>

                {produitsFiltres.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Aucun produit</div>
                ) : (
                  produitsFiltres.map((p, i) => (
                    <div key={p.id}
                      className={`grid grid-cols-12 px-4 py-3 items-center ${i < produitsFiltres.length - 1 ? "border-b border-gray-50" : ""} hover:bg-gray-50 transition`}>
                      
                      {/* Produit */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.image
                            ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{p.nom}</p>
                          <p className="text-gray-400 text-xs">{formatPrix(p.prix)} / unite</p>
                        </div>
                      </div>

                      {/* Stock restant */}
                      <div className="col-span-2 text-center">
                        {p.rupture || p.stock === 0 ? (
                          <span className="text-red-500 text-xs font-bold">Rupture</span>
                        ) : (
                          <span className={`font-bold text-sm ${p.stock <= 5 ? "text-orange-500" : "text-gray-700"}`}>
                            {p.stock}
                          </span>
                        )}
                      </div>

                      {/* Quantite vendue */}
                      <div className="col-span-2 text-center">
                        <span className={`font-bold text-sm ${p.quantiteVendue > 0 ? "text-green-600" : "text-gray-300"}`}>
                          {p.quantiteVendue > 0 ? p.quantiteVendue : "-"}
                        </span>
                      </div>

                      {/* Deja vendu */}
                      <div className="col-span-2 text-right">
                        <span className={`font-bold text-sm ${p.dejaVendu > 0 ? "text-green-600" : "text-gray-300"}`}>
                          {p.dejaVendu > 0 ? formatPrix(p.dejaVendu) : "-"}
                        </span>
                      </div>

                      {/* Valeur stock restant */}
                      <div className="col-span-2 text-right">
                        <span className={`font-bold text-sm ${p.valeurStock > 0 ? "text-blue-600" : "text-gray-300"}`}>
                          {p.valeurStock > 0 ? formatPrix(p.valeurStock) : "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Total */}
                <div className="grid grid-cols-12 px-4 py-4 items-center bg-gray-900 text-white">
                  <div className="col-span-4">
                    <p className="font-black text-sm">TOTAL</p>
                  </div>
                  <div className="col-span-2" />
                  <div className="col-span-2" />
                  <div className="col-span-2 text-right">
                    <p className="font-black text-sm text-green-400">{formatPrix(totalDejaVendu)}</p>
                  </div>
                  <div className="col-span-2 text-right">
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

