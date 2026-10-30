FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /data && chown node:node /data
USER node
ENV PORT=3000 DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server/index.js"]


