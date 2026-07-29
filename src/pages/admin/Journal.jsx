import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/journal", label: "Journal mensuel", active: true },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

const MOIS = [
  "Janvier","Fevrier","Mars","Avril","Mai","Juin",
  "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"
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

function clean(str) {
  if (!str) return "";
  return String(str)
    .replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a").replace(/[ùûü]/g, "u")
    .replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/ç/g, "c")
    .replace(/[ÉÈÊË]/g, "E").replace(/[ÀÂÄ]/g, "A").replace(/[ÙÛÜ]/g, "U")
    .replace(/[ÎÏ]/g, "I").replace(/[ÔÖ]/g, "O").replace(/Ç/g, "C");
}

export default function Journal() {
  const [commandes, setCommandes] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moisSelectionne, setMoisSelectionne] = useState(new Date().getMonth());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [cmdSnap, depSnap] = await Promise.all([
      getDocs(collection(db, "commandes")),
      getDocs(collection(db, "depenses")),
    ]);
    setCommandes(cmdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setDepenses(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function estDansMois(ts, mois, annee) {
    if (!ts?.seconds) return false;
    const d = new Date(ts.seconds * 1000);
    return d.getMonth() === mois && d.getFullYear() === annee;
  }

  function formatDate(ts) {
    if (!ts?.seconds) return "-";
    return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", { day: "2-digit", month: "short" });
  }

  // Filtrer par mois selectionne
  const commandesDuMois = commandes.filter(c =>
    estDansMois(c.createdAt, moisSelectionne, anneeSelectionnee) && c.statut !== "Annule"
  );
  const depensesDuMois = depenses.filter(d =>
    estDansMois(d.createdAt, moisSelectionne, anneeSelectionnee)
  );

  const totalVentes = commandesDuMois.reduce((a, c) => a + Number(c.total || 0), 0);
  const totalDepenses = depensesDuMois.reduce((a, d) => a + Number(d.montant || 0), 0);
  const benefice = totalVentes - totalDepenses;

  // Top produits du mois
  const ventesParProduit = {};
  commandesDuMois.forEach(cmd => {
    cmd.articles?.forEach(a => {
      if (!ventesParProduit[a.nom]) ventesParProduit[a.nom] = { nom: a.nom, quantite: 0, total: 0 };
      ventesParProduit[a.nom].quantite += a.quantite;
      ventesParProduit[a.nom].total += a.prix * a.quantite;
    });
  });
  const topProduits = Object.values(ventesParProduit).sort((a, b) => b.total - a.total);

  // Annees disponibles
  const annees = [...new Set([
    ...commandes.map(c => c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).getFullYear() : null),
    ...depenses.map(d => d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).getFullYear() : null),
    new Date().getFullYear(),
  ].filter(Boolean))].sort((a, b) => b - a);

  function genererPDF() {
    const doc = new jsPDF();
    const noir = [26, 26, 24];
    const grisClair = [245, 244, 240];
    const vert = [59, 109, 17];
    const rouge = [200, 75, 49];

    // Header
    doc.setFillColor(...noir);
    doc.rect(0, 0, 210, 45, "F");

    // Logo
    try {
      doc.addImage("https://res.cloudinary.com/dy2tgofmf/image/upload/logo_k9rogt", "JPEG", 12, 8, 28, 28);
    } catch {}

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("B2S-STORE", 46, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Mbed Fass Yeumbeul, Dakar, Senegal", 46, 30);
    doc.text("+221 76 873 07 31  |  syllaissa875@gmail.com", 46, 37);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("JOURNAL MENSUEL", 195, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${MOIS[moisSelectionne]} ${anneeSelectionnee}`, 195, 30, { align: "right" });

    // Resume financier
    doc.setFillColor(...grisClair);
    doc.rect(0, 50, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("RECETTES", 20, 62);
    doc.text("DEPENSES", 80, 62);
    doc.text("BENEFICE NET", 145, 62);

    doc.setFontSize(14);
    doc.setTextColor(...vert);
    doc.text(`${totalVentes.toLocaleString("fr-SN")} FCFA`, 20, 75);

    doc.setTextColor(...rouge);
    doc.text(`${totalDepenses.toLocaleString("fr-SN")} FCFA`, 80, 75);

    doc.setTextColor(benefice >= 0 ? vert[0] : rouge[0], benefice >= 0 ? vert[1] : rouge[1], benefice >= 0 ? vert[2] : rouge[2]);
    doc.text(`${benefice >= 0 ? "+" : ""}${benefice.toLocaleString("fr-SN")} FCFA`, 145, 75);

    let y = 100;

    // Tableau ventes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...noir);
    doc.text(`Ventes du mois (${commandesDuMois.length} commandes)`, 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Client", "Articles", "Total"]],
      body: commandesDuMois.map(c => [
        formatDate(c.createdAt),
        clean(`${c.client?.prenom || ""} ${c.client?.nom || ""}`),
        (c.articles || []).map(a => `${clean(a.nom)} x${a.quantite}`).join(", "),
        `${Number(c.total || 0).toLocaleString("fr-SN")} FCFA`,
      ]),
      headStyles: { fillColor: noir, textColor: [255,255,255], fontStyle: "bold", fontSize: 8, cellPadding: 4 },
      bodyStyles: { fontSize: 8, cellPadding: 4, textColor: noir },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        3: { cellWidth: 40, halign: "right" },
      },
      margin: { left: 15, right: 15 },
      styles: { lineColor: [230, 228, 224], lineWidth: 0.1 },
      foot: [[
        "", "", "TOTAL VENTES",
        { content: `${totalVentes.toLocaleString("fr-SN")} FCFA`, styles: { fontStyle: "bold", textColor: vert, halign: "right" } }
      ]],
      footStyles: { fillColor: [240, 255, 240], textColor: vert, fontStyle: "bold", fontSize: 9 },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Tableau depenses
    if (depensesDuMois.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...noir);
      doc.text(`Depenses du mois (${depensesDuMois.length})`, 15, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Description", "Categorie", "Montant"]],
        body: depensesDuMois.map(d => [
          formatDate(d.createdAt),
          clean(d.description || "-"),
          clean(d.categorie || "-"),
          `${Number(d.montant || 0).toLocaleString("fr-SN")} FCFA`,
        ]),
        headStyles: { fillColor: [180, 30, 30], textColor: [255,255,255], fontStyle: "bold", fontSize: 8, cellPadding: 4 },
        bodyStyles: { fontSize: 8, cellPadding: 4, textColor: noir },
        alternateRowStyles: { fillColor: [255, 250, 250] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 80 },
          2: { cellWidth: 60 },
          3: { cellWidth: 30, halign: "right" },
        },
        margin: { left: 15, right: 15 },
        styles: { lineColor: [230, 228, 224], lineWidth: 0.1 },
        foot: [[
          "", "", "TOTAL DEPENSES",
          { content: `${totalDepenses.toLocaleString("fr-SN")} FCFA`, styles: { fontStyle: "bold", textColor: rouge, halign: "right" } }
        ]],
        footStyles: { fillColor: [255, 240, 240], textColor: rouge, fontStyle: "bold", fontSize: 9 },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // Top produits
    if (topProduits.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...noir);
      doc.text("Top produits vendus", 15, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Produit", "Quantite vendue", "Chiffre d'affaires"]],
        body: topProduits.map(p => [
          clean(p.nom),
          `${p.quantite} unite(s)`,
          `${Number(p.total).toLocaleString("fr-SN")} FCFA`,
        ]),
        headStyles: { fillColor: [30, 80, 160], textColor: [255,255,255], fontStyle: "bold", fontSize: 8, cellPadding: 4 },
        bodyStyles: { fontSize: 8, cellPadding: 4, textColor: noir },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 45, halign: "center" },
          2: { cellWidth: 45, halign: "right" },
        },
        margin: { left: 15, right: 15 },
        styles: { lineColor: [230, 228, 224], lineWidth: 0.1 },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // Bilan final
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFillColor(...noir);
    doc.rect(15, y, 180, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BILAN DU MOIS", 105, y + 10, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Recettes : ${totalVentes.toLocaleString("fr-SN")} FCFA`, 25, y + 22);
    doc.text(`Depenses : ${totalDepenses.toLocaleString("fr-SN")} FCFA`, 90, y + 22);
    doc.setTextColor(benefice >= 0 ? 100 : 255, benefice >= 0 ? 255 : 100, 100);
    doc.setFontSize(11);
    doc.text(`Benefice : ${benefice >= 0 ? "+" : ""}${benefice.toLocaleString("fr-SN")} FCFA`, 155, y + 22, { align: "right" });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(...grisClair);
    doc.rect(0, pageHeight - 20, 210, 20, "F");
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Journal genere le ${new Date().toLocaleDateString("fr-SN")} — B2S-STORE`, 105, pageHeight - 8, { align: "center" });

    doc.save(`journal-b2s-store-${MOIS[moisSelectionne]}-${anneeSelectionnee}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Journal Mensuel</h2>
              <p className="text-gray-400 text-sm mt-1">Rapport complet des ventes et depenses</p>
            </div>
            <button onClick={genererPDF}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition">
              Telecharger PDF
            </button>
          </div>

          {/* Selecteur mois/annee */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
            <select value={moisSelectionne} onChange={e => setMoisSelectionne(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
              {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anneeSelectionnee} onChange={e => setAnneeSelectionnee(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <p className="text-gray-500 text-sm font-medium">
              Rapport de {MOIS[moisSelectionne]} {anneeSelectionnee}
            </p>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              {/* 3 cartes resume */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <p className="text-green-600 text-xs font-bold uppercase tracking-wide mb-1">Recettes</p>
                  <p className="font-black text-2xl text-green-700">{formatPrix(totalVentes)}</p>
                  <p className="text-green-500 text-xs mt-1">{commandesDuMois.length} commande(s) livree(s)</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-red-600 text-xs font-bold uppercase tracking-wide mb-1">Depenses</p>
                  <p className="font-black text-2xl text-red-700">{formatPrix(totalDepenses)}</p>
                  <p className="text-red-500 text-xs mt-1">{depensesDuMois.length} depense(s)</p>
                </div>
                <div className={`${benefice >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-5`}>
                  <p className={`${benefice >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold uppercase tracking-wide mb-1`}>Benefice net</p>
                  <p className={`font-black text-2xl ${benefice >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {benefice >= 0 ? "+" : ""}{formatPrix(benefice)}
                  </p>
                  <p className={`${benefice >= 0 ? "text-blue-500" : "text-orange-500"} text-xs mt-1`}>
                    {benefice >= 0 ? "Benefice" : "Deficit"}
                  </p>
                </div>
              </div>

              {/* Ventes du mois */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-base">Ventes du mois ({commandesDuMois.length})</h3>
                </div>
                {commandesDuMois.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">Aucune vente ce mois-ci</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {commandesDuMois.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{c.client?.prenom} {c.client?.nom}</p>
                          <p className="text-gray-400 text-xs">{formatDate(c.createdAt)} — {c.articles?.length} article(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-green-600">+{formatPrix(Number(c.total))}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c.statut}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {commandesDuMois.length > 0 && (
                  <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-green-50">
                    <span className="font-bold text-sm text-green-700">Total ventes</span>
                    <span className="font-black text-green-700">{formatPrix(totalVentes)}</span>
                  </div>
                )}
              </div>

              {/* Depenses du mois */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-base">Depenses du mois ({depensesDuMois.length})</h3>
                </div>
                {depensesDuMois.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">Aucune depense ce mois-ci</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {depensesDuMois.map(d => (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{d.description}</p>
                          <p className="text-gray-400 text-xs">{formatDate(d.createdAt)} — {d.categorie}</p>
                        </div>
                        <p className="font-black text-sm text-red-600">-{formatPrix(Number(d.montant))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {depensesDuMois.length > 0 && (
                  <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-red-50">
                    <span className="font-bold text-sm text-red-700">Total depenses</span>
                    <span className="font-black text-red-700">{formatPrix(totalDepenses)}</span>
                  </div>
                )}
              </div>

              {/* Top produits */}
              {topProduits.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-base">Top produits vendus</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {topProduits.map((p, i) => (
                      <div key={p.nom} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{p.nom}</p>
                            <p className="text-gray-400 text-xs">{p.quantite} unite(s) vendue(s)</p>
                          </div>
                        </div>
                        <p className="font-black text-sm">{formatPrix(p.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bilan final */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <h3 className="font-black text-lg mb-4">Bilan de {MOIS[moisSelectionne]} {anneeSelectionnee}</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Recettes</p>
                    <p className="font-black text-green-400 text-lg">{formatPrix(totalVentes)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Depenses</p>
                    <p className="font-black text-red-400 text-lg">{formatPrix(totalDepenses)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Benefice</p>
                    <p className={`font-black text-lg ${benefice >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                      {benefice >= 0 ? "+" : ""}{formatPrix(benefice)}
                    </p>
                  </div>
                </div>
                <button onClick={genererPDF}
                  className="w-full bg-white text-gray-900 py-3 rounded-xl font-black hover:bg-gray-100 transition">
                  Telecharger le journal PDF
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
