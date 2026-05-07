const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

// Tes clés Twilio
const TWILIO_ACCOUNT_SID = "AC1f88d3db566cedcf5d17ad7cca4a7844";
const TWILIO_AUTH_TOKEN = "332f63a5d9d67eea0753680be435df47";
const TWILIO_FROM = "whatsapp:+14155238886";
const ADMIN_WHATSAPP = "whatsapp:+33745332695"; // ← mets ton vrai numéro ici

exports.notifierNouvelleCommande = onDocumentCreated(
  "commandes/{commandeId}",
  async (event) => {
    const commande = event.data.data();
    if (!commande) return;

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const prenom = commande.client?.prenom || "";
    const nom = commande.client?.nom || "";
    const telephone = commande.client?.telephone || "";
    const ville = commande.client?.ville || "";
    const total = Number(commande.total || 0).toLocaleString("fr-SN");
    const articles = commande.articles?.map(a => `• ${a.nom} x${a.quantite}`).join("\n") || "";

    const msgAdmin = `🛒 *Nouvelle commande reçue !*

👤 Client : ${prenom} ${nom}
📞 Téléphone : ${telephone}
📍 Ville : ${ville}

🛍 Articles :
${articles}

💰 Total : ${total} FCFA

Connectez-vous au panel admin pour traiter cette commande.`;

    const msgClient = `🎉 *Merci pour votre commande, ${prenom} !*

Votre commande a bien été reçue et est en cours de traitement.

🛍 Articles commandés :
${articles}

💰 Total : ${total} FCFA
📍 Livraison à : ${ville}

Nous vous contacterons sous peu pour confirmer la livraison. 🚚

*MAISON.*`;

    try {
      // Notifie l'admin
      await client.messages.create({
        from: TWILIO_FROM,
        to: ADMIN_WHATSAPP,
        body: msgAdmin,
      });
      console.log("✅ Admin notifié");

      // Notifie le client
      if (telephone) {
        const clientNum = `whatsapp:${telephone.replace(/\s/g, "")}`;
        await client.messages.create({
          from: TWILIO_FROM,
          to: clientNum,
          body: msgClient,
        });
        console.log("✅ Client notifié");
      }
    } catch (err) {
      console.error("❌ Erreur Twilio:", err.message);
    }
  }
);