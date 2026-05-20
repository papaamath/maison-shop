import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    password: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
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
      setError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await updateProfile(user, {
        displayName: `${form.prenom} ${form.nom}`,
      });

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
        setError("Cet email est deja utilise.");
      } else {
        setError("Erreur lors de l'inscription. Reessayez.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-950 to-orange-500 p-4 rounded-3xl inline-block shadow-lg mb-4">
            <img
              src="/logo.jpeg"
              alt="B2S-STORE"
              className="h-14 w-auto object-contain mx-auto"
            />
          </div>

          <h1 className="font-black text-3xl text-blue-950">
            B2S
            <span className="text-orange-500">-STORE</span>
          </h1>

          <p className="text-gray-500 text-sm mt-2">
            Creez votre compte
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-blue-950 font-medium block mb-1">
                Prenom
              </label>

              <input
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                required
                className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="Mamadou"
              />
            </div>

            <div>
              <label className="text-sm text-blue-950 font-medium block mb-1">
                Nom
              </label>

              <input
                name="nom"
                value={form.nom}
                onChange={handleChange}
                required
                className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="Diallo"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-950 font-medium block mb-1">
              Email
            </label>

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="mamadou@email.com"
            />
          </div>

          <div>
            <label className="text-sm text-blue-950 font-medium block mb-1">
              Telephone
            </label>

            <input
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              required
              className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="+221 77 000 00 00"
            />
          </div>

          <div>
            <label className="text-sm text-blue-950 font-medium block mb-1">
              Mot de passe
            </label>

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-12"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 text-lg"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-950 font-medium block mb-1">
              Confirmer le mot de passe
            </label>

            <div className="relative">
              <input
                name="confirm"
                type={showPassword ? "text" : "password"}
                value={form.confirm}
                onChange={handleChange}
                required
                className="w-full border border-blue-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-12"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 text-lg"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-950 to-orange-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 shadow-lg"
          >
            {loading ? "Inscription..." : "Creer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Deja un compte ?{" "}
          <Link
            to="/login"
            className="text-orange-500 font-bold hover:text-orange-600"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}