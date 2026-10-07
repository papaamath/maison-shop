import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
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
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/scolaire", label: "Fournitures scolaires", active: true },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

const MOIS = [
  "Janvier","Fevrier","Mars","Avril","Mai","Juin",
  "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"
];

const CATEGORIES_ARTICLES = [
  "Cahiers", "Stylos / Bics", "Crayons", "Sacs", "Livres",
  "Trousses", "Calculatrices", "Papeterie", "Autre"
];

const CATEGORIES_DEPENSES = [
  "Achat de stock", "Transport", "Emballage", "Loyer", "Autre"
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

function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateLongue(ts) {
  if (!ts) return "-";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" });
}

function normalise(str) {
  return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Nettoie les accents pour jsPDF
function clean(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/[éèêë]/g, "e").replace(/[àâä]/g, "a").replace(/[ùûü]/g, "u")
    .replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/ç/g, "c")
    .replace(/[ÉÈÊË]/g, "E").replace(/[ÀÂÄ]/g, "A").replace(/[ÙÛÜ]/g, "U")
    .replace(/[ÎÏ]/g, "I").replace(/[ÔÖ]/g, "O").replace(/Ç/g, "C")
    .replace(/[’‘]/g, "'").replace(/[«»]/g, '"');
}

function montantTexte(n) {
  return Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

// Rend compatible les anciennes ventes (un seul article) et les nouvelles (plusieurs)
function normaliserVente(v) {
  if (Array.isArray(v.articles) && v.articles.length > 0) {
    const total = Number(v.total ?? v.articles.reduce((a, x) => a + Number(x.montant || 0), 0));
    return { ...v, articles: v.articles, total };
  }
  return {
    ...v,
    articles: [{
      articleId: v.articleId || null,
      nom: v.articleNom || "Article",
      categorie: v.categorie || "",
      quantite: Number(v.quantite || 0),
      prixUnitaire: Number(v.prixUnitaire || 0),
      prixAchatUnitaire: Number(v.prixAchatUnitaire || 0),
      montant: Number(v.montant || 0),
    }],
    total: Number(v.total ?? v.montant ?? 0),
  };
}

function margeVenteTotale(v) {
  return v.articles.reduce(
    (a, x) => a + (Number(x.prixUnitaire || 0) - Number(x.prixAchatUnitaire || 0)) * Number(x.quantite || 0),
    0
  );
}

function numeroFacture(v) {
  const d = v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000) : new Date();
  const an = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const suffixe = String(v.id || "").slice(-5).toUpperCase();
  return `FA-${an}${mois}-${suffixe}`;
}

