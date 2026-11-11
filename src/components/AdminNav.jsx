import { Link, useLocation } from "react-router-dom";

// ====================================================================
//  LE MENU ADMIN — un seul endroit a modifier pour toutes les pages
//  Pour ajouter un module : ajoute une ligne dans ce tableau. C'est tout.
// ====================================================================
export const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/products", label: "Produits" },
  { to: "/admin/orders", label: "Commandes" },
  { to: "/admin/promos", label: "Promotions" },
  { to: "/admin/caisse", label: "Caisse" },
  { to: "/admin/dettes", label: "Mes dettes" },
  { to: "/admin/patrimoine", label: "Biens & charges" },
  { to: "/admin/journal", label: "Journal mensuel" },
  { to: "/admin/stock", label: "Valeur du stock" },
  { to: "/admin/photocopie", label: "Photocopie" },
  { to: "/admin/flocage", label: "Flocage" },
  { to: "/admin/reliure", label: "Reliure" },
  { to: "/admin/scolaire", label: "Fournitures scolaires" },
  { to: "/admin/affiche", label: "Affiche publicitaire" },
  { to: "/admin/associes", label: "Associes" },
  { to: "/shop", label: "Voir la boutique" },
];

// Determine le lien actif a partir de l'URL courante.
// "/admin" ne s'active que sur la racine, sinon il serait toujours actif.
function estActif(lien, chemin) {
  if (lien.to === "/admin") return chemin === "/admin";
  return chemin.startsWith(lien.to);
}

export function Sidebar() {
  const { pathname } = useLocation();

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
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              estActif(l, pathname)
                ? "bg-gray-700 text-white font-medium"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav({ open, setOpen }) {
  const { pathname } = useLocation();

  return (
    <>
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-8 w-auto object-contain rounded" />
          <span className="font-black text-white text-base">B2S-STORE</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white text-2xl">
          {open ? "X" : "≡"}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-gray-800 px-4 py-3 space-y-2 sticky top-12 z-40 max-h-96 overflow-y-auto">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                estActif(l, pathname)
                  ? "bg-gray-700 text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
