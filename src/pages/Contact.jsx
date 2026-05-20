import Navbar from "../components/Navbar";
import { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ nom: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const msg = `Bonjour, je m'appelle ${form.nom}. ${form.message} Mon email : ${form.email}`;
    window.open(`https://wa.me/221768730731?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-orange-500 text-white py-16 px-6 text-center">
        <p className="text-4xl mb-4">💬</p>
        <h1 className="font-black text-4xl mb-3">Contactez-nous</h1>
        <p className="text-blue-100 max-w-md mx-auto">
          Notre équipe est disponible 24h/24 pour répondre à toutes vos questions.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-black text-2xl mb-8 text-blue-950">
              Nos coordonnées
            </h2>

            <div className="space-y-6">
              <a
                href="https://wa.me/221768730731"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition shadow-sm"
              >
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                  📱
                </div>

                <div>
                  <p className="font-bold text-green-700">WhatsApp</p>
                  <p className="text-green-600 font-black text-xl">
                    +221 76 873 07 31
                  </p>
                  <p className="text-green-500 text-xs mt-1">
                    Cliquez pour nous écrire directement
                  </p>
                </div>
              </a>

              <a
                href="mailto:syllaissa875@gmail.com"
                className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition shadow-sm"
              >
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                  📧
                </div>

                <div>
                  <p className="font-bold text-blue-800">Email</p>
                  <p className="text-blue-700 font-semibold">
                    syllaissa875@gmail.com
                  </p>
                  <p className="text-blue-500 text-xs mt-1">
                    Réponse sous 24h
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-5 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                  📍
                </div>

                <div>
                  <p className="font-bold text-orange-700">Adresse</p>
                  <p className="text-orange-600 font-semibold">
                    Mbed Fass Yeumbeul
                  </p>
                  <p className="text-orange-500 text-xs mt-1">
                    Dakar, Sénégal
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
                <div className="w-14 h-14 bg-blue-900 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                  🕐
                </div>

                <div>
                  <p className="font-bold text-blue-900">Horaires</p>
                  <p className="text-blue-700 font-semibold">
                    Disponible 24h/24
                  </p>
                  <p className="text-blue-500 text-xs mt-1">
                    7 jours sur 7
                  </p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-blue-50 to-orange-50 border border-blue-100 rounded-2xl shadow-sm">
                <p className="font-bold text-blue-950 mb-3">
                  Réseaux sociaux
                </p>

                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition">
                    Facebook
                  </button>

                  <button className="flex-1 bg-gradient-to-r from-blue-700 to-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition">
                    Instagram
                  </button>

                  <button className="flex-1 bg-blue-950 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-900 transition">
                    TikTok
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  Liens à compléter bientôt
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-black text-2xl mb-8 text-blue-950">
              Envoyez-nous un message
            </h2>

            {sent ? (
              <div className="text-center py-12 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-5xl mb-4">🎉</p>

                <h3 className="font-bold text-xl mb-2 text-blue-950">
                  Message envoyé !
                </h3>

                <p className="text-gray-500 mb-6">
                  Nous vous répondrons dans les plus brefs délais.
                </p>

                <button
                  onClick={() => {
                    setSent(false);
                    setForm({ nom: "", email: "", message: "" });
                  }}
                  className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 bg-white border border-blue-100 rounded-2xl p-6 shadow-sm"
              >
                <div>
                  <label className="text-sm text-blue-900 font-medium block mb-1">
                    Votre nom
                  </label>

                  <input
                    name="nom"
                    value={form.nom}
                    onChange={handleChange}
                    required
                    className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    placeholder="Mamadou Diallo"
                  />
                </div>

                <div>
                  <label className="text-sm text-blue-900 font-medium block mb-1">
                    Email
                  </label>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="text-sm text-blue-900 font-medium block mb-1">
                    Message
                  </label>

                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                    placeholder="Comment pouvons-nous vous aider ?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-900 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition"
                >
                  Envoyer via WhatsApp
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Le message s'ouvrira directement dans WhatsApp
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-950 to-orange-500 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-white text-xl">
              Une question ? Ecrivez-nous !
            </p>

            <p className="text-orange-100 text-sm mt-1">
              Reponse garantie en moins de 30 minutes
            </p>
          </div>

          <a
            href="https://wa.me/221768730731"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-blue-950 px-8 py-3 rounded-xl font-black hover:bg-orange-50 transition whitespace-nowrap"
          >
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}