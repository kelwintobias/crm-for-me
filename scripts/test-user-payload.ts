
async function main() {
    const url = "https://crmupboost.vercel.app/api/webhooks/evolution";

    // O JSON fornecido pelo usuário tem uma estrutura de "wrapper" (headers, params, body).
    // O webhook espera receber o CONTEÚDO de "body".

    const payloadFromEvolution = {
        event: "messages.upsert",
        instance: "UPBOOST",
        data: {
            key: {
                remoteJid: "5512991676281@s.whatsapp.net",
                remoteJidAlt: "5512991676281@s.whatsapp.net",
                fromMe: false,
                id: "ACE91490A49D34A3C4FC179B15203E5B",
                participant: "",
                addressingMode: "lid"
            },
            pushName: "juninho",
            status: "DELIVERY_ACK",
            message: {
                conversation: "Memória RAM dois pentes de 8gb ddr4"
            },
            messageType: "conversation",
            messageTimestamp: 1769535755,
            instanceId: "5bcf84f9-bfe2-4156-b03b-26062f6d3bad",
            source: "android"
        },
        sender: "556592952018@s.whatsapp.net"
    };

    console.log(`Sending User Payload to ${url}...`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadFromEvolution),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log("Response Body:", text);
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

main();
