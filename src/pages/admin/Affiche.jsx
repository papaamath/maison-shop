import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import html2canvas from "html2canvas";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire", active: true },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

const BLEU = "#0B2447";
const BLEU_CLAIR = "#19376D";
const ORANGE = "#F97316";
const ORANGE_PALE = "#FFF4EC";

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

export default function Affiche() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selection, setSelection] = useState([]);
  const [titre, setTitre] = useState("RENTREE SCOLAIRE 2026");
  const afficheRef = useRef(null);

  useEffect(() => { charger(); }, []);

  async function charger() {
    const snap = await getDocs(collection(db, "scolaire_articles"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setArticles(data);
    setSelection(data.filter(a => Number(a.stock || 0) > 0).map(a => a.id));
    setLoading(false);
  }

  function toggleArticle(id) {
    setSelection(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  const articlesAffiche = articles
    .filter(a => selection.includes(a.id))
    .sort((a, b) => Number(a.prixVente || 0) - Number(b.prixVente || 0));

  const moitie = Math.ceil(articlesAffiche.length / 2);
  const colG = articlesAffiche.slice(0, moitie);
  const colD = articlesAffiche.slice(moitie);

  async function telechargerImage() {
    if (!afficheRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(afficheRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const lien = document.createElement("a");
      lien.download = `b2s-store-fournitures-${new Date().toISOString().split("T")[0]}.png`;
      lien.href = canvas.toDataURL("image/png");
      lien.click();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la generation. Reessayez.");
    }
    setGenerating(false);
  }

  function partagerWhatsApp() {
    const lignes = articlesAffiche
      .map(a => `• ${a.nom} — ${Number(a.prixVente || 0).toLocaleString("fr-SN")} FCFA`)
      .join("\n");
    const texte = `*B2S-STORE — ${titre}*\n\n${lignes}\n\nLivraison rapide a Dakar\nCommandez : https://b2s-store.vercel.app\nWhatsApp : +221 76 873 07 31`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, "_blank");
  }

  // Carte produit de l'affiche
  const Carte = ({ a }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      background: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderLeft: `4px solid ${ORANGE}`,
      borderRadius: "10px",
      padding: "11px 14px",
      marginBottom: "9px",
    }}>
      <span style={{
        fontSize: "14px",
        color: "#0F172A",
        fontWeight: 600,
        lineHeight: 1.25,
        minWidth: 0,
        flex: 1,
      }}>
        {a.nom}
      </span>
      <span style={{
        background: ORANGE,
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 900,
        padding: "6px 12px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        {Number(a.prixVente || 0).toLocaleString("fr-SN")} F
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="mb-6">
            <h2 className="font-black text-xl md:text-2xl">Affiche publicitaire</h2>
            <p className="text-gray-400 text-sm mt-1">
              Coche tes articles, telecharge l'image, partage-la
            </p>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : articles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
              <p className="font-semibold">Aucun article enregistre</p>
              <Link to="/admin/scolaire"
                className="inline-block mt-4 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium">
                Aller aux fournitures
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* ===== PANNEAU GAUCHE ===== */}
              <div className="lg:col-span-2 space-y-4">

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="text-sm text-gray-500 block mb-1">Titre de l'affiche</label>
                  <input value={titre} onChange={e => setTitre(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 font-bold" />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm">
                      Articles
                      <span className="text-gray-400 font-normal ml-2">
                        ({selection.length}/{articles.length})
                      </span>
                    </h3>
                    <button
                      onClick={() => setSelection(
                        selection.length === articles.length ? [] : articles.map(a => a.id)
                      )}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900">
                      {selection.length === articles.length ? "Tout decocher" : "Tout cocher"}
                    </button>
                  </div>

                  <div className="max-h-[30rem] overflow-y-auto divide-y divide-gray-50">
                    {[...articles]
                      .sort((a, b) => (a.nom || "").localeCompare(b.nom || ""))
                      .map(a => {
                        const stock = Number(a.stock || 0);
                        const coche = selection.includes(a.id);
                        return (
                          <label key={a.id}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition">
                            <input type="checkbox" checked={coche}
                              onChange={() => toggleArticle(a.id)}
                              className="w-4 h-4 accent-gray-900 flex-shrink-0" />
                            <span className={`flex-1 text-sm truncate ${coche ? "" : "text-gray-400"}`}>
                              {a.nom}
                            </span>
                            {stock === 0 && (
                              <span className="text-xs text-red-500 flex-shrink-0">Rupture</span>
                            )}
                            <span className="text-sm font-bold text-gray-700 flex-shrink-0">
                              {formatPrix(a.prixVente || 0)}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <button onClick={telechargerImage} disabled={generating || selection.length === 0}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-700 transition disabled:opacity-40">
                  {generating ? "Generation..." : "Telecharger l'affiche"}
                </button>

                <button onClick={partagerWhatsApp} disabled={selection.length === 0}
                  className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-40">
                  Envoyer la liste sur WhatsApp
                </button>

                {articlesAffiche.length > 16 && (
                  <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    Tu as {articlesAffiche.length} articles coches. Au-dela de 16, l'affiche devient
                    longue et moins lisible — pense a en faire plusieurs par categorie.
                  </p>
                )}
              </div>

              {/* ===== APERCU ===== */}
              <div className="lg:col-span-3">
                <p className="text-sm text-gray-500 mb-3 font-medium">Apercu</p>
                <div className="bg-gray-200 rounded-xl p-4 overflow-x-auto">

                  <div ref={afficheRef}
                    style={{
                      width: "760px",
                      background: "#ffffff",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}>

                    {/* ===== EN-TETE ===== */}
                    <div style={{
                      background: `linear-gradient(135deg, ${BLEU} 0%, ${BLEU_CLAIR} 100%)`,
                      padding: "34px 48px 30px",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {/* Cercles decoratifs */}
                      <div style={{
                        position: "absolute", top: "-60px", right: "-40px",
                        width: "180px", height: "180px", borderRadius: "50%",
                        background: "rgba(249,115,22,0.18)",
                      }} />
                      <div style={{
                        position: "absolute", bottom: "-70px", left: "-50px",
                        width: "160px", height: "160px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                      }} />

                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "20px" }}>
                        <img src="/logo.jpeg" alt="B2S-STORE" crossOrigin="anonymous"
                          style={{
                            height: "82px", width: "82px", objectFit: "contain",
                            borderRadius: "14px", background: "#fff", padding: "6px",
                            flexShrink: 0,
                          }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            display: "inline-block", background: ORANGE,
                            padding: "5px 14px", borderRadius: "999px", marginBottom: "9px",
                          }}>
                            <span style={{
                              fontSize: "11px", fontWeight: 900, color: "#fff",
                              letterSpacing: "2px",
                            }}>
                              {titre.toUpperCase()}
                            </span>
                          </div>
                          <p style={{
                            fontSize: "40px", fontWeight: 900, margin: 0,
                            color: "#ffffff", letterSpacing: "1px", lineHeight: 1,
                          }}>
                            B2S-STORE
                          </p>
                          <p style={{
                            fontSize: "14px", margin: "8px 0 0",
                            color: ORANGE, fontWeight: 700, letterSpacing: "3px",
                          }}>
                            FOURNITURES SCOLAIRES
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ===== PRODUITS ===== */}
                    <div style={{ padding: "28px 48px 22px", background: "#ffffff" }}>
                      {articlesAffiche.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#9ca3af", padding: "60px 0", fontSize: "15px" }}>
                          Coche des articles pour les voir ici
                        </p>
                      ) : (
                        <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {colG.map(a => <Carte key={a.id} a={a} />)}
                          </div>
                          {colD.length > 0 && (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {colD.map(a => <Carte key={a.id} a={a} />)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ===== ARGUMENTS ===== */}
                    <div style={{
                      background: ORANGE_PALE,
                      padding: "16px 48px",
                      display: "flex",
                      justifyContent: "space-around",
                      gap: "12px",
                      borderTop: `2px solid ${ORANGE}`,
                      borderBottom: `2px solid ${ORANGE}`,
                    }}>
                      {[
                        "Livraison rapide a Dakar",
                        "Paiement a la livraison",
                        "Prix imbattables",
                      ].map(txt => (
                        <span key={txt} style={{
                          fontSize: "13px", fontWeight: 800, color: BLEU,
                          textAlign: "center",
                        }}>
                          {txt}
                        </span>
                      ))}
                    </div>

                    {/* ===== PIED DE PAGE ===== */}
                    <div style={{
                      background: BLEU,
                      padding: "26px 48px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "20px",
                    }}>
                      <div>
                        <p style={{
                          fontSize: "10px", margin: 0, color: ORANGE,
                          fontWeight: 900, letterSpacing: "2px",
                        }}>
                          COMMANDEZ MAINTENANT
                        </p>
                        <p style={{
                          fontSize: "32px", fontWeight: 900, margin: "5px 0 0",
                          color: "#ffffff", letterSpacing: "1px", lineHeight: 1,
                        }}>
                          76 873 07 31
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "13px", margin: 0, color: "#ffffff", fontWeight: 700 }}>
                          b2s-store.vercel.app
                        </p>
                        <p style={{ fontSize: "12px", margin: "5px 0 0", color: "rgba(255,255,255,0.75)" }}>
                          Mbed Fass Yeumbeul, Dakar
                        </p>
                        <p style={{ fontSize: "12px", margin: "2px 0 0", color: ORANGE, fontWeight: 800 }}>
                          Ouvert 24h/24 — 7j/7
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
