# Usa uma imagem oficial do Node.js 20 como base.
# Como o build e a execução acontecem dentro dessa MESMA imagem,
# não existe descompasso de versão de sistema (o problema que tivemos antes).
FROM node:20-slim

# Pasta de trabalho dentro do contêiner
WORKDIR /app

# Copia primeiro só os arquivos de dependências, para aproveitar cache do Docker
COPY package*.json ./

# Instala as dependências, compilando o sqlite3 na própria imagem
RUN npm install --build-from-source

# Copia o restante do código do projeto
COPY . .

# Porta que o servidor Express usa
EXPOSE 3000

# Comando que inicia o servidor
CMD ["node", "server.js"]
