import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";
import ImageUpload from "../../components/ImageUpload";

const CATEGORIES = ["Sport","Maillot","Electronique","Montres","Sacs","Toilettes","Femme","Papeterie","Accessoires"];

const FORM_VIDE = {
  nom: "",
  prix: "",
  categorie: "Sport",
  description: "",
  stock: "",
  image: "",
  rupture: false,
  tailles: "",
  prochainArrivage: false,
  dateArrivage: "",
  stockArrivage: "",
};

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits", active: true },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
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

function formatDateFr(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" });
}

function verifierEtDebloquerArrivage(produit) {
  if (!produit.prochainArrivage || !produit.dateArrivage) return null;
  const dateArrivage = new Date(produit.dateArrivage);
  const maintenant = new Date();
  if (maintenant >= dateArrivage) {
    return {
      stock: Number(produit.stockArrivage || 0),
      prochainArrivage: false,
      dateArrivage: null,
      stockArrivage: null,
      rupture: false,
    };
  }
  return null;
}

export default function AdminProducts() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { chargerProduits(); }, []);

  async function chargerProduits() {
    const snap = await getDocs(collection(db, "produits"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Verifie et debloque automatiquement les arrivages
    for (const p of data) {
      const mise_a_jour = verifierEtDebloquerArrivage(p);
      if (mise_a_jour) {
        await updateDoc(doc(db, "produits", p.id), mise_a_jour);
      }
    }

    const snapMaj = await getDocs(collection(db, "produits"));
    setProduits(snapMaj.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function ouvrirNouveauForm() {
    setEditing(null);
    setForm(FORM_VIDE);
    setShowForm(true);
  }

  function ouvrirEditForm(p) {
    setEditing(p.id);
    setForm({
      nom: p.nom || "",
      prix: p.prix || "",
      categorie: p.categorie || "Sport",
      description: p.description || "",
      stock: p.rupture ? "" : (p.stock || ""),
      image: p.image || "",
      rupture: p.rupture || Number(p.stock) === 0,
      tailles: p.tailles ? p.tailles.join(", ") : "",
      prochainArrivage: p.prochainArrivage || false,
      dateArrivage: p.dateArrivage || "",
      stockArrivage: p.stockArrivage || "",
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const data = {
      nom: form.nom,
      prix: Number(form.prix),
      categorie: form.categorie,
      description: form.description,
      stock: form.prochainArrivage ? 0 : (form.rupture ? 0 : Number(form.stock)),
      image: form.image,
      rupture: form.prochainArrivage ? true : form.rupture,
      tailles: form.tailles
        ? form.tailles.split(",").map(t => t.trim()).filter(t => t)
        : [],
      prochainArrivage: form.prochainArrivage,
      dateArrivage: form.prochainArrivage ? form.dateArrivage : null,
      stockArrivage: form.prochainArrivage ? Number(form.stockArrivage) : null,
    };
    try {
      if (editing) await updateDoc(doc(db, "produits", editing), data);
      else await addDoc(collection(db, "produits"), data);
      await chargerProduits();
      setShowForm(false);
    } catch { alert("Erreur lors de la sauvegarde."); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce produit ?")) return;
    await deleteDoc(doc(db, "produits", id));
    await chargerProduits();
  }

  async function toggleRupture(p) {
    await updateDoc(doc(db, "produits", p.id), {
      rupture: !p.rupture,
      stock: p.rupture ? (p.stockAvant || 0) : 0,
      stockAvant: p.rupture ? 0 : p.stock,
    });
    await chargerProduits();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Produits</h2>
              <p className="text-gray-400 text-sm mt-1">{produits.length} produit(s)</p>
            </div>
            <button onClick={ouvrirNouveauForm}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Nouveau
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <div className="space-y-3">
              {produits.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                  Aucun produit. Ajoutez-en un !
                </div>
              ) : produits.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.image
                        ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Photo</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{p.nom}</p>
                          <p className="text-gray-400 text-xs">{p.categorie}</p>
                          {/* Tailles */}
                          {p.tailles && p.tailles.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {p.tailles.map(t => (
                                <span key={t} className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Badge arrivage */}
                          {p.prochainArrivage && p.dateArrivage && (
                            <div className="mt-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 font-medium">
                              Arrivage le {formatDateFr(p.dateArrivage)} — {p.stockArrivage} unites prevues
                            </div>
                          )}
                        </div>
                        <p className="font-black text-sm text-gray-900 flex-shrink-0">{formatPrix(Number(p.prix || 0))}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {p.prochainArrivage ? (
                          <span className="text-blue-600 text-xs font-bold">Prochain arrivage</span>
                        ) : p.rupture || Number(p.stock) === 0 ? (
                          <span className="text-red-500 text-xs font-bold">Rupture de stock</span>
                        ) : (
                          <span className={`text-xs font-medium ${Number(p.stock) <= 5 ? "text-orange-500" : "text-green-600"}`}>
                            {p.stock} unites
                          </span>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => ouvrirEditForm(p)}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-gray-200">
                            Editer
                          </button>
                          {!p.prochainArrivage && (
                            <button onClick={() => toggleRupture(p)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium ${p.rupture || Number(p.stock) === 0 ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                              {p.rupture || Number(p.stock) === 0 ? "Reappro" : "Rupture"}
                            </button>
                          )}
                          <button onClick={() => handleDelete(p.id)}
                            className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100">
                            Suppr
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">{editing ? "Modifier" : "Nouveau produit"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">

              <div>
                <label className="text-sm text-gray-500 block mb-1">Nom du produit</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: Nike Air Max" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prix (FCFA)</label>
                  <input type="number" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="25000" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Stock {(form.rupture || form.prochainArrivage) && <span className="text-red-500">(indisponible)</span>}
                  </label>
                  <input type="number" value={(form.rupture || form.prochainArrivage) ? "" : form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    disabled={form.rupture || form.prochainArrivage}
                    required={!form.rupture && !form.prochainArrivage}
                    className={`w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 ${(form.rupture || form.prochainArrivage) ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    placeholder="10" />
                </div>
              </div>

              {/* Rupture de stock */}
              {!form.prochainArrivage && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <input type="checkbox" id="rupture" checked={form.rupture}
                    onChange={e => setForm(f => ({ ...f, rupture: e.target.checked, stock: e.target.checked ? "" : f.stock }))}
                    className="w-4 h-4 mt-0.5 accent-red-600" />
                  <label htmlFor="rupture" className="text-sm font-bold text-red-700 cursor-pointer">
                    Mettre en rupture de stock
                  </label>
                </div>
              )}

              {/* Prochain arrivage */}
              <div className={`border rounded-xl p-4 space-y-3 ${form.prochainArrivage ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="arrivage" checked={form.prochainArrivage}
                    onChange={e => setForm(f => ({ ...f, prochainArrivage: e.target.checked, rupture: false, stock: e.target.checked ? "" : f.stock }))}
                    className="w-4 h-4 mt-0.5 accent-blue-600" />
                  <div>
                    <label htmlFor="arrivage" className="text-sm font-bold text-blue-700 cursor-pointer">
                      Prochain arrivage
                    </label>
                    <p className="text-xs text-blue-500 mt-0.5">
                      Le produit sera visible mais non commandable jusqu'a la date d'arrivage
                    </p>
                  </div>
                </div>

                {form.prochainArrivage && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-blue-700 font-medium block mb-1">Date d'arrivage</label>
                      <input type="date" value={form.dateArrivage}
                        onChange={e => setForm(f => ({ ...f, dateArrivage: e.target.value }))}
                        required={form.prochainArrivage}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-sm text-blue-700 font-medium block mb-1">Quantite prevue</label>
                      <input type="number" value={form.stockArrivage}
                        onChange={e => setForm(f => ({ ...f, stockArrivage: e.target.value }))}
                        required={form.prochainArrivage}
                        min="1"
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder="20" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Categorie</label>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  placeholder="Description du produit..." />
              </div>

              {/* Tailles */}
              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Tailles / Pointures disponibles
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </label>
                <input value={form.tailles}
                  onChange={e => setForm(f => ({ ...f, tailles: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Ex: 38, 39, 40, 41, 42, 43" />
                <p className="text-xs text-gray-400 mt-1">Separez par des virgules. Laissez vide si pas de tailles.</p>
                {form.tailles && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {form.tailles.split(",").map(t => t.trim()).filter(t => t).map(t => (
                      <span key={t} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-lg font-bold">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <ImageUpload
                onUpload={url => setForm(f => ({ ...f, image: url }))}
                imageActuelle={form.image}
              />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50">
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
