<<<<<<< HEAD
import { PrismaClient } from '@prisma/client'
=======
import { PrismaClient } from '../generated/prisma'
>>>>>>> 0989372 (add fitur inventory dan history)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma 