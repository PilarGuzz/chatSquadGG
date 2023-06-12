# Establecer la imagen base
FROM node:20-alpine

# Crear el directorio de la aplicación en el contenedor
WORKDIR /usr/src/app

# Copiar el archivo package.json y package-lock.json al directorio de trabajo
COPY package*.json ./

# Instalar las dependencias del proyecto
RUN npm install

# Si estás construyendo tu código para producción
# RUN npm ci --only=production

# Copiar el resto del código de la aplicación al contenedor
COPY . .

# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 8080

# Comando para iniciar la aplicación
CMD [ "node", "index.js" ]