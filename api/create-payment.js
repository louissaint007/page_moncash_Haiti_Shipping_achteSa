const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { amount, orderId } = req.body;
        console.log(`[SERVER] Processing payment for Order: ${orderId}, Amount: ${amount} HTG`);

        const clientId = process.env.MONCASH_CLIENT_ID;
        const secretKey = process.env.MONCASH_CLIENT_SECRET;

        if (!clientId || !secretKey) {
            return res.status(500).json({ error: "MonCash API keys missing on server." });
        }

        const MONCASH_API_URL = "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

        // 1. Authenticate
        const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const authResponse = await axios.post(`${MONCASH_API_URL}/Authenticate`, {}, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        });

        const accessToken = authResponse.data.access_token;
        if (!accessToken) {
            throw new Error("Failed to get MonCash access token.");
        }

        // 2. Create Payment
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
            throw new Error(paymentData.status || 'Payment creation failed');
        }

        const paymentToken = paymentData.payment_token.token;
        const redirectUrl = `${MONCASH_API_URL}/Checkout/Process?token=${paymentToken}`;

        res.status(200).json({ url: redirectUrl });

    } catch (error) {
        console.error("[SERVER ERROR]", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
};
