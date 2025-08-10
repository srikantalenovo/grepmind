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
	docker tag k8s-dashboard_db:latest srikanta1219/grepmind-db:latest
	docker tag k8s-dashboard_backend:latest srikanta1219/grepmind-backend:latest
	docker tag k8s-dashboard_frontend:latest srikanta1219/grepmind-frontend:latest
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-db:latest
	docker push srikanta1219/grepmind-backend:latest
	docker push srikanta1219/grepmind-frontend:latest
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-db:latest
	docker rmi srikanta1219/grepmind-backend:latest
	docker rmi srikanta1219/grepmind-frontend:latest	

	docker rmi k8s-dashboard_db:latest
	docker rmi k8s-dashboard_backend:latest
	docker rmi k8s-dashboard_frontend:latest

# Start fresh containers
up:
	@echo "▶️ Starting containers..."
	docker-compose -f $(COMPOSE_FILE) up --force-recreate


# Just build without cache
build-frontend:
	@echo "🔨 Building frontend images..."
	docker-compose build --no-cache frontend
	@echo "🔨 tag fresh images..."
	docker tag k8s-dashboard_frontend:latest srikanta1219/grepmind-frontend:latest
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-frontend:latest
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-frontend:latest


# Just build without cache
build-backend:
	@echo "🔨 Building backend images..."
	docker-compose build --no-cache backend
	@echo "🔨 tag fresh images..."
	docker tag k8s-dashboard_backend:latest srikanta1219/grepmind-backend:v1
	@echo "🔨 Publish image to dockerhub "
	docker push srikanta1219/grepmind-backend:v1
	@echo "🔨 Removing image from local "
	docker rmi srikanta1219/grepmind-backend:v1