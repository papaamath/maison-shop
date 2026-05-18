import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { cart, count } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-10 w-auto object-contain" />
          <span className="font-black text-xl tracking-tight hidden sm:block">B2S-STORE</span>
        </Link>

        {/* Menu desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-black transition">Accueil</Link>
          <Link to="/shop" className="hover:text-black transition">Boutique</Link>
          <Link to="/suivi" className="hover:text-black transition">Suivi commande</Link>
          <Link to="/contact" className="hover:text-black transition">Contact</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/checkout")}
            className="relative bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-700 transition">
            🛍
            <span className="hidden sm:inline">Panier</span>
            {count > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                👤 <span className="hidden sm:inline">{user.displayName?.split(" ")[0] || "Mon compte"}</span>
              </button>
              {userMenu && (
                <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-48 z-50">
                  <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 mb-1">{user.email}</p>
                  <button onClick={() => { navigate("/suivi"); setUserMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition">
                    Mes commandes
                  </button>
                  <button onClick={() => { logout(); setUserMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
                    Deconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition px-3 py-2">
                Connexion
              </Link>
              <Link to="/register" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
                S'inscrire
              </Link>
            </div>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden bg-gray-100 p-2 rounded-lg">
            {menuOpen ? "X" : "≡"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">Accueil</Link>
          <Link to="/shop" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">Boutique</Link>
          <Link to="/suivi" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">Suivi commande</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">Contact</Link>
          {user ? (
            <button onClick={() => { logout(); setMenuOpen(false); }} className="block text-sm font-medium text-red-600 py-2">
              Deconnexion
            </button>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">Connexion</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-red-600 py-2">S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
