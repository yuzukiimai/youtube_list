import { prisma } from './prisma'

test('prisma singleton is a PrismaClient instance', () => {
  expect(prisma).toBeDefined()
  expect(typeof prisma.channel.findMany).toBe('function')
})
