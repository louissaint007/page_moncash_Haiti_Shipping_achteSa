const axios = require('axios');

module.exports = async (req, res) => {
    // Configuration des Headers CORS pour Vercel
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Gérer la requête de pré-vérification (Preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { amount, orderId } = req.body;
        
        // Utilisation des variables d'environnement Vercel 
        const clientId = process.env.MONCASH_CLIENT_ID;
        const secretKey = process.env.MONCASH_CLIENT_SECRET; // Vérifiez bien ce nom dans Vercel

        if (!clientId || !secretKey) {
            return res.status(500).json({ error: "Les clés API MonCash sont manquantes sur le serveur." });
        }

        // URL correcte pour le Sandbox MonCash
        const MONCASH_API_URL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 1. Authentification pour obtenir le Token
        const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const authResponse = await axios.post(`${MONCASH_API_URL}/Authenticate`, {}, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        });

        const accessToken = authResponse.data.access_token;
        if (!accessToken) {
            throw new Error("Impossible d'obtenir le token d'accès MonCash.");
        }

        // 2. Création du paiement
        const paymentResponse = await axios.post(`${MONCASH_API_URL}/Checkout/Payment`, {
            amount: amount,
            orderId: orderId
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const paymentData = paymentResponse.data;

        if (!paymentData.payment_token || !paymentData.payment_token.token) {
            throw new Error(paymentData.status || 'Échec de la création du paiement');
        }

        // 3. Construction de l'URL de redirection finale
        const paymentToken = paymentData.payment_token.token;
        const redirectUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Checkout/Process?token=${paymentToken}`;

        res.status(200).json({ url: redirectUrl });

    } catch (error) {
        console.error("[SERVER ERROR]", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
};
