import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Link } from "react-router-dom";
import { formatPrix } from "../../utils/format";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/associes", label: "Associes", active: true },
  { to: "/shop", label: "Voir la boutique" },
  { to: "/admin/journal", label: "Journal mensuel" },
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

function formatDate(ts) {
  if (!ts?.seconds) return "-";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-SN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Associes() {
  const [associes, setAssocies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAddInvest, setShowAddInvest] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", email: "", montantInitial: "" });
  const [investForm, setInvestForm] = useState({ montant: "", description: "" });

  useEffect(() => { charger(); }, []);

  async function charger() {
    const snap = await getDocs(collection(db, "associes"));
    const data = await Promise.all(snap.docs.map(async d => {
      const invSnap = await getDocs(collection(db, "associes", d.id, "investissements"));
      const investissements = invSnap.docs.map(i => ({ id: i.id, ...i.data() }));
      investissements.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      const totalInvesti = investissements.reduce((a, i) => a + Number(i.montant || 0), 0);
      return { id: d.id, ...d.data(), investissements, totalInvesti };
    }));
    setAssocies(data);
    setLoading(false);
  }

  async function handleSaveAssocie(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { nom: form.nom, prenom: form.prenom, telephone: form.telephone, email: form.email, createdAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, "associes", editing), data);
      } else {
        const ref = await addDoc(collection(db, "associes"), data);
        if (form.montantInitial && Number(form.montantInitial) > 0) {
          await addDoc(collection(db, "associes", ref.id, "investissements"), {
            montant: Number(form.montantInitial),
            description: "Investissement initial",
            createdAt: serverTimestamp(),
          });
        }
      }
      await charger();
      setShowForm(false);
      setEditing(null);
      setForm({ nom: "", prenom: "", telephone: "", email: "", montantInitial: "" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function handleAddInvestissement(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "associes", showAddInvest, "investissements"), {
        montant: Number(investForm.montant),
        description: investForm.description || "Investissement",
        createdAt: serverTimestamp(),
      });
      await charger();
      setShowAddInvest(null);
      setInvestForm({ montant: "", description: "" });
    } catch { alert("Erreur."); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cet associe ?")) return;
    await deleteDoc(doc(db, "associes", id));
    await charger();
  }

  function ouvrirEdit(a) {
    setEditing(a.id);
    setForm({ nom: a.nom, prenom: a.prenom, telephone: a.telephone || "", email: a.email || "", montantInitial: "" });
    setShowForm(true);
  }

  const totalInvestissements = associes.reduce((a, as) => a + as.totalInvesti, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav open={menuOpen} setOpen={setMenuOpen} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-xl md:text-2xl">Associes / Investisseurs</h2>
              <p className="text-gray-400 text-sm mt-1">Gestion des parts et investissements</p>
            </div>
            <button onClick={() => { setShowForm(true); setEditing(null); setForm({ nom: "", prenom: "", telephone: "", email: "", montantInitial: "" }); }}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              + Ajouter un associe
            </button>
          </div>

          {loading ? <div className="text-gray-400">Chargement...</div> : (
            <>
              <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 mb-6 text-white">
                <p className="text-gray-300 text-sm mb-1">Total investi dans B2S-STORE</p>
                <p className="font-black text-3xl">{formatPrix(totalInvestissements)}</p>
                <p className="text-gray-400 text-sm mt-2">{associes.length} associe(s)</p>
              </div>

              {associes.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
                  <p className="text-3xl mb-3">Aucun associe</p>
                  <p className="text-sm">Ajoutez vos associes et investisseurs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {associes.map(a => {
                    const part = totalInvestissements > 0 ? Math.round(a.totalInvesti / totalInvestissements * 100) : 0;
                    return (
                      <div key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                              {(a.prenom?.[0] || "").toUpperCase()}{(a.nom?.[0] || "").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-lg">{a.prenom} {a.nom}</p>
                              {a.telephone && <p className="text-gray-400 text-sm">{a.telephone}</p>}
                              {a.email && <p className="text-gray-400 text-sm">{a.email}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-2xl text-green-600">{formatPrix(a.totalInvesti)}</p>
                            <p className="text-gray-400 text-sm">{part}% des parts</p>
                          </div>
                        </div>

                        <div className="px-5 pb-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Part dans la boutique</span>
                            <span>{part}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div className="bg-gray-900 h-2.5 rounded-full transition-all duration-500" style={{ width: `${part}%` }} />
                          </div>
                        </div>

                        {a.investissements.length > 0 && (
                          <div className="px-5 pb-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Historique des investissements</p>
                            <div className="space-y-1">
                              {a.investissements.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                                  <div>
                                    <span className="text-gray-700">{inv.description}</span>
                                    <span className="text-gray-400 text-xs ml-2">{formatDate(inv.createdAt)}</span>
                                  </div>
                                  <span className="font-bold text-green-600">+{formatPrix(inv.montant)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="px-5 pb-4 flex gap-2 flex-wrap">
                          <button onClick={() => setShowAddInvest(a.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                            + Ajouter un investissement
                          </button>
                          <button onClick={() => ouvrirEdit(a)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                            Modifier
                          </button>
                          <button onClick={() => handleDelete(a.id)}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">{editing ? "Modifier l'associe" : "Nouvel associe"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleSaveAssocie} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Prenom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="Mamadou" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Nom</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="Diallo" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Telephone</label>
                <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="+221 77 000 00 00" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="associe@email.com" />
              </div>
              {!editing && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Investissement initial (FCFA)</label>
                  <input type="number" value={form.montantInitial} onChange={e => setForm(f => ({ ...f, montantInitial: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="100000" />
                  <p className="text-xs text-gray-400 mt-1">Laissez vide si pas encore d'investissement</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                  {saving ? "Sauvegarde..." : editing ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddInvest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Ajouter un investissement</h3>
              <button onClick={() => setShowAddInvest(null)} className="text-gray-400 text-xl">X</button>
            </div>
            <form onSubmit={handleAddInvestissement} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant (FCFA)</label>
                <input type="number" value={investForm.montant} onChange={e => setInvestForm(f => ({ ...f, montant: e.target.value }))}
                  required min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="50000" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Description</label>
                <input value={investForm.description} onChange={e => setInvestForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" placeholder="Ex: Achat nouveau stock" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddInvest(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Ajout..." : "Ajouter l'investissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}