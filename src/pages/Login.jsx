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
      if (err.code === "auth/user-not-found") setError("Aucun compte trouve avec cet email.");
      else setError("Erreur lors de l'envoi. Reessayez.");
    }
    setResetLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.jpeg" alt="B2S-STORE" className="h-14 w-auto object-contain mx-auto mb-3" />
          <h1 className="font-black text-2xl">B2S-STORE</h1>
          <p className="text-gray-500 text-sm mt-1">
            {resetMode ? "Reinitialiser votre mot de passe" : "Connectez-vous a votre compte"}
          </p>
        </div>

        {resetMode ? (
          <>
            {resetSuccess ? (
              <div className="text-center">
                <p className="text-4xl mb-4">📧</p>
                <h3 className="font-bold text-lg mb-2">Email envoye !</h3>
                <p className="text-gray-500 text-sm mb-6">Un lien a ete envoye a <strong>{resetEmail}</strong>.</p>
                <button onClick={() => { setResetMode(false); setResetSuccess(false); setResetEmail(""); }}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition">
                  Retour a la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                  <p className="text-blue-700 text-sm">Entrez votre email pour recevoir un lien de reinitialisation.</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Email</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="votre@email.com" />
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={resetLoading}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50">
                  {resetLoading ? "Envoi..." : "Envoyer le lien"}
                </button>
                <button type="button" onClick={() => { setResetMode(false); setError(""); }}
                  className="w-full border border-gray-200 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
                  Retour a la connexion
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="votre@email.com" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-500">Mot de passe</label>
                  <button type="button" onClick={() => { setResetMode(true); setResetEmail(email); setError(""); }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium">
                    Mot de passe oublie ?
                  </button>
                </div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400 pr-12"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
            <p className="text-center text-sm text-gray-400 mt-6">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-gray-900 font-semibold hover:underline">S'inscrire gratuitement</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
