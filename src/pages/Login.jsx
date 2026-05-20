import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirect = location.state?.from || "/";

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(redirect);
    } catch {
      setError("Email ou mot de passe incorrect.");
    }

    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();

    setResetLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("Aucun compte trouve avec cet email.");
      } else {
        setError("Erreur lors de l'envoi. Reessayez.");
      }
    }

    setResetLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center px-4">
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
            {resetMode
              ? "Reinitialiser votre mot de passe"
              : "Connectez-vous a votre compte"}
          </p>
        </div>

        {resetMode ? (
          <>
            {resetSuccess ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-900 to-orange-500 flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg">
                  📧
                </div>

                <h3 className="font-black text-2xl text-blue-950 mb-2">
                  Email envoye !
                </h3>

                <p className="text-gray-500 text-sm mb-6">
                  Un lien a ete envoye a{" "}
                  <strong>{resetEmail}</strong>.
                </p>

                <button
                  onClick={() => {
                    setResetMode(false);
                    setResetSuccess(false);
                    setResetEmail("");
                  }}
                  className="w-full bg-gradient-to-r from-blue-950 to-orange-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg"
                >
                  Retour a la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-blue-800 text-sm">
                    Entrez votre email pour recevoir un lien de reinitialisation.
                  </p>
                </div>

                <div>
                  <label className="text-sm text-blue-950 font-medium block mb-1">
                    Email
                  </label>

                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    placeholder="votre@email.com"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-blue-950 to-orange-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 shadow-lg"
                >
                  {resetLoading ? "Envoi..." : "Envoyer le lien"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setError("");
                  }}
                  className="w-full border border-blue-100 text-blue-950 py-3 rounded-xl font-medium hover:bg-blue-50 transition"
                >
                  Retour a la connexion
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-blue-950 font-medium block mb-1">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-blue-950 font-medium">
                    Mot de passe
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setResetEmail(email);
                      setError("");
                    }}
                    className="text-xs text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    Mot de passe oublie ?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-12"
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
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Pas encore de compte ?{" "}
              <Link
                to="/register"
                className="text-orange-500 font-bold hover:text-orange-600"
              >
                S'inscrire gratuitement
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}