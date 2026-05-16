import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";

const STATUS_STEPS = ["En attente", "Confirme", "En livraison", "Livre"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirme": "bg-blue-100 text-blue-700",
  "En livraison": "bg-purple-100 text-purple-700",
  "Livre": "bg-green-100 text-green-700",
  "Annule": "bg-red-100 text-red-700",
};

function formatDate(ts) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" });
}

function genererFacturePDF(cmd) {
  const date = formatDate(cmd.createdAt);
  const articles = cmd.articles?.map(a =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${a.nom}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${a.quantite}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${Number(a.prix).toLocaleString("fr-SN")} FCFA</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${Number(a.prix*a.quantite).toLocaleString("fr-SN")} FCFA</td>
    </tr>`
  ).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <title>Facture MAISON SHOP</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a18; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: 900; }
        .logo span { color: #C84B31; }
        .facture-info { text-align: right; }
        .facture-info h2 { font-size: 22px; color: #C84B31; margin: 0 0 8px; }
        .section { margin-bottom: 24px; }
        .section h3 { font-size: 13px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #1a1a18; color: white; padding: 10px 8px; text-align: left; font-size: 13px; }
        th:last-child, th:nth-child(3), th:nth-child(2) { text-align: right; }
        th:nth-child(2) { text-align: center; }
        .total-section { margin-left: auto; width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total-final { display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 900; border-top: 2px solid #1a1a18; margin-top: 8px; }
        .footer { margin-top: 60px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        .badge { display: inline-block; background: #EAF3DE; color: #3B6D11; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">MAISON<span>.</span></div>
          <p style="margin:4px 0;color:#888;font-size:13px;">Mbed Fass Yeumbeul, Dakar</p>
          <p style="margin:4px 0;color:#888;font-size:13px;">+221 76 873 07 31</p>
          <p style="margin:4px 0;color:#888;font-size:13px;">syllaissa875@gmail.com</p>
        </div>
        <div class="facture-info">
          <h2>FACTURE</h2>
          <p style="margin:4px 0;font-size:13px;">Date : ${date}</p>
          <p style="margin:4px 0;font-size:13px;color:#888;">Commande du ${date}</p>
          <div class="badge">Livree</div>
        </div>
      </div>

      <div class="section">
        <h3>Client</h3>
        <p style="margin:2px 0;font-weight:bold;">${cmd.client?.prenom} ${cmd.client?.nom}</p>
        <p style="margin:2px 0;color:#666;font-size:13px;">${cmd.client?.email}</p>
        <p style="margin:2px 0;color:#666;font-size:13px;">${cmd.client?.telephone}</p>
        <p style="margin:2px 0;color:#666;font-size:13px;">${cmd.modeLivraison==="retrait"?"Retrait en magasin":`${cmd.client?.adresse||""}, ${cmd.client?.ville||""}`}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th style="text-align:center;">Qte</th>
            <th style="text-align:right;">Prix unit.</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${articles}</tbody>
      </table>

      <div class="total-section">
        <div class="total-row"><span style="color:#666;">Sous-total</span><span>${Number(cmd.total - (cmd.livraison||0) + (cmd.reduction||0)).toLocaleString("fr-SN")} FCFA</span></div>
        ${cmd.reduction>0?`<div class="total-row"><span style="color:#3B6D11;">Reduction (${cmd.codePromo||""})</span><span style="color:#3B6D11;">- ${Number(cmd.reduction).toLocaleString("fr-SN")} FCFA</span></div>`:""}
        <div class="total-row"><span style="color:#666;">Livraison</span><span>${cmd.livraison===0?"Gratuite":Number(cmd.livraison).toLocaleString("fr-SN")+" FCFA"}</span></div>
        <div class="total-final"><span>TOTAL</span><span>${Number(cmd.total).toLocaleString("fr-SN")} FCFA</span></div>
      </div>

      <div class="footer">
        <p>Merci pour votre confiance ! Commande marquee comme livree le ${date}</p>
        <p style="margin-top:8px;">MAISON SHOP - Mbed Fass Yeumbeul, Dakar, Senegal - +221 76 873 07 31</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facture-maison-shop-${cmd.client?.nom||"client"}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
    setLoading(true); setCherche(true);
    try {
      const snap = await getDocs(collection(db, "commandes"));
      const toutes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtrees = toutes.filter(cmd => {
        if (type === "email") return cmd.client?.email?.toLowerCase() === recherche.toLowerCase();
        return cmd.client?.telephone?.replace(/\s/g,"") === recherche.replace(/\s/g,"");
      });
      filtrees.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setCommandes(filtrees);
    } catch(err) { console.error(err); }
    setLoading(false);
  }

  function getStepIndex(statut) { return STATUS_STEPS.indexOf(statut); }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">📦</p>
          <h1 className="font-black text-2xl md:text-3xl mb-2">Suivi de commande</h1>
          <p className="text-gray-400 text-sm">Entrez votre email ou telephone pour retrouver vos commandes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <form onSubmit={handleRecherche} className="space-y-4">
            <div className="flex gap-3">
              <button type="button" onClick={() => setType("email")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type==="email"?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200"}`}>
                Par email
              </button>
              <button type="button" onClick={() => setType("telephone")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type==="telephone"?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200"}`}>
                Par telephone
              </button>
            </div>
            <div className="flex gap-3">
              <input value={recherche} onChange={e => setRecherche(e.target.value)} required
                placeholder={type==="email"?"votre@email.com":"+221 77 000 00 00"}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              <button type="submit" disabled={loading}
                className="bg-gray-900 text-white px-5 py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50">
                {loading?"...":"Chercher"}
              </button>
            </div>
          </form>
        </div>

        {cherche && !loading && (
          <>
            {commandes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-3xl mb-4">Aucun resultat</p>
                <p className="font-bold text-lg mb-2">Aucune commande trouvee</p>
                <p className="text-gray-400 text-sm">Verifiez votre {type==="email"?"adresse email":"numero de telephone"}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-gray-500 text-sm">{commandes.length} commande(s) trouvee(s)</p>
                {commandes.map(cmd => (
                  <div key={cmd.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-base">Commande du {formatDate(cmd.createdAt)}</p>
                        <p className="text-gray-400 text-sm mt-1">{cmd.articles?.length} article(s)</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[cmd.statut]||"bg-gray-100 text-gray-600"}`}>
                          {cmd.statut}
                        </span>
                        {cmd.statut === "Livre" && (
                          <button onClick={() => genererFacturePDF(cmd)}
                            className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-green-700 transition">
                            Telecharger la facture
                          </button>
                        )}
                      </div>
                    </div>

                    {cmd.statut !== "Annule" && (
                      <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          {STATUS_STEPS.map((step, i) => (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${i<=getStepIndex(cmd.statut)?"bg-gray-900 text-white":"bg-gray-100 text-gray-400"}`}>
                                {i<=getStepIndex(cmd.statut)?"✓":i+1}
                              </div>
                              <p className={`text-xs text-center hidden sm:block ${i<=getStepIndex(cmd.statut)?"text-gray-700 font-medium":"text-gray-400"}`}>
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="relative h-1 bg-gray-100 rounded-full mx-3 -mt-4 mb-4">
                          <div className="absolute h-1 bg-gray-900 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, getStepIndex(cmd.statut)/(STATUS_STEPS.length-1)*100)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="p-5">
                      <p className="font-semibold text-sm mb-3">Articles commandes</p>
                      {cmd.articles?.map((a,i) => (
                        <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-50">
                          <span className="text-gray-700">{a.nom} x{a.quantite}</span>
                          <span className="font-medium">{formatPrix(a.prix*a.quantite)}</span>
                        </div>
                      ))}
                      {cmd.reduction>0 && (
                        <div className="flex justify-between text-sm py-2 border-b border-gray-50 text-green-600">
                          <span>Reduction ({cmd.codePromo})</span>
                          <span>- {formatPrix(cmd.reduction)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                        <span className="text-gray-500">Livraison</span>
                        <span>{cmd.livraison===0?"Gratuite":formatPrix(cmd.livraison)}</span>
                      </div>
                      <div className="flex justify-between font-black text-base pt-3">
                        <span>Total</span>
                        <span>{formatPrix(cmd.total)}</span>
                      </div>

                      {cmd.statut === "Livre" && (
                        <button onClick={() => genererFacturePDF(cmd)}
                          className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
                          Telecharger ma facture
                        </button>
                      )}
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
