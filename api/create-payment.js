const axios = require('axios');

module.exports = async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    console.log(">>> [DEBUG] Nouvelle requête reçue");

    try {
        const { amount, orderId } = req.body;
        console.log(`>>> [DEBUG] Données reçues: Montant=${amount}, OrderID=${orderId}`);

        // 1. Vérification des variables d'environnement
        const clientId = process.env.MONCASH_CLIENT_ID;
        const secretKey = process.env.MONCASH_CLIENT_SECRET;

        console.log(">>> [DEBUG] Vérification des clés Vercel:");
        console.log("- MONCASH_CLIENT_ID présent:", !!clientId);
        console.log("- MONCASH_CLIENT_SECRET présent:", !!secretKey);

        if (!clientId || !secretKey) {
            console.error(">>> [ERREUR] Clés manquantes dans l'interface Vercel !");
            return res.status(500).json({ error: "Clés API manquantes sur Vercel." });
        }

        const MONCASH_API_URL = "https://sandbox.moncashbutton.digicelgroup.com/Api";
        console.log(`>>> [DEBUG] Utilisation de l'URL API: ${MONCASH_API_URL}`);

        // 2. Authentification
        console.log(">>> [DEBUG] Étape 1: Tentative d'authentification...");
        const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        
        try {
            const authResponse = await axios.post(`${MONCASH_API_URL}/Authenticate`, {}, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${credentials}`
                }
            });

            console.log(">>> [DEBUG] Authentification réussie ! Status:", authResponse.status);
            const accessToken = authResponse.data.access_token;

            // 3. Création du paiement
            console.log(">>> [DEBUG] Étape 2: Création du paiement avec le token...");
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

            console.log(">>> [DEBUG] Paiement créé avec succès !");
            const paymentToken = paymentResponse.data.payment_token.token;
            const redirectUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Checkout/Process?token=${paymentToken}`;

            console.log(">>> [DEBUG] URL de redirection générée:", redirectUrl);
            res.status(200).json({ url: redirectUrl });

        } catch (apiError) {
            // Log spécifique pour les erreurs de l'API MonCash (comme la 401)
            console.error(">>> [ERREUR API MONCASH]");
            if (apiError.response) {
                console.error("- Status:", apiError.response.status);
                console.error("- Données d'erreur:", JSON.stringify(apiError.response.data, null, 2));
                console.error("- Headers envoyés (masqués): Authorization: Basic [REDACTED]");
            } else {
                console.error("- Message:", apiError.message);
            }
            throw apiError; // Renvoie vers le catch principal
        }

    } catch (error) {
        console.error(">>> [CRITICAL ERROR]", error.message);
        res.status(500).json({ error: error.message });
    }
};
