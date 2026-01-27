
const baseUrl = "http://localhost:3000/api/webhooks/evolution";

async function sendWebhook(payload: any) {
    try {
        console.log(`Sending webhook to ${baseUrl}...`);
        console.log("Payload:", JSON.stringify(payload, null, 2));

        const res = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log(`Response Status: ${res.status}`);
        console.log("Response Data:", data);
        return data;
    } catch (error) {
        console.error("Error sending webhook:", error);
        return null;
    }
}

async function run() {
    // 1. Test: New Lead
    const newLeadPayload = {
        event: "messages.upsert",
        instance: "julia",
        data: {
            key: {
                remoteJid: "5511988887777@s.whatsapp.net",
                fromMe: false,
                id: "1234567890"
            },
            pushName: "Test Lead New",
            message: { conversation: "Hello I want to buy" },
            messageType: "conversation",
            messageTimestamp: 1620000000,
            owner: "julia",
            source: "ios"
        },
        sender: "5511988887777@s.whatsapp.net"
    };

    console.log("\n--- TEST 1: New Lead ---");
    await sendWebhook(newLeadPayload);

    // 2. Test: Existing Lead (Simulation)
    // Sending again should return "already in pipeline" or "reactivated" depending on state
    // But since we just created it, it should be "already in pipeline".
    console.log("\n--- TEST 2: Existing Lead (Should be in pipeline) ---");
    await sendWebhook(newLeadPayload);

    // 3. Test: From Me (Should be ignored)
    const fromMePayload = {
        ...newLeadPayload,
        data: {
            ...newLeadPayload.data,
            key: { ...newLeadPayload.data.key, fromMe: true }
        }
    };
    console.log("\n--- TEST 3: Message from Me (Should be ignored) ---");
    await sendWebhook(fromMePayload);
}

run();
