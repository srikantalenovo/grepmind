FROM postgres:16-alpine

# Set environment variables from .env
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=grepmind

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# Expose Postgres port
EXPOSE 5432
