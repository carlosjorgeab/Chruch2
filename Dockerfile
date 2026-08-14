# 1. Base image usando Node 22 (Debian Slim)
FROM node:22-slim AS base

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 2. Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

# Instala dependências e força pacotes nativos ARM64 do Tailwind/LightningCSS
RUN npm install --include=optional
RUN npm install lightningcss-linux-arm64-gnu @tailwindcss/oxide-linux-arm64-gnu --no-save

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garante que a pasta public exista para evitar erros na cópia
RUN mkdir -p public

ENV TAILWIND_DISABLE_LIGHTNINGCSS=1
ENV NEXT_TELEMETRY_DISABLED=1

# Gera o Prisma Client se o arquivo schema existir
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Compila o Next.js
RUN npm run build

# 4. Runner (Imagem de execução com permissões não-root)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 1. Cria usuário e grupo do sistema
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 2. Prepara os diretórios e atribui a posse do diretório /app ao usuário nextjs
RUN mkdir -p /app/public /app/.next && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# 3. Copia os arquivos compilados garantindo que o dono seja o nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 4. Alterna para o usuário não-root
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]