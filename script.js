document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');

    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const orderId = urlParams.get('orderId');

    if (!amount || !orderId) {
        statusText.innerText = "Erreur: Informations de facturation manquantes.";
        statusText.style.color = "#ff4444";
        return;
    }

    try {
        statusText.innerText = "Connexion sécurisée à MonCash...";

        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, orderId })
        });

        const data = await response.json();

        if (data.url) {
            statusText.innerText = "Redirection vers MonCash...";
            // Delay slightly for better UX
            setTimeout(() => {
                window.location.href = data.url;
            }, 1500);
        } else {
            throw new Error(data.error || "Erreur lors de la création du paiement.");
        }

    } catch (error) {
        console.error("Error:", error);
        statusText.innerText = "Erreur: " + error.message;
        statusText.style.color = "#ff4444";
    }
});
