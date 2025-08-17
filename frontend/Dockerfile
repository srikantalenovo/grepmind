FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install @vitejs/plugin-react react-icons js-yaml yaml react-ace ace-builds brace framer-motion

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 755 /usr/share/nginx/html

ENV REACT_APP_API_URL=http://grepmind.sritechhub.com
ENV VITE_API_URL=http://grepmind.sritechhub.com/api
ENV FRONTEND_URL=http://grepmind.sritechhub.com
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]