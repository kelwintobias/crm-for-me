
const apiKey = "crm-secret-key-123";
const baseUrl = "http://localhost:3000/api/webhooks/botconversa";

async function testWebhook(name, source) {
    console.log(`Testing source: "${source}" for ${name}...`);
    try {
        const res = await fetch(baseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
            },
            body: JSON.stringify({
                name,
                phone: "5511999999999",
                source,
            }),
        });

        const data = await res.json();
        console.log(`Response: ${res.status}`, data);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function run() {
    // Teste 1: UPBOOST -> ANUNCIO
    await testWebhook("Teste UpBoost", "Veio do anúncio UPBOOST no insta");

    // Teste 2: Influencer -> INFLUENCER
    await testWebhook("Teste Influencer", "Vi no video do Influencer tal");

    // Teste 3: Direto -> INSTAGRAM
    await testWebhook("Teste Insta", "Instagram");
}

run();
