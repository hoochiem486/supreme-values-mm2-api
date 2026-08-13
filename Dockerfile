FROM node:22-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci && npx playwright install --with-deps chromium

COPY . .
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "start"]
