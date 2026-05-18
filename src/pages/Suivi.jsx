import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";
import { formatPrix } from "../utils/format";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_STEPS = ["En attente", "Confirme", "En livraison", "Livre"];

const STATUS_COLORS = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "Confirme": "bg-blue-100 text-blue-700",
  "En livraison": "bg-purple-100 text-purple-700",
  "Livre": "bg-green-100 text-green-700",
  "Annule": "bg-red-100 text-red-700",
};

function formatDate(ts) {
  if (!ts?.seconds) return "-";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

// Remplace les caracteres speciaux pour jsPDF
function clean(str) {
  if (!str) return "";
  return String(str)
    .replace(/é/g, "e").replace(/è/g, "e").replace(/ê/g, "e").replace(/ë/g, "e")
    .replace(/à/g, "a").replace(/â/g, "a").replace(/ä/g, "a")
    .replace(/ù/g, "u").replace(/û/g, "u").replace(/ü/g, "u")
    .replace(/î/g, "i").replace(/ï/g, "i")
    .replace(/ô/g, "o").replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/É/g, "E").replace(/È/g, "E").replace(/Ê/g, "E")
    .replace(/À/g, "A").replace(/Â/g, "A")
    .replace(/Ù/g, "U").replace(/Û/g, "U")
    .replace(/Î/g, "I").replace(/Ô/g, "O")
    .replace(/Ç/g, "C");
}