// ===== FACTURE PDF =====
async function genererFacture(vente) {
  const v = normaliserVente(vente);
  const docu = new jsPDF();

  const NOIR = [26, 26, 24];
  const GRIS = [107, 107, 101];
  const GRIS_CLAIR = [245, 244, 240];
  const VERT = [34, 139, 34];
  const ORANGE = [249, 115, 22];

  // Bandeau
  docu.setFillColor(...NOIR);
  docu.rect(0, 0, 210, 48, "F");

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = "https://res.cloudinary.com/dy2tgofmf/image/upload/logo_k9rogt";
    });
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    cv.getContext("2d").drawImage(img, 0, 0);
    docu.addImage(cv.toDataURL("image/jpeg"), "JPEG", 12, 9, 30, 30);
  } catch {}

  docu.setTextColor(255, 255, 255);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(19);
  docu.text("B2S-STORE", 48, 20);
  docu.setFont("helvetica", "normal");
  docu.setFontSize(8.5);
  docu.text("Fournitures scolaires & articles divers", 48, 27);
  docu.text("Mbed Fass Yeumbeul, Dakar, Senegal", 48, 33);
  docu.text("+221 76 873 07 31  |  syllaissa875@gmail.com", 48, 39);

  docu.setFont("helvetica", "bold");
  docu.setFontSize(18);
  docu.text("FACTURE", 198, 19, { align: "right" });
  docu.setFont("helvetica", "normal");
  docu.setFontSize(9);
  docu.text(clean(numeroFacture(v)), 198, 27, { align: "right" });
  docu.text(clean(formatDateLongue(v.createdAt)), 198, 33, { align: "right" });

  // Badge paye
  docu.setFillColor(...VERT);
  docu.roundedRect(160, 37, 38, 8, 2, 2, "F");
  docu.setTextColor(255, 255, 255);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(8);
  docu.text("PAYE", 179, 42.5, { align: "center" });

  // Bloc client
  docu.setFillColor(...GRIS_CLAIR);
  docu.rect(0, 53, 210, 26, "F");

  docu.setTextColor(...GRIS);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(8);
  docu.text("CLIENT", 15, 62);

  docu.setTextColor(...NOIR);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(12);
  docu.text(clean(v.client || "Client comptoir"), 15, 71);

  docu.setFont("helvetica", "normal");
  docu.setFontSize(9);
  docu.setTextColor(...GRIS);
  docu.text(`Date : ${clean(formatDateLongue(v.createdAt))}`, 140, 71);

  // Tableau articles
  autoTable(docu, {
    startY: 87,
    head: [["Designation", "Qte", "Prix unitaire", "Montant"]],
    body: v.articles.map(a => [
      clean(a.nom),
      String(a.quantite),
      montantTexte(a.prixUnitaire),
      montantTexte(a.montant),
    ]),
    headStyles: {
      fillColor: NOIR, textColor: [255, 255, 255],
      fontStyle: "bold", fontSize: 9, cellPadding: 5,
    },
    bodyStyles: { fontSize: 9, cellPadding: 5, textColor: NOIR, overflow: "linebreak" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 37, halign: "right" },
      3: { cellWidth: 38, halign: "right" },
    },
    margin: { left: 15, right: 15 },
    styles: { lineColor: [225, 223, 219], lineWidth: 0.1 },
  });

  let y = docu.lastAutoTable.finalY + 12;

  // Total
  docu.setFillColor(...NOIR);
  docu.rect(125, y, 70, 14, "F");
  docu.setTextColor(255, 255, 255);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(11);
  docu.text("TOTAL", 131, y + 9);
  docu.text(montantTexte(v.total), 190, y + 9, { align: "right" });

  y += 24;

  // Mention reglement
  docu.setTextColor(...GRIS);
  docu.setFont("helvetica", "normal");
  docu.setFontSize(9);
  docu.text(
    `Facture acquittee le ${clean(formatDateLongue(v.createdAt))}. Montant recu : ${montantTexte(v.total)}.`,
    15, y
  );

  // Pied de page
  const h = docu.internal.pageSize.height;
  docu.setFillColor(...GRIS_CLAIR);
  docu.rect(0, h - 26, 210, 26, "F");
  docu.setDrawColor(...ORANGE);
  docu.setLineWidth(1.2);
  docu.line(0, h - 26, 210, h - 26);

  docu.setTextColor(...NOIR);
  docu.setFont("helvetica", "bold");
  docu.setFontSize(9);
  docu.text("Merci de votre confiance !", 105, h - 16, { align: "center" });
  docu.setFont("helvetica", "normal");
  docu.setFontSize(8);
  docu.setTextColor(...GRIS);
  docu.text(
    "B2S-STORE  |  Mbed Fass Yeumbeul, Dakar  |  +221 76 873 07 31  |  b2s-store.vercel.app",
    105, h - 9, { align: "center" }
  );

  const nomFichier = clean(v.client || "client").replace(/\s+/g, "-").toLowerCase();
  docu.save(`facture-${nomFichier}-${numeroFacture(v)}.pdf`);
}

const ARTICLE_VIDE = { nom: "", categorie: "Cahiers", prixAchat: "", prixVente: "", stock: "" };
const DEPENSE_VIDE = { description: "", montant: "", categorie: "Achat de stock" };
const LIGNE_VIDE = { articleId: "", quantite: "1", prixUnitaire: "" };

