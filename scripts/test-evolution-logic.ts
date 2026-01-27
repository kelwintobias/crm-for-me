
import { prisma } from "@/lib/prisma";

// Mock data
const PHONE = "5511999998888";
const PUSH_NAME = "Test Logic User";

async function runLogic() {
    console.log("--- Testing Evolution Logic Directly ---\n");

    // 1. Find Admin/User
    const adminUser = await prisma.user.findFirst({
        where: {
            OR: [
                { role: "ADMIN" },
                { email: "dherick@upboost.pro" },
                { email: "kelwin@upboost.com" }
            ]
        },
        orderBy: { createdAt: "asc" }
    });

    let userId = adminUser?.id;
    if (!userId) {
        const anyUser = await prisma.user.findFirst();
        userId = anyUser?.id;
    }

    console.log(`User selected: ${userId}`);
    if (!userId) throw new Error("No user found");

    // 2. Check Existing Lead
    let existingLead = await prisma.lead.findFirst({
        where: { phone: PHONE },
    });

    if (existingLead) {
        console.log("Lead exists. Cleaning up for test...");
        await prisma.lead.delete({ where: { id: existingLead.id } });
        console.log("Lead deleted.");
    }

    // 3. Create New Lead (Scenario C)
    console.log("\n[SCENARIO: CREATE NEW LEAD]");
    const newLead = await prisma.lead.create({
        data: {
            name: PUSH_NAME,
            phone: PHONE,
            source: "OUTRO",
            stage: "NOVO_LEAD",
            inPipeline: true,
            userId: userId,
            value: 0,
            plan: "INDEFINIDO",
        }
    });
    console.log(`Created lead: ${newLead.id}, Stage: ${newLead.stage}, Name: ${newLead.name}`);

    // 4. Simulate Reactivation (Scenario B)
    console.log("\n[SCENARIO: REACTIVATE LEAD]");
    // a. Remove from pipeline
    await prisma.lead.update({
        where: { id: newLead.id },
        data: { inPipeline: false }
    });
    console.log("Lead removed from pipeline (simulating archive).");

    // b. Run Logic: Check and Reactivate
    const leadToReactivate = await prisma.lead.findFirst({ where: { phone: PHONE } });
    if (leadToReactivate && !leadToReactivate.inPipeline) {
        await prisma.lead.update({
            where: { id: leadToReactivate.id },
            data: {
                inPipeline: true,
                stage: "NOVO_LEAD",
                updatedAt: new Date(),
            }
        });
        console.log("Lead reactivated successfully.");
    } else {
        console.error("Failed to simulate reactivation condition.");
    }

    // Verify
    const finalLead = await prisma.lead.findUnique({ where: { id: newLead.id } });
    console.log(`Final State - InPipeline: ${finalLead?.inPipeline}, Stage: ${finalLead?.stage}`);

    // Cleanup
    await prisma.lead.delete({ where: { id: newLead.id } });
    console.log("\nTest data cleaned up.");
}

runLogic()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
