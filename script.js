document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');

    // 1. Récupération des paramètres depuis l'URL
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

        // 2. Appel de votre API sur Vercel
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, orderId })
        });

        // 3. Lecture de la réponse JSON
        const data = await response.json();

        if (response.ok && data.url) {
            statusText.innerText = "Redirection vers le formulaire MonCash...";
            console.log(">>> [CLIENT] URL de paiement reçue, redirection forcée...");
            
            /* SOLUTION AU PROBLÈME X-FRAME-OPTIONS :
               On utilise window.top.location.href pour s'assurer que la page 
               entière est redirigée, même si le script est exécuté dans un 
               contexte que le navigateur juge restreint.
            */
            window.top.location.href = data.url;
            
        } else {
            // Si le serveur renvoie une erreur (ex: 401 ou 500)
            const errorMsg = data.error || "Erreur inconnue du serveur.";
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error(">>> [CLIENT ERROR]:", error);
        statusText.innerText = "Erreur: " + error.message;
        statusText.style.color = "#ff4444";
        
        // Option de secours : si la redirection automatique échoue encore
        if (error.message.includes('redirect') || !statusText.innerText.includes('facturation')) {
            statusText.innerHTML += `<br><br><a href="javascript:location.reload()" style="color:white;text-decoration:underline;">Réessayer</a>`;
        }
    }
});
