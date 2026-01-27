
async function main() {
    const url = "https://crmupboost.vercel.app/api/webhooks/evolution";
    console.log(`Testing POST to ${url}...`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ test: true, event: "messages.upsert" }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log("Body:", text);
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

main();