async function genererFacturePDF(cmd) {
  const doc = new jsPDF();
  const date = formatDate(cmd.createdAt);

  const noir = [26, 26, 24];
  const rouge = [200, 75, 49];
  const gris = [107, 107, 101];
  const grisClair = [245, 244, 240];
  const vert = [59, 109, 17];

  // Header fond sombre
  doc.setFillColor(...noir);
  doc.rect(0, 0, 210, 50, "F");

  // Logo
  try {
    const logoUrl = "https://res.cloudinary.com/dy2tgofmf/image/upload/logo_k9rogt";
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = logoUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imgData = canvas.toDataURL("image/jpeg");
    doc.addImage(imgData, "JPEG", 12, 8, 30, 30);
  } catch {}

  // Nom boutique
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("B2S-STORE", 48, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Mbed Fass Yeumbeul, Dakar, Senegal", 48, 30);
  doc.text("+221 76 873 07 31  |  syllaissa875@gmail.com", 48, 37);

  // FACTURE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FACTURE", 195, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date : ${clean(date)}`, 195, 29, { align: "right" });

  // Badge LIVREE
  doc.setFillColor(...vert);
  doc.roundedRect(155, 34, 40, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LIVREE", 175, 40, { align: "center" });

  // Section client
  doc.setFillColor(...grisClair);
  doc.rect(0, 55, 210, 35, "F");

  doc.setTextColor(...gris);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INFORMATIONS CLIENT", 15, 65);

  doc.setTextColor(...noir);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(clean(`${cmd.client?.prenom || ""} ${cmd.client?.nom || ""}`), 15, 73);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.text(`Email : ${clean(cmd.client?.email || "")}`, 15, 79);
  doc.text(`Tel : ${clean(cmd.client?.telephone || "")}`, 15, 84);

  const adresse = cmd.modeLivraison === "retrait"
    ? "Retrait en magasin"
    : `${cmd.client?.adresse || ""}, ${cmd.client?.ville || ""}`;
  doc.text(`Adresse : ${clean(adresse)}`, 110, 79);

  // Tableau articles
  const lignes = (cmd.articles || []).map(a => [
    clean(a.nom),
    String(a.quantite),
    `${Number(a.prix).toLocaleString("fr-SN")} FCFA`,
    `${Number(a.prix * a.quantite).toLocaleString("fr-SN")} FCFA`,
  ]);

  autoTable(doc, {
    startY: 97,
    head: [["Article", "Qte", "Prix unitaire", "Total"]],
    body: lignes,
    headStyles: {
      fillColor: noir,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: noir,
    },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 45 },
      3: { halign: "right", cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    styles: { lineColor: [230, 228, 224], lineWidth: 0.1 },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  const xLabel = 130;
  const xValue = 195;
  let y = finalY;

  const sousTotal = Number(cmd.total) - Number(cmd.livraison || 0) + Number(cmd.reduction || 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.text("Sous-total :", xLabel, y);
  doc.setTextColor(...noir);
  doc.text(`${sousTotal.toLocaleString("fr-SN")} FCFA`, xValue, y, { align: "right" });
  y += 7;

  if (cmd.reduction > 0) {
    doc.setTextColor(...vert);
    doc.text(`Reduction (${clean(cmd.codePromo || "")}) :`, xLabel, y);
    doc.text(`- ${Number(cmd.reduction).toLocaleString("fr-SN")} FCFA`, xValue, y, { align: "right" });
    y += 7;
  }

  doc.setTextColor(...gris);
  doc.text("Livraison :", xLabel, y);
  doc.setTextColor(...noir);
  doc.text(
    cmd.livraison === 0 ? "Gratuite" : `${Number(cmd.livraison).toLocaleString("fr-SN")} FCFA`,
    xValue, y, { align: "right" }
  );
  y += 5;

  // Total final
  doc.setFillColor(...noir);
  doc.rect(xLabel - 5, y, 80, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL :", xLabel, y + 8);
  doc.text(`${Number(cmd.total).toLocaleString("fr-SN")} FCFA`, xValue, y + 8, { align: "right" });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...grisClair);
  doc.rect(0, pageHeight - 25, 210, 25, "F");
  doc.setTextColor(...gris);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Merci pour votre confiance !", 105, pageHeight - 15, { align: "center" });
  doc.text("B2S-STORE  |  Mbed Fass Yeumbeul, Dakar  |  +221 76 873 07 31", 105, pageHeight - 9, { align: "center" });

  doc.save(`facture-b2s-store-${clean(cmd.client?.nom || "client")}.pdf`);
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
        return cmd.client?.telephone?.replace(/\s/g, "") === recherche.replace(/\s/g, "");
      });
      filtrees.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCommandes(filtrees);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function getStepIndex(statut) { return STATUS_STEPS.indexOf(statut); }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="text-center mb-8">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-12 w-auto object-contain mx-auto mb-3" />
          <h1 className="font-black text-2xl md:text-3xl mb-2">Suivi de commande</h1>
          <p className="text-gray-400 text-sm">Entrez votre email ou telephone pour retrouver vos commandes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <form onSubmit={handleRecherche} className="space-y-4">
            <div className="flex gap-3">
              <button type="button" onClick={() => setType("email")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type === "email" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                Par email
              </button>
              <button type="button" onClick={() => setType("telephone")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${type === "telephone" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                Par telephone
              </button>
            </div>
            <div className="flex gap-3">
              <input value={recherche} onChange={e => setRecherche(e.target.value)} required
                placeholder={type === "email" ? "votre@email.com" : "+221 77 000 00 00"}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              <button type="submit" disabled={loading}
                className="bg-gray-900 text-white px-5 py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50">
                {loading ? "..." : "Chercher"}
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
                <p className="text-gray-400 text-sm">Verifiez votre {type === "email" ? "adresse email" : "numero de telephone"}</p>
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
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[cmd.statut] || "bg-gray-100 text-gray-600"}`}>
                          {cmd.statut}
                        </span>
                        {cmd.statut === "Livre" && (
                          <button onClick={() => genererFacturePDF(cmd)}
                            className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-green-700 transition">
                            Telecharger la facture PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {cmd.statut !== "Annule" && (
                      <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          {STATUS_STEPS.map((step, i) => (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${i <= getStepIndex(cmd.statut) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                                {i <= getStepIndex(cmd.statut) ? "v" : i + 1}
                              </div>
                              <p className={`text-xs text-center hidden sm:block ${i <= getStepIndex(cmd.statut) ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="relative h-1 bg-gray-100 rounded-full mx-3 -mt-3 mb-3">
                          <div className="absolute h-1 bg-gray-900 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, getStepIndex(cmd.statut) / (STATUS_STEPS.length - 1) * 100)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="p-5">
                      <p className="font-semibold text-sm mb-3">Articles commandes</p>
                      {cmd.articles?.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-50">
                          <span className="text-gray-700">{a.nom} x{a.quantite}</span>
                          <span className="font-medium">{formatPrix(a.prix * a.quantite)}</span>
                        </div>
                      ))}
                      {cmd.reduction > 0 && (
                        <div className="flex justify-between text-sm py-2 border-b border-gray-50 text-green-600">
                          <span>Reduction ({cmd.codePromo})</span>
                          <span>- {formatPrix(cmd.reduction)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                        <span className="text-gray-500">Livraison</span>
                        <span>{cmd.livraison === 0 ? "Gratuite" : formatPrix(cmd.livraison)}</span>
                      </div>
                      <div className="flex justify-between font-black text-base pt-3">
                        <span>Total</span>
                        <span>{formatPrix(cmd.total)}</span>
                      </div>
                      {cmd.statut === "Livre" && (
                        <button onClick={() => genererFacturePDF(cmd)}
                          className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
                          Telecharger ma facture PDF
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
