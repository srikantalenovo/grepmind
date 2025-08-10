# Makefile for Docker Compose cleanup & rebuild

# Default service file (change if your compose file has a different name)
COMPOSE_FILE = docker-compose.yml

# Rebuild everything from scratch
rebuild:
	@echo "🚀 Cleaning up all containers, images, volumes, and networks..."
	docker-compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	@echo "🧹 Removing build cache..."
	docker builder prune -a --force
	@echo "🔨 Building fresh images (no cache)..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "▶️ Starting containers..."
	docker-compose -f $(COMPOSE_FILE) up --force-recreate

# Just clean without rebuilding
clean:
	@echo "🧹 Cleaning containers, images, and volumes..."
	docker-compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker builder prune -a --force

# Just build without cache
buildpush:
	@echo "🔨 Building fresh images..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "🔨 tag fresh images..."
	docker tag grepmind_db:latest srikanta1219/grepmind-db:dev
	docker tag grepmind_backend:latest srikanta1219/grepmind-backend:dev
	docker tag grepmind_frontend:latest srikanta1219/grepmind-frontend:dev
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-db:dev
	docker push srikanta1219/grepmind-backend:dev
	docker push srikanta1219/grepmind-frontend:dev
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-db:dev
	docker rmi srikanta1219/grepmind-backend:dev
	docker rmi srikanta1219/grepmind-frontend:dev	

	docker rmi grepmind_db:latest
	docker rmi grepmind_backend:latest
	docker rmi grepmind_frontend:latest

# Start fresh containers
up:
	@echo "▶️ Starting containers..."
	docker-compose -f $(COMPOSE_FILE) up --force-recreate


# Just build without cache
build-frontend:
	@echo "🔨 Building frontend images..."
	docker-compose build --no-cache frontend
	@echo "🔨 tag fresh images..."
	docker tag grepmind_frontend:latest srikanta1219/grepmind-frontend:dev
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-frontend:dev
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-frontend:dev


# Just build without cache
build-backend:
	@echo "🔨 Building backend images..."
	docker-compose build --no-cache backend
	@echo "🔨 tag fresh images..."
	docker tag grepmind_backend:latest srikanta1219/grepmind-backend:dev
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-backend:dev
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-backend:dev