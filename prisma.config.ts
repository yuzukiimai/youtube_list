import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Next.js loads `.env.local` automatically at runtime, but the Prisma CLI does
// not — load it here so `prisma migrate`/`generate` see DATABASE_URL too.
config({ path: '.env' })
config({ path: '.env.local', override: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
