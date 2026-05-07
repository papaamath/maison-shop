import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { count } = useCart();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="font-black text-2xl tracking-tight">
        MAISON<span className="text-red-600">.</span>
      </Link>

      <div className="flex items-center gap-8 text-sm text-gray-600">
        <Link to="/" className="hover:text-black transition">Accueil</Link>
        <Link to="/shop" className="hover:text-black transition">Boutique</Link>
      </div>

      <Link to="/checkout" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-700 transition">
        🛍 Panier
        {count > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </Link>
    </nav>
  );
}