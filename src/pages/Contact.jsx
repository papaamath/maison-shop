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

      <div className="bg-gray-900 text-white py-16 px-6 text-center">
        <p className="text-4xl mb-4">💬</p>
        <h1 className="font-black text-4xl mb-3">Contactez-nous</h1>
        <p className="text-gray-300 max-w-md mx-auto">
          Notre équipe est disponible 24h/24 pour répondre à toutes vos questions.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          <div>
            <h2 className="font-black text-2xl mb-8">Nos coordonnées</h2>
            <div className="space-y-6">

              <a href="https://wa.me/221768730731" target="_blank" rel="noreferrer"
                className="flex items-center gap-4 p-5 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">📱</div>
                <div>
                  <p className="font-bold text-green-700">WhatsApp</p>
                  <p className="text-green-600 font-black text-xl">+221 76 873 07 31</p>
                  <p className="text-green-500 text-xs mt-1">Cliquez pour nous écrire directement</p>
                </div>
              </a>

              <a href="mailto:syllaissa875@gmail.com"
                className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">📧</div>
                <div>
                  <p className="font-bold text-blue-700">Email</p>
                  <p className="text-blue-600 font-semibold">syllaissa875@gmail.com</p>
                  <p className="text-blue-500 text-xs mt-1">Réponse sous 24h</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-5 bg-red-50 border border-red-200 rounded-2xl">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">📍</div>
                <div>
                  <p className="font-bold text-red-700">Adresse</p>
                  <p className="text-red-600 font-semibold">Mbed Fass Yeumbeul</p>
                  <p className="text-red-500 text-xs mt-1">Dakar, Sénégal</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-purple-50 border border-purple-200 rounded-2xl">
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🕐</div>
                <div>
                  <p className="font-bold text-purple-700">Horaires</p>
                  <p className="text-purple-600 font-semibold">Disponible 24h/24</p>
                  <p className="text-purple-500 text-xs mt-1">7 jours sur 7</p>
                </div>
              </div>

              <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                <p className="font-bold text-gray-700 mb-3">Réseaux sociaux</p>
                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">Facebook</button>
                  <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition">Instagram</button>
                  <button className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition">TikTok</button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Liens à compléter bientôt</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-black text-2xl mb-8">Envoyez-nous un message</h2>
            {sent ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">🎉</p>
                <h3 className="font-bold text-xl mb-2">Message envoyé !</h3>
                <p className="text-gray-500 mb-6">Nous vous répondrons dans les plus brefs délais.</p>
                <button
                  onClick={() => { setSent(false); setForm({ nom: "", email: "", message: "" }); }}
                  className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Votre nom</label>
                  <input name="nom" value={form.nom} onChange={handleChange} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Mamadou Diallo" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 resize-none"
                    placeholder="Comment pouvons-nous vous aider ?" />
                </div>
                <button type="submit"
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition">
                  Envoyer via WhatsApp
                </button>
                <p className="text-xs text-gray-400 text-center">Le message s'ouvrira directement dans WhatsApp</p>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="bg-green-600 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-white text-xl">Une question ? Ecrivez-nous !</p>
            <p className="text-green-100 text-sm mt-1">Reponse garantie en moins de 30 minutes</p>
          </div>
          <a href="https://wa.me/221768730731" target="_blank" rel="noreferrer"
            className="bg-white text-green-600 px-8 py-3 rounded-xl font-black hover:bg-green-50 transition whitespace-nowrap">
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}
