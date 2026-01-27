import { prisma } from "@/lib/prisma";

async function main() {
    console.log("--- Checking Webhook Logs (Evolution) ---");
    const logs = await prisma.webhookLog.findMany({
        where: { provider: "evolution" },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    if (logs.length === 0) {
        console.log("No Evolution webhook logs found.");
    } else {
        logs.forEach((log) => {
            console.log(`[${log.createdAt.toISOString()}] Status: ${log.status} | Event: ${log.event}`);
            console.log(`Error: ${log.error || "None"}`);
            console.log(`Payload Preview: ${log.payload.substring(0, 200)}...`);
            console.log("------------------------------------------------");
        });
    }

    console.log("\n--- Checking Recent Leads ---");
    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    leads.forEach((lead) => {
        console.log(`[${lead.createdAt.toISOString()}] ${lead.name} (${lead.phone}) - Stage: ${lead.stage} | Source: ${lead.source}`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
