import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
    console.log("Starting cleanup...");

    const terms = ["teste", "test"];

    // 1. Leads (soft-delete via deletedAt)
    console.log("Cleaning Leads (soft-delete)...");
    const leads = await prisma.lead.updateMany({
        where: {
            deletedAt: null,
            OR: terms.map(term => ({
                name: { contains: term, mode: "insensitive" }
            }))
        },
        data: { deletedAt: new Date() }
    });
    console.log(`Soft-deleted ${leads.count} leads.`);

    // 2. Contracts
    console.log("Cleaning Contracts...");
    const contracts = await prisma.contract.deleteMany({
        where: {
            OR: terms.map(term => ({
                clientName: { contains: term, mode: "insensitive" }
            }))
        }
    });
    console.log(`Deleted ${contracts.count} contracts.`);

    // 3. Debtors
    console.log("Cleaning Debtors...");
    const debtors = await prisma.debtor.deleteMany({
        where: {
            OR: terms.map(term => ({
                clientName: { contains: term, mode: "insensitive" }
            }))
        }
    });
    console.log(`Deleted ${debtors.count} debtors.`);

    console.log("Cleanup finished.");
}

cleanup()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