export default function Scolaire() {
  const [articles, setArticles] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onglet, setOnglet] = useState("bilan");
  const [saving, setSaving] = useState(false);

  const [moisSelectionne, setMoisSelectionne] = useState(new Date().getMonth());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());

  const [rechercheStock, setRechercheStock] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("Tous");
  const [rechercheVentes, setRechercheVentes] = useState("");

  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState(ARTICLE_VIDE);

  // ===== PANIER DE VENTE =====
  const [showVenteForm, setShowVenteForm] = useState(false);
  const [panier, setPanier] = useState([]);
  const [clientVente, setClientVente] = useState("");
  const [rechercheArticle, setRechercheArticle] = useState("");
  const [ligne, setLigne] = useState(LIGNE_VIDE);

  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const [depenseForm, setDepenseForm] = useState(DEPENSE_VIDE);

  const [showReappro, setShowReappro] = useState(null);
  const [reapproQte, setReapproQte] = useState("");

  useEffect(() => { charger(); }, []);

  async function charger() {
    const [artSnap, venSnap, depSnap] = await Promise.all([
      getDocs(collection(db, "scolaire_articles")),
      getDocs(collection(db, "scolaire_ventes")),
      getDocs(collection(db, "scolaire_depenses")),
    ]);
    setArticles(artSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setVentes(venSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setDepenses(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function estDansMois(ts, mois, annee) {
    if (!ts?.seconds) return false;
    const d = new Date(ts.seconds * 1000);
    return d.getMonth() === mois && d.getFullYear() === annee;
  }

  // ===== ARTICLES =====
  function ouvrirNouvelArticle() {
    setEditingArticle(null);
    setArticleForm(ARTICLE_VIDE);
    setShowArticleForm(true);
  }

  function ouvrirEditArticle(a) {
    setEditingArticle(a.id);
    setArticleForm({
      nom: a.nom || "", categorie: a.categorie || "Cahiers",
      prixAchat: a.prixAchat || "", prixVente: a.prixVente || "", stock: a.stock ?? "",
    });
    setShowArticleForm(true);
  }

  async function sauverArticle(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nom: articleForm.nom,
        categorie: articleForm.categorie,
        prixAchat: Number(articleForm.prixAchat || 0),
        prixVente: Number(articleForm.prixVente || 0),
        stock: Number(articleForm.stock || 0),
      };
      if (editingArticle) await updateDoc(doc(db, "scolaire_articles", editingArticle), data);
      else await addDoc(collection(db, "scolaire_articles"), { ...data, createdAt: serverTimestamp() });
      await charger();
      setShowArticleForm(false);
      setEditingArticle(null);
      setArticleForm(ARTICLE_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerArticle(id) {
    if (!confirm("Supprimer cet article ? L'historique des ventes sera conserve.")) return;
    await deleteDoc(doc(db, "scolaire_articles", id));
    await charger();
  }

  async function reapprovisionner(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const a = articles.find(x => x.id === showReappro);
      await updateDoc(doc(db, "scolaire_articles", showReappro), {
        stock: Number(a.stock || 0) + Number(reapproQte),
      });
      await charger();
      setShowReappro(null);
      setReapproQte("");
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  // ===== PANIER =====
  function ouvrirVente() {
    setPanier([]);
    setClientVente("");
    setLigne(LIGNE_VIDE);
    setRechercheArticle("");
    setShowVenteForm(true);
  }

  function choisirArticle(art) {
    setLigne({ articleId: art.id, quantite: "1", prixUnitaire: String(art.prixVente || "") });
    setRechercheArticle("");
  }

  function ajouterAuPanier() {
    const art = articles.find(a => a.id === ligne.articleId);
    if (!art) return;

    const qte = Number(ligne.quantite);
    const pu = Number(ligne.prixUnitaire);
    if (qte < 1 || pu < 1) { alert("Quantite et prix doivent etre renseignes."); return; }

    // Stock deja reserve dans le panier pour cet article
    const dejaDansPanier = panier
      .filter(l => l.articleId === art.id)
      .reduce((a, l) => a + l.quantite, 0);

    if (qte + dejaDansPanier > Number(art.stock || 0)) {
      alert(
        `Stock insuffisant pour "${art.nom}".\n` +
        `Disponible : ${art.stock}\n` +
        `Deja dans ce panier : ${dejaDansPanier}`
      );
      return;
    }

    setPanier(p => [...p, {
      articleId: art.id,
      nom: art.nom,
      categorie: art.categorie || "",
      quantite: qte,
      prixUnitaire: pu,
      prixAchatUnitaire: Number(art.prixAchat || 0),
      montant: qte * pu,
    }]);
    setLigne(LIGNE_VIDE);
  }

  function retirerDuPanier(index) {
    setPanier(p => p.filter((_, i) => i !== index));
  }

  const totalPanier = panier.reduce((a, l) => a + l.montant, 0);
  const margePanier = panier.reduce(
    (a, l) => a + (l.prixUnitaire - l.prixAchatUnitaire) * l.quantite, 0
  );

  async function validerVente(e) {
    e.preventDefault();
    if (panier.length === 0) { alert("Le panier est vide."); return; }

    setSaving(true);
    try {
      // Regroupe les quantites par article pour le decompte du stock
      const parArticle = {};
      panier.forEach(l => {
        parArticle[l.articleId] = (parArticle[l.articleId] || 0) + l.quantite;
      });

      // Verification finale du stock
      for (const [id, qte] of Object.entries(parArticle)) {
        const art = articles.find(a => a.id === id);
        if (!art || qte > Number(art.stock || 0)) {
          alert(`Stock insuffisant pour "${art?.nom || "un article"}".`);
          setSaving(false);
          return;
        }
      }

      await addDoc(collection(db, "scolaire_ventes"), {
        client: clientVente.trim(),
        articles: panier,
        total: totalPanier,
        createdAt: serverTimestamp(),
      });

      for (const [id, qte] of Object.entries(parArticle)) {
        const art = articles.find(a => a.id === id);
        await updateDoc(doc(db, "scolaire_articles", id), {
          stock: Number(art.stock || 0) - qte,
        });
      }

      await charger();
      setShowVenteForm(false);
      setPanier([]);
      setClientVente("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  async function supprimerVente(venteBrute) {
    if (!confirm("Supprimer cette vente ? Le stock sera remis.")) return;
    try {
      const v = normaliserVente(venteBrute);
      for (const l of v.articles) {
        if (!l.articleId) continue;
        const art = articles.find(a => a.id === l.articleId);
        if (art) {
          await updateDoc(doc(db, "scolaire_articles", l.articleId), {
            stock: Number(art.stock || 0) + Number(l.quantite || 0),
          });
        }
      }
      await deleteDoc(doc(db, "scolaire_ventes", venteBrute.id));
      await charger();
    } catch { alert("Erreur."); }
  }

  // ===== DEPENSES =====
  async function ajouterDepense(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "scolaire_depenses"), {
        description: depenseForm.description,
        montant: Number(depenseForm.montant),
        categorie: depenseForm.categorie,
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowDepenseForm(false);
      setDepenseForm(DEPENSE_VIDE);
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function supprimerDepense(id) {
    if (!confirm("Supprimer cette depense ?")) return;
    await deleteDoc(doc(db, "scolaire_depenses", id));
    await charger();
  }

  // ===== CALCULS =====
  const ventesN = ventes.map(normaliserVente);

  const totalRecettesGlobal = ventesN.reduce((a, v) => a + v.total, 0);
  const totalDepensesGlobal = depenses.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeGlobal = totalRecettesGlobal - totalDepensesGlobal;
  const valeurStock = articles.reduce((a, x) => a + Number(x.stock || 0) * Number(x.prixVente || 0), 0);
  const valeurStockAchat = articles.reduce((a, x) => a + Number(x.stock || 0) * Number(x.prixAchat || 0), 0);

  const ventesDuMois = ventesN.filter(v => estDansMois(v.createdAt, moisSelectionne, anneeSelectionnee));
  const depensesDuMois = depenses.filter(d => estDansMois(d.createdAt, moisSelectionne, anneeSelectionnee));
  const totalRecettesMois = ventesDuMois.reduce((a, v) => a + v.total, 0);
  const totalDepensesMois = depensesDuMois.reduce((a, d) => a + Number(d.montant || 0), 0);
  const beneficeMois = totalRecettesMois - totalDepensesMois;
  const margeMois = ventesDuMois.reduce((a, v) => a + margeVenteTotale(v), 0);

  const ruptures = articles.filter(a => Number(a.stock || 0) === 0);
  const stockFaible = articles.filter(a => { const s = Number(a.stock || 0); return s > 0 && s <= 5; });

  const ventesParArticle = {};
  ventesN.forEach(v => {
    v.articles.forEach(l => {
      if (!ventesParArticle[l.nom]) ventesParArticle[l.nom] = { nom: l.nom, quantite: 0, total: 0 };
      ventesParArticle[l.nom].quantite += Number(l.quantite || 0);
      ventesParArticle[l.nom].total += Number(l.montant || 0);
    });
  });
  const topArticles = Object.values(ventesParArticle).sort((a, b) => b.total - a.total);

  const annees = [...new Set([
    ...ventes.map(v => v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).getFullYear() : null),
    ...depenses.map(d => d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).getFullYear() : null),
    new Date().getFullYear(),
  ].filter(Boolean))].sort((a, b) => b - a);

  const categoriesPresentes = ["Tous", ...new Set(articles.map(a => a.categorie).filter(Boolean))];

  const articlesFiltres = articles
    .filter(a => {
      const matchCat = filtreCategorie === "Tous" || a.categorie === filtreCategorie;
      const matchNom = normalise(a.nom).includes(normalise(rechercheStock));
      return matchCat && matchNom;
    })
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));

  const valeurStockFiltree = articlesFiltres.reduce((a, x) => a + Number(x.stock || 0) * Number(x.prixVente || 0), 0);
  const achatStockFiltree = articlesFiltres.reduce((a, x) => a + Number(x.stock || 0) * Number(x.prixAchat || 0), 0);

  const ventesFiltrees = ventesN
    .filter(v => {
      const q = normalise(rechercheVentes);
      if (!q) return true;
      return normalise(v.client).includes(q) ||
        v.articles.some(l => normalise(l.nom).includes(q));
    })
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const totalVentesFiltrees = ventesFiltrees.reduce((a, v) => a + v.total, 0);

  const articlesPourVente = articles.filter(a =>
    normalise(a.nom).includes(normalise(rechercheArticle))
  );

  const articleLigne = articles.find(a => a.id === ligne.articleId);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Fournitures scolaires</h2>
              <p className="text-gray-400 text-sm mt-1">Stock, ventes et depenses — comptabilite separee</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowDepenseForm(true)}
                className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
                + Depense
              </button>
              <button onClick={ouvrirVente}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                + Vente
              </button>
              <button onClick={ouvrirNouvelArticle}
                className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
                + Article
              </button>
            </div>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-600 text-xs font-bold uppercase mb-1">Total recettes</p>
                  <p className="font-black text-lg text-green-700">{formatPrix(totalRecettesGlobal)}</p>
                  <p className="text-green-500 text-xs mt-1">{ventes.length} vente(s)</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-xs font-bold uppercase mb-1">Total depenses</p>
                  <p className="font-black text-lg text-red-700">{formatPrix(totalDepensesGlobal)}</p>
                  <p className="text-red-500 text-xs mt-1">{depenses.length} depense(s)</p>
                </div>
                <div className={`${beneficeGlobal >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-2xl p-4`}>
                  <p className={`${beneficeGlobal >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold uppercase mb-1`}>Benefice net</p>
                  <p className={`font-black text-lg ${beneficeGlobal >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {beneficeGlobal >= 0 ? "+" : ""}{formatPrix(beneficeGlobal)}
                  </p>
                </div>
                <div className="bg-gray-100 border border-gray-300 rounded-2xl p-4">
                  <p className="text-gray-600 text-xs font-bold uppercase mb-1">Achat total du stock</p>
                  <p className="font-black text-lg text-gray-800">{formatPrix(valeurStockAchat)}</p>
                  <p className="text-gray-500 text-xs mt-1">Ce que le stock t'a coute</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <p className="text-purple-600 text-xs font-bold uppercase mb-1">Valeur de revente</p>
                  <p className="font-black text-lg text-purple-700">{formatPrix(valeurStock)}</p>
                  <p className="text-purple-500 text-xs mt-1">
                    Marge : {formatPrix(valeurStock - valeurStockAchat)}
                  </p>
                </div>
              </div>

              {(ruptures.length > 0 || stockFaible.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {ruptures.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="font-bold text-red-700 mb-2 text-sm">Ruptures de stock ({ruptures.length})</p>
                      {ruptures.map(a => <p key={a.id} className="text-sm text-red-600">- {a.nom}</p>)}
                    </div>
                  )}
                  {stockFaible.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="font-bold text-orange-700 mb-2 text-sm">Stock faible ({stockFaible.length})</p>
                      {stockFaible.map(a => (
                        <p key={a.id} className="text-sm text-orange-600">- {a.nom} ({a.stock} restant)</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap mb-6">
                {[
                  { id: "bilan", label: "Bilan du mois" },
                  { id: "stock", label: `Mon stock (${articles.length})` },
                  { id: "ventes", label: `Ventes (${ventes.length})` },
                  { id: "depenses", label: `Depenses (${depenses.length})` },
                ].map(o => (
                  <button key={o.id} onClick={() => setOnglet(o.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${onglet === o.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                    {o.label}
                  </button>
                ))}
              </div>

              {/* ===== BILAN ===== */}
              {onglet === "bilan" && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center gap-4 flex-wrap">
                    <select value={moisSelectionne} onChange={e => setMoisSelectionne(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
                      {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anneeSelectionnee} onChange={e => setAnneeSelectionnee(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none bg-white font-medium">
                      {annees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-green-600 text-xs font-bold mb-1">Recettes du mois</p>
                      <p className="font-black text-lg text-green-700">{formatPrix(totalRecettesMois)}</p>
                      <p className="text-green-500 text-xs mt-1">{ventesDuMois.length} vente(s)</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-xs font-bold mb-1">Depenses du mois</p>
                      <p className="font-black text-lg text-red-700">{formatPrix(totalDepensesMois)}</p>
                      <p className="text-red-500 text-xs mt-1">{depensesDuMois.length} depense(s)</p>
                    </div>
                    <div className={`${beneficeMois >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded-xl p-4`}>
                      <p className={`${beneficeMois >= 0 ? "text-blue-600" : "text-orange-600"} text-xs font-bold mb-1`}>Benefice du mois</p>
                      <p className={`font-black text-lg ${beneficeMois >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                        {beneficeMois >= 0 ? "+" : ""}{formatPrix(beneficeMois)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-indigo-600 text-xs font-bold mb-1">Marge sur ventes</p>
                      <p className="font-black text-lg text-indigo-700">{formatPrix(margeMois)}</p>
                      <p className="text-indigo-500 text-xs mt-1">Vente - achat</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-sm">Ventes de {MOIS[moisSelectionne]}</h3>
                    </div>
                    {ventesDuMois.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucune vente ce mois-ci</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {[...ventesDuMois].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(v => (
                          <div key={v.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {v.client || "Client comptoir"}
                              </p>
                              <p className="text-gray-400 text-xs truncate">
                                {formatDate(v.createdAt)} — {v.articles.map(l => `${l.nom} x${l.quantite}`).join(", ")}
                              </p>
                            </div>
                            <p className="font-black text-sm text-green-600 flex-shrink-0">
                              +{formatPrix(v.total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {ventesDuMois.length > 0 && (
                      <div className="p-4 border-t border-gray-100 flex justify-between bg-green-50">
                        <span className="font-bold text-sm text-green-700">Total</span>
                        <span className="font-black text-green-700">{formatPrix(totalRecettesMois)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-sm">Depenses de {MOIS[moisSelectionne]}</h3>
                    </div>
                    {depensesDuMois.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucune depense ce mois-ci</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {[...depensesDuMois].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(d => (
                          <div key={d.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{d.description}</p>
                              <p className="text-gray-400 text-xs">{formatDate(d.createdAt)} — {d.categorie}</p>
                            </div>
                            <p className="font-black text-sm text-red-600">-{formatPrix(d.montant)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {depensesDuMois.length > 0 && (
                      <div className="p-4 border-t border-gray-100 flex justify-between bg-red-50">
                        <span className="font-bold text-sm text-red-700">Total</span>
                        <span className="font-black text-red-700">{formatPrix(totalDepensesMois)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-2xl p-5 text-white">
                    <h3 className="font-black text-base mb-3">
                      Bilan Fournitures — {MOIS[moisSelectionne]} {anneeSelectionnee}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Recettes</p>
                        <p className="font-black text-green-400">{formatPrix(totalRecettesMois)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Depenses</p>
                        <p className="font-black text-red-400">{formatPrix(totalDepensesMois)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Benefice</p>
                        <p className={`font-black ${beneficeMois >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                          {beneficeMois >= 0 ? "+" : ""}{formatPrix(beneficeMois)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Stock restant</p>
                        <p className="font-black text-purple-400">{formatPrix(valeurStock)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ===== STOCK ===== */}
              {onglet === "stock" && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                    <input value={rechercheStock} onChange={e => setRechercheStock(e.target.value)}
                      placeholder="Rechercher un article..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 mb-3" />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {categoriesPresentes.map(c => (
                        <button key={c} onClick={() => setFiltreCategorie(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${filtreCategorie === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-gray-400 text-xs font-bold uppercase mb-1">Achat total</p>
                      <p className="font-black text-xl text-gray-800">{formatPrix(achatStockFiltree)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-gray-400 text-xs font-bold uppercase mb-1">Revente estimee</p>
                      <p className="font-black text-xl text-purple-700">{formatPrix(valeurStockFiltree)}</p>
                      <p className="text-indigo-500 text-xs mt-1">
                        Marge : {formatPrix(valeurStockFiltree - achatStockFiltree)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-base">
                        Mes articles
                        <span className="text-gray-400 font-normal ml-2 text-sm">({articlesFiltres.length})</span>
                      </h3>
                      <button onClick={ouvrirNouvelArticle}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
                        + Ajouter
                      </button>
                    </div>

                    {articlesFiltres.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <p className="font-semibold">
                          {articles.length === 0 ? "Aucun article enregistre" : "Aucun resultat"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {articlesFiltres.map(a => {
                          const stock = Number(a.stock || 0);
                          const pa = Number(a.prixAchat || 0);
                          const pv = Number(a.prixVente || 0);
                          return (
                            <div key={a.id} className="px-4 py-3">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm">{a.nom}</p>
                                  <p className="text-gray-400 text-xs">{a.categorie}</p>
                                  <div className="flex gap-3 mt-1 flex-wrap">
                                    <span className="text-xs text-gray-500">Achat : <b>{formatPrix(pa)}</b></span>
                                    <span className="text-xs text-gray-500">Vente : <b className="text-green-600">{formatPrix(pv)}</b></span>
                                    <span className="text-xs text-indigo-600">Marge : <b>{formatPrix(pv - pa)}</b></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {stock === 0 ? (
                                    <span className="text-red-500 text-xs font-bold">Rupture</span>
                                  ) : (
                                    <p className={`font-black text-lg ${stock <= 5 ? "text-orange-500" : "text-gray-800"}`}>
                                      {stock}
                                    </p>
                                  )}
                                  <p className="text-gray-400 text-xs">en stock</p>
                                </div>
                              </div>

                              {stock > 0 && (
                                <div className="flex gap-4 mt-2 pt-2 border-t border-gray-50 flex-wrap">
                                  <div>
                                    <span className="text-xs text-gray-400">Achat total : </span>
                                    <span className="text-xs font-black text-gray-700">{formatPrix(stock * pa)}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-400">Revente : </span>
                                    <span className="text-xs font-black text-purple-600">{formatPrix(stock * pv)}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-400">Gain : </span>
                                    <span className="text-xs font-black text-indigo-600">
                                      {formatPrix(stock * (pv - pa))}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 mt-2 flex-wrap">
                                <button onClick={() => { setShowReappro(a.id); setReapproQte(""); }}
                                  className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-100">
                                  + Reapprovisionner
                                </button>
                                <button onClick={() => ouvrirEditArticle(a)}
                                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-gray-200">
                                  Editer
                                </button>
                                <button onClick={() => supprimerArticle(a.id)}
                                  className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100">
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {articlesFiltres.length > 0 && (
                      <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-sm text-gray-700">Achat total</span>
                          <span className="font-black text-gray-800">{formatPrix(achatStockFiltree)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-sm text-purple-700">Valeur de revente</span>
                          <span className="font-black text-purple-700">{formatPrix(valeurStockFiltree)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ===== VENTES ===== */}
              {onglet === "ventes" && (
                <>
                  {topArticles.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <h3 className="font-bold text-sm mb-4">Top articles vendus</h3>
                      <div className="space-y-2">
                        {topArticles.slice(0, 5).map((a, i) => (
                          <div key={a.nom} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-black">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-sm">{a.nom}</p>
                                <p className="text-gray-400 text-xs">{a.quantite} unite(s)</p>
                              </div>
                            </div>
                            <p className="font-black text-sm">{formatPrix(a.total)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                    <input value={rechercheVentes} onChange={e => setRechercheVentes(e.target.value)}
                      placeholder="Rechercher par client ou par article..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
                    {rechercheVentes && (
                      <p className="text-xs text-gray-500 mt-2">
                        {ventesFiltrees.length} resultat(s) — total {formatPrix(totalVentesFiltrees)}
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-base">
                        Historique des ventes
                        <span className="text-gray-400 font-normal ml-2 text-sm">({ventesFiltrees.length})</span>
                      </h3>
                      <button onClick={ouvrirVente}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                        + Vente
                      </button>
                    </div>

                    {ventesFiltrees.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        {ventes.length === 0 ? "Aucune vente enregistree" : "Aucun resultat"}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {ventesFiltrees.map(v => (
                          <div key={v.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <p className="font-bold text-sm">
                                  {v.client || "Client comptoir"}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {formatDate(v.createdAt)} — {numeroFacture(v)}
                                </p>
                              </div>
                              <p className="font-black text-sm text-green-600 flex-shrink-0">
                                +{formatPrix(v.total)}
                              </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                              {v.articles.map((l, i) => (
                                <div key={i} className="flex justify-between text-xs py-0.5">
                                  <span className="text-gray-600">
                                    {l.nom} x{l.quantite}
                                    <span className="text-gray-400"> a {formatPrix(l.prixUnitaire)}</span>
                                  </span>
                                  <span className="font-medium text-gray-700">{formatPrix(l.montant)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <button onClick={() => genererFacture(v)}
                                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                                Telecharger la facture
                              </button>
                              <button onClick={() => supprimerVente(v)}
                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition">
                                Supprimer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-4 border-t border-gray-100 flex justify-between bg-green-50">
                      <span className="font-bold text-sm text-green-700">
                        {rechercheVentes ? "Total de la recherche" : "Total general"}
                      </span>
                      <span className="font-black text-green-700">
                        {formatPrix(rechercheVentes ? totalVentesFiltrees : totalRecettesGlobal)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ===== DEPENSES ===== */}
              {onglet === "depenses" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-base">Toutes les depenses</h3>
                    <button onClick={() => setShowDepenseForm(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                      + Depense
                    </button>
                  </div>
                  {depenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">Aucune depense enregistree</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {[...depenses].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(d => (
                        <div key={d.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{d.description}</p>
                            <p className="text-gray-400 text-xs">{formatDate(d.createdAt)} — {d.categorie}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-black text-sm text-red-600">-{formatPrix(d.montant)}</p>
                            <button onClick={() => supprimerDepense(d.id)}
                              className="text-gray-300 hover:text-red-500 transition text-lg">x</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-4 border-t border-gray-100 flex justify-between bg-red-50">
                    <span className="font-bold text-sm text-red-700">Total general</span>
                    <span className="font-black text-red-700">{formatPrix(totalDepensesGlobal)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ===== MODAL VENTE (PANIER) ===== */}
      {showVenteForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Nouvelle vente</h3>
              <button onClick={() => setShowVenteForm(false)} className="text-gray-400 text-xl">X</button>
            </div>

            {articles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Ajoute d'abord des articles a ton stock.</p>
                <button onClick={() => { setShowVenteForm(false); ouvrirNouvelArticle(); }}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium">
                  + Creer un article
                </button>
              </div>
            ) : (
              <form onSubmit={validerVente} className="space-y-5">

                {/* Client */}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Nom du client <span className="text-gray-400 font-normal">(pour la facture)</span>
                  </label>
                  <input value={clientVente} onChange={e => setClientVente(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Ex: Fatou Sow" />
                </div>

                {/* Ajout d'une ligne */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="font-bold text-sm">Ajouter un article</p>

                  {!articleLigne ? (
                    <div>
                      <input value={rechercheArticle}
                        onChange={e => setRechercheArticle(e.target.value)}
                        placeholder="Tape les premieres lettres..."
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white" />
                      <div className="mt-2 bg-white border border-gray-100 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {articlesPourVente.length === 0 ? (
                          <p className="text-center py-5 text-gray-400 text-sm">Aucun article trouve</p>
                        ) : (
                          articlesPourVente.map(a => {
                            const dejaPris = panier
                              .filter(l => l.articleId === a.id)
                              .reduce((s, l) => s + l.quantite, 0);
                            const dispo = Number(a.stock || 0) - dejaPris;
                            return (
                              <button key={a.id} type="button" disabled={dispo <= 0}
                                onClick={() => choisirArticle(a)}
                                className={`w-full text-left px-3 py-2.5 transition ${dispo <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{a.nom}</p>
                                    <p className="text-gray-400 text-xs">
                                      {a.categorie} — {formatPrix(a.prixVente || 0)}
                                    </p>
                                  </div>
                                  <span className={`text-xs font-bold flex-shrink-0 ${dispo <= 0 ? "text-red-500" : dispo <= 5 ? "text-orange-500" : "text-gray-500"}`}>
                                    {dispo <= 0 ? "Epuise" : `${dispo} dispo`}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-blue-900">{articleLigne.nom}</p>
                          <p className="text-blue-600 text-xs">
                            Stock : {articleLigne.stock} — achat {formatPrix(articleLigne.prixAchat || 0)}
                          </p>
                        </div>
                        <button type="button" onClick={() => setLigne(LIGNE_VIDE)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-bold flex-shrink-0">
                          Changer
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Quantite</label>
                          <input type="number" min="1" value={ligne.quantite}
                            onChange={e => setLigne(l => ({ ...l, quantite: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            Prix de vente <span className="text-orange-500 font-bold">*</span>
                          </label>
                          <input type="number" min="1" value={ligne.prixUnitaire}
                            onChange={e => setLigne(l => ({ ...l, prixUnitaire: e.target.value }))}
                            className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 bg-white font-bold" />
                        </div>
                      </div>

                      {ligne.quantite && ligne.prixUnitaire && (
                        <p className="text-sm font-bold text-gray-700">
                          Sous-total : {formatPrix(Number(ligne.quantite) * Number(ligne.prixUnitaire))}
                        </p>
                      )}

                      <button type="button" onClick={ajouterAuPanier}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-gray-700 transition">
                        Ajouter au panier
                      </button>
                    </div>
                  )}
                </div>

                {/* Panier */}
                <div>
                  <p className="font-bold text-sm mb-2">
                    Panier
                    <span className="text-gray-400 font-normal ml-2">({panier.length} ligne(s))</span>
                  </p>

                  {panier.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
                      Aucun article dans le panier
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {panier.map((l, i) => (
                        <div key={i}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{l.nom}</p>
                            <p className="text-gray-400 text-xs">
                              {l.quantite} x {formatPrix(l.prixUnitaire)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-black text-sm">{formatPrix(l.montant)}</span>
                            <button type="button" onClick={() => retirerDuPanier(i)}
                              className="text-gray-300 hover:text-red-500 text-lg transition">x</button>
                          </div>
                        </div>
                      ))}

                      <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
                        <span className="font-bold text-sm">TOTAL</span>
                        <span className="font-black text-lg">{formatPrix(totalPanier)}</span>
                      </div>
                    </div>
                  )}

                  {panier.length > 0 && (
                    <div className={`mt-2 border rounded-xl p-3 ${margePanier >= 0 ? "bg-indigo-50 border-indigo-200" : "bg-red-50 border-red-200"}`}>
                      <p className={`text-sm font-bold ${margePanier >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                        Marge sur cette vente : {margePanier >= 0 ? "+" : ""}{formatPrix(margePanier)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowVenteForm(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving || panier.length === 0}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-40">
                    {saving ? "Enregistrement..." : `Valider — ${formatPrix(totalPanier)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL ARTICLE ===== */}
      {showArticleForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">{editingArticle ? "Modifier l'article" : "Nouvel article"}</h3>
              <button onClick={() => { setShowArticleForm(false); setEditingArticle(null); }}
                className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={sauverArticle} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom de l'article</label>
                <input value={articleForm.nom}
                  onChange={e => setArticleForm(f => ({ ...f, nom: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Cahier 200 pages" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={articleForm.categorie}
                  onChange={e => setArticleForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_ARTICLES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix d'achat (FCFA)</label>
                  <input type="number" value={articleForm.prixAchat}
                    onChange={e => setArticleForm(f => ({ ...f, prixAchat: e.target.value }))} min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="300" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Prix de vente <span className="text-gray-400 font-normal">(indicatif)</span>
                  </label>
                  <input type="number" value={articleForm.prixVente}
                    onChange={e => setArticleForm(f => ({ ...f, prixVente: e.target.value }))} min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="500" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Quantite en stock</label>
                <input type="number" value={articleForm.stock}
                  onChange={e => setArticleForm(f => ({ ...f, stock: e.target.value }))} required min="0"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="50" />
              </div>

              {articleForm.prixAchat && articleForm.stock && (
                <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 space-y-1">
                  <p className="text-gray-700 text-sm font-bold">
                    Achat total : {formatPrix(Number(articleForm.prixAchat) * Number(articleForm.stock))}
                  </p>
                  {articleForm.prixVente && (
                    <p className="text-indigo-700 text-sm font-bold">
                      Gain potentiel : {formatPrix((Number(articleForm.prixVente) - Number(articleForm.prixAchat)) * Number(articleForm.stock))}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowArticleForm(false); setEditingArticle(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50">
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL REAPPRO ===== */}
      {showReappro && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">Reapprovisionner</h3>
              <button onClick={() => setShowReappro(null)} className="text-gray-400 text-xl">X</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {articles.find(a => a.id === showReappro)?.nom} — stock actuel :{" "}
              <b>{articles.find(a => a.id === showReappro)?.stock}</b>
            </p>
            <form onSubmit={reapprovisionner} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Quantite a ajouter</label>
                <input type="number" value={reapproQte} onChange={e => setReapproQte(e.target.value)}
                  required min="1" autoFocus
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="20" />
              </div>
              {reapproQte && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
                  <p className="text-sm text-green-700 font-bold">
                    Nouveau stock : {Number(articles.find(a => a.id === showReappro)?.stock || 0) + Number(reapproQte)}
                  </p>
                  <p className="text-xs text-green-600">
                    Cout : {formatPrix(Number(articles.find(a => a.id === showReappro)?.prixAchat || 0) * Number(reapproQte))}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowReappro(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? "..." : "Ajouter au stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DEPENSE ===== */}
      {showDepenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Nouvelle depense</h3>
              <button onClick={() => setShowDepenseForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={depenseForm.description}
                  onChange={e => setDepenseForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Achat 100 cahiers" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={depenseForm.montant}
                  onChange={e => setDepenseForm(f => ({ ...f, montant: e.target.value }))} required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="30000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={depenseForm.categorie}
                  onChange={e => setDepenseForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES_DEPENSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepenseForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
