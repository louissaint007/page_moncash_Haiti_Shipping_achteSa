const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


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

        // Récupération des variables d'environnement Vercel
        const clientId = process.env.MONCASH_CLIENT_ID;
        const secretKey = process.env.MONCASH_CLIENT_SECRET;

        if (!clientId || !secretKey) {
            return res.status(500).json({ error: "Les clés API MonCash sont manquantes sur le serveur Vercel." });
        }

        // Configuration des URLs selon la documentation 
        const HOST_REST_API = "https://sandbox.moncashbutton.digicelgroup.com/Api";
        const GATEWAY_BASE = "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

        // 1. Authentification pour obtenir le Token 
        const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

        // La doc exige grant_type=client_credentials pour le oauth/token 
        const authResponse = await axios.post(`${HOST_REST_API}/oauth/token`,
            "grant_type=client_credentials&scope=read,write",
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = authResponse.data.access_token;
        if (!accessToken) {
            throw new Error("Impossible d'obtenir le token d'accès MonCash.");
        }

        // 2. Création du paiement 
        const paymentResponse = await axios.post(`${HOST_REST_API}/v1/CreatePayment`, {
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

        // Vérification de la présence du token dans la réponse [cite: 38, 41]
        if (!paymentData.payment_token || !paymentData.payment_token.token) {
            throw new Error(paymentData.status || 'Échec de la création du paiement');
        }

        // 3. Construction de l'URL de redirection finale 
        const paymentToken = paymentData.payment_token.token;
        const redirectUrl = `${GATEWAY_BASE}/Payment/Redirect?token=${paymentToken}`;

        // 4. Enregistrement initial dans Supabase
        try {
            await supabase.from('payments').upsert({
                order_id: orderId,
                amount_htg: amount,
                status: 'PENDING',
                payload: { token: paymentToken }
            });
            console.log(`[DB] Paiement PENDING enregistré pour l'ordre: ${orderId}`);
        } catch (dbError) {
            console.error("[DB ERROR]", dbError.message);
            // On ne bloque pas le paiement si la DB échoue, mais on log l'erreur
        }

        // Retourner l'URL au client (script.js)

        res.status(200).json({ url: redirectUrl });

    } catch (error) {
        console.error("[SERVER ERROR]", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
};
