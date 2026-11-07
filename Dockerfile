FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 ORDER_DATA_DIRECTORY=/data
COPY package.json server.mjs ./
COPY worker ./worker
COPY scripts/local-api.mjs ./scripts/local-api.mjs
COPY src/menu.json ./src/menu.json
COPY drizzle ./drizzle
COPY dist/client/index.html ./dist/client/index.html
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.mjs"]
