
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying contracts in database...\n')

    const count = await prisma.contract.count()
    console.log(`Total contracts: ${count}`)

    if (count === 0) {
        console.log('No contracts found.')
        return
    }

    const oldest = await prisma.contract.findFirst({
        orderBy: { contractDate: 'asc' }
    })

    const newest = await prisma.contract.findFirst({
        orderBy: { contractDate: 'desc' }
    })

    console.log(`Oldest contract: ${oldest?.contractDate.toISOString()}`)
    console.log(`Newest contract: ${newest?.contractDate.toISOString()}`)

    // Group by month to verify May 2025 specifically
    const contracts = await prisma.contract.findMany({
        select: { contractDate: true }
    })

    const months = new Set()
    contracts.forEach(c => {
        const d = new Date(c.contractDate)
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`
        months.add(key)
    })

    console.log('\nMonths present:')
    Array.from(months).sort().forEach(m => console.log(`- ${m}`))
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
