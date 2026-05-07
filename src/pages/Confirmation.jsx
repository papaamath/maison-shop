import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Confirmation() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <p className="text-6xl mb-6">🎉</p>
        <h1 className="font-black text-3xl mb-3">Commande confirmée !</h1>
        <p className="text-gray-500 max-w-md mb-8">
          Merci pour votre commande. Vous serez contacté par téléphone pour confirmer la livraison.
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-700 transition"
        >
          Continuer les achats
        </button>
      </div>
    </div>
  );
}