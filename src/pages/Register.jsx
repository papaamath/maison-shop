import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: `${form.prenom} ${form.nom}` });
      await setDoc(doc(db, "clients", user.uid), {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        createdAt: new Date(),
      });
      navigate("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé.");
      } else {
        setError("Erreur lors de l'inscription. Réessayez.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-black text-3xl">
            MAISON<span className="text-red-600">.</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Créez votre compte</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Prénom</label>
              <input
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                placeholder="Mamadou"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Nom</label>
              <input
                name="nom"
                value={form.nom}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                placeholder="Diallo"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="mamadou@email.com"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Téléphone</label>
            <input
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="+221 77 000 00 00"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Mot de passe</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Confirmer le mot de passe</label>
            <input
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? "Inscription..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-gray-900 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}