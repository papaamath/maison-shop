import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useState } from "react";

export default function Navbar() {
  const { cart, count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const total = cart.reduce((a, i) => a + i.prix * i.qty, 0);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="font-black text-2xl tracking-tight">
          MAISON<span className="text-red-600">.</span>
        </Link>

        {/* Menu desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-black transition">Accueil</Link>
          <Link to="/shop" className="hover:text-black transition">Boutique</Link>
          <Link to="/shop?cat=Vêtements" className="hover:text-black transition">Vêtements</Link>
          <Link to="/shop?cat=Accessoires" className="hover:text-black transition">Accessoires</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Recherche */}
          <button
            onClick={() => navigate("/shop")}
            className="hidden md:flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            🔍 Rechercher...
          </button>

          {/* Panier */}
          <button
            onClick={() => navigate("/checkout")}
            className="relative bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-700 transition"
          >
            🛍
            <span className="hidden sm:inline">Panier</span>
            {count > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                {count}
              </span>
            )}
          </button>

          {/* Menu mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden bg-gray-100 p-2 rounded-lg"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Menu mobile ouvert */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">
            🏠 Accueil
          </Link>
          <Link to="/shop" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">
            🛍 Boutique
          </Link>
          <Link to="/shop?cat=Vêtements" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2 border-b border-gray-50">
            👕 Vêtements
          </Link>
          <Link to="/shop?cat=Accessoires" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">
            👜 Accessoires
          </Link>
        </div>
      )}
    </nav>
  );
}