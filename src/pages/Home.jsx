import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-gray-900 text-white px-10 py-24 flex justify-between items-center">
        <div>
          <p className="text-red-500 font-semibold text-sm tracking-widest uppercase mb-4">Nouvelle Collection</p>
          <h1 className="font-black text-5xl leading-tight mb-6">Des pièces<br/>faites pour durer.</h1>
          <p className="text-gray-400 mb-8 max-w-md">Sélection artisanale, matières nobles, livraison soignée partout en France.</p>
          <Link to="/shop" className="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition">
            Découvrir la boutique →
          </Link>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 text-sm space-y-4 min-w-48">
          <div><p className="text-gray-400">Livraison gratuite</p><p className="font-semibold">Dès 80€ d'achat</p></div>
          <div><p className="text-gray-400">Retours</p><p className="font-semibold">30 jours offerts</p></div>
          <div><p className="text-gray-400">Paiement</p><p className="font-semibold">100% sécurisé</p></div>
        </div>
      </div>
    </div>
  );
}