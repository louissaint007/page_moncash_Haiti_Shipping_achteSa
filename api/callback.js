const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
    // MonCash sends transactionId and orderId as query parameters in the ReturnUrl
    const { transactionId, orderId } = req.query;

    console.log(`[CALLBACK] Reçu - Transaction: ${transactionId}, Order: ${orderId}`);

    if (!transactionId || !orderId) {
        return res.status(400).send("Informations de transaction manquantes.");
    }

    try {
        // 1. Mettre à jour ou insérer dans la table 'payments'
        // On tente d'abord un update, si ça échoue (pas d'enregistrement), on fait un insert
        const { data, error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'SUCCESS',
                moncash_transaction_id: transactionId,
                updated_at: new Date().toISOString()
            })
            .eq('order_id', orderId)
            .select();

        if (updateError || !data || data.length === 0) {
            console.log("[CALLBACK] Enregistrement non trouvé, tentative d'insertion...");
            const { error: insertError } = await supabase
                .from('payments')
                .insert({
                    order_id: orderId,
                    moncash_transaction_id: transactionId,
                    status: 'SUCCESS'
                });

            if (insertError) throw insertError;
        }

        // 2. Redirection vers une page de succès (on peut réutiliser index.html avec un paramètre ou créer une nouvelle page)
        // Pour l'instant, on redirige vers l'index avec un flag de succès
        res.redirect(`/?status=success&orderId=${orderId}`);

    } catch (error) {
        console.error("[CALLBACK ERROR]", error.message);
        res.status(500).send("Erreur lors de la validation du paiement.");
    }
};
