document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');

    // Récupération des paramètres depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const orderId = urlParams.get('orderId');

    // Vérification de la présence des données
    if (!amount || !orderId) {
        statusText.innerText = "Erreur: Informations de facturation manquantes (Montant ou OrderID).";
        statusText.style.color = "#ff4444";
        return;
    }

    try {
        statusText.innerText = "Connexion sécurisée à MonCash...";
        console.log(`>>> [CLIENT] Tentative de paiement pour: ${amount} HTG (Order: ${orderId})`);

        // Appel de votre API sur Vercel
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, orderId })
        });

        // Lecture de la réponse JSON
        const data = await response.json();

        if (response.ok && data.url) {
            statusText.innerText = "Redirection vers le formulaire MonCash...";
            console.log(">>> [CLIENT] URL de paiement reçue:", data.url);
            
            // Redirection immédiate sans délai pour éviter les blocages de navigateurs
            window.location.href = data.url;
            
        } else {
            // Si le serveur renvoie une erreur (ex: 401 ou 500)
            const errorMsg = data.error || "Erreur inconnue du serveur.";
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error(">>> [CLIENT ERROR]:", error);
        statusText.innerText = "Erreur: " + error.message;
        statusText.style.color = "#ff4444";
    }
});
