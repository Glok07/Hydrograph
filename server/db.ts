import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/** Client Prisma unique (réutilisé entre les appels des fonctions Vercel). */
const g = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  g.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

if (process.env.NODE_ENV !== 'production') g.prisma = prisma
