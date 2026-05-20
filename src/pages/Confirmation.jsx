import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Confirmation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />

      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <div className="bg-gradient-to-r from-blue-950 to-orange-500 w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl">
          🎉
        </div>

        <h1 className="font-black text-3xl md:text-4xl mb-3 text-blue-950">
          Commande confirmée !
        </h1>

        <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
          Merci pour votre commande. Vous serez contacté par téléphone pour confirmer la livraison.
        </p>

        <button
          onClick={() => navigate("/shop")}
          className="bg-gradient-to-r from-blue-950 to-orange-500 text-white px-8 py-4 rounded-2xl font-black hover:opacity-90 transition shadow-lg"
        >
          Continuer les achats
        </button>
      </div>
    </div>
  );
}