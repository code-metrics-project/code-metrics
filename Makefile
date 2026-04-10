# CodeMetrics - Top-Level Makefile
# This Makefile delegates to service-specific Makefiles and provides orchestration targets

NAME := code-metrics
DEMO := $(NAME)-demo
BACKEND_NAME := $(NAME)-api
FRONTEND_NAME := $(NAME)-ui
MOCK_NAME := $(NAME)-mocks
MLAPI_NAME := $(NAME)-mlapi
DOCS_NAME := $(NAME)-docs
PROMO_NAME := $(NAME)-promosite
JENKINS_NAME := demo-jenkins

BUILD_TOOL := docker
DEP_UP_RUN := false

####################
# Service Delegation
####################

.PHONY: deps-backend deps-ui deps-desktop deps-mcp
.PHONY: build-backend build-ui build-desktop build-mlapi build-mcp build-docs build-mocks
.PHONY: test-backend test-ui test-mcp test-mlapi
.PHONY: lint-backend lint-ui lint-mlapi
.PHONY: clean-backend clean-ui clean-desktop clean-mcp clean-mlapi clean-docs

# Backend
deps-backend:
	@$(MAKE) -C backend deps

build-backend:
	@$(MAKE) -C backend build-docker BUILD_TOOL=$(BUILD_TOOL)

test-backend:
	@$(MAKE) -C backend test

lint-backend:
	@$(MAKE) -C backend lint

clean-backend:
	@$(MAKE) -C backend clean

# UI / Frontend
deps-ui:
	@$(MAKE) -C ui deps

build-ui:
	@$(MAKE) -C ui build-docker BUILD_TOOL=$(BUILD_TOOL)

test-ui:
	@$(MAKE) -C ui test

lint-ui:
	@$(MAKE) -C ui lint

clean-ui:
	@$(MAKE) -C ui clean

# Desktop
deps-desktop:
	@$(MAKE) -C desktop deps

build-desktop:
	@$(MAKE) -C desktop release-dev

clean-desktop:
	@$(MAKE) -C desktop clean

# Machine Learning
build-mlapi:
	@$(MAKE) -C machinelearning build-docker BUILD_TOOL=$(BUILD_TOOL)

test-mlapi:
	@$(MAKE) -C machinelearning test

lint-mlapi:
	@$(MAKE) -C machinelearning lint

clean-mlapi:
	@$(MAKE) -C machinelearning clean

# MCP Server
deps-mcp:
	@$(MAKE) -C mcp deps

build-mcp:
	@$(MAKE) -C mcp build

test-mcp:
	@$(MAKE) -C mcp test

clean-mcp:
	@$(MAKE) -C mcp clean

# Docs
build-docs:
	@$(MAKE) -C docs build-docker BUILD_TOOL=$(BUILD_TOOL)

clean-docs:
	@$(MAKE) -C docs clean

# Mocks
build-mocks:
	@$(MAKE) -C mocks build-docker BUILD_TOOL=$(BUILD_TOOL)

####################
# Orchestration Targets
####################

.PHONY: deps build build-docker build-docker-all test lint clean
.PHONY: build-rancher build-rancher-all

# Install all dependencies
deps: deps-backend deps-ui deps-desktop deps-mcp

# Build all services (Docker images)
build-docker:
	$(MAKE) -j5 build-backend build-ui build-mlapi build-docs build-mocks

build-docker-all: build-docker build-promosite build-jenkins

# Test all services
test: test-backend test-ui test-mcp test-mlapi

# Lint all services
lint: lint-backend lint-ui lint-mlapi

# Clean all services
clean: clean-backend clean-ui clean-desktop clean-mcp clean-mlapi clean-docs

####################
# Rancher/Nerdctl Build Targets
####################

build-rancher: build-rancher-backend build-rancher-ui build-rancher-mlapi build-rancher-docs build-rancher-mocks

build-rancher-all: build-rancher build-rancher-promosite build-rancher-jenkins

build-rancher-backend:
	@$(MAKE) -C backend build-docker BUILD_TOOL=nerdctl TOOL_ARGS="-n k8s.io"

build-rancher-ui:
	@$(MAKE) -C ui build-docker BUILD_TOOL=nerdctl TOOL_ARGS="-n k8s.io"

build-rancher-mlapi:
	@$(MAKE) -C machinelearning build-docker BUILD_TOOL=nerdctl TOOL_ARGS="-n k8s.io"

build-rancher-docs:
	@$(MAKE) -C docs build-docker BUILD_TOOL=nerdctl TOOL_ARGS="-n k8s.io"

build-rancher-mocks:
	@$(MAKE) -C mocks build-docker BUILD_TOOL=nerdctl TOOL_ARGS="-n k8s.io"

build-rancher-promosite:
	$(BUILD_TOOL) build -t $(PROMO_NAME) -f docker/Dockerfile.promosite . -n k8s.io

build-rancher-jenkins:
	$(BUILD_TOOL) build -t $(JENKINS_NAME) -f docker/Dockerfile.jenkins examples/jenkins -n k8s.io

####################
# Legacy Targets (for backwards compatibility)
####################

.PHONY: deps-node deps-node-backend deps-node-frontend
.PHONY: build-frontend build-docker-backend build-docker-frontend
.PHONY: build-docker-mocks build-docker-docs build-docker-machinelearning

deps-node-backend: deps-backend
deps-node-frontend: deps-ui
deps-node: deps-backend deps-ui

build-frontend: build-ui
build-docker-backend: build-backend
build-docker-frontend: build-ui
build-docker-mocks: build-mocks
build-docker-docs: build-docs
build-docker-machinelearning: build-mlapi

####################
# Promo Site & Jenkins (non-service builds)
####################

.PHONY: build-promosite build-jenkins

build-promosite:
	$(BUILD_TOOL) build -t $(PROMO_NAME) -f docker/Dockerfile.promosite .

build-jenkins:
	$(BUILD_TOOL) build -t $(JENKINS_NAME) -f docker/Dockerfile.jenkins examples/jenkins

####################
# Demo Targets
####################

.PHONY: demo demo-docker demo-setup demo-cleanup

demo-setup:
	@echo "Setting up demo configuration..."
	@mkdir -p backend/config/.demo-backup
	@if [ -f backend/config/remote-config.yaml ]; then \
		cp backend/config/remote-config.yaml backend/config/.demo-backup/; \
	fi
	@cp mocks/config/*.yaml backend/config/ 2>/dev/null || true
	@sed -i.bak 's/mocks:/localhost:/g' backend/config/*.yaml
	@rm -f backend/config/*.bak
	@echo "Demo config ready!"

demo-cleanup:
	@echo "Cleaning up demo configuration..."
	@rm -f backend/config/remote-config.yaml backend/config/workload-config.yaml
	@if [ -f backend/config/.demo-backup/remote-config.yaml ]; then \
		mv backend/config/.demo-backup/* backend/config/; \
	fi
	@rm -rf backend/config/.demo-backup
	@echo "Demo config cleaned up!"

demo: demo-setup
	@echo "Starting demo environment..."
	@echo "Starting mocks..."
	@cd mocks && imposter up -r . &
	@sleep 2
	@echo "Starting backend..."
	@cd backend && CORS_ORIGIN=* npm run dev &
	@sleep 2
	@echo "Starting UI..."
	@cd ui && npm run dev &
	@echo ""
	@echo "Demo is running!"
	@echo "  - Mocks: http://localhost:8080"
	@echo "  - Backend API: http://localhost:3000"
	@echo "  - UI: http://localhost:3001"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@wait

demo-docker:
	docker-compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml --project-directory . up --build

####################
# Docker Compose Targets
####################

.PHONY: docker-compose docker-compose-mocks docker-compose-promosite

docker-compose:
	docker-compose -f compose/docker-compose.yaml --project-directory . up --build

docker-compose-mocks:
	docker-compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml -f compose/docker-compose-examples.yaml --project-directory . up --build

docker-compose-promosite:
	docker-compose -f compose/docker-compose-promosite.yaml --project-directory . up --build

####################
# Helm/K8s Targets
####################

.PHONY: _helm-dep_up lint-helm render-helm build-helm k8s-helm
.PHONY: lint-helm-backend render-helm-backend lint-helm-frontend render-helm-frontend
.PHONY: lint-helm-demo render-helm-demo build-helm-demo k8s-helm-demo
.PHONY: rancher-helm rancher-demo

_helm-dep_up:
ifeq ($(DEP_UP_RUN), false)
	helm dependency update deployment/helm/$(NAME)
	helm dependency update deployment/helm/$(NAME)/charts/$(BACKEND_NAME)
	helm dependency update deployment/helm/$(NAME)/charts/$(FRONTEND_NAME)
DEP_UP_RUN := true
endif

lint-helm: _helm-dep_up lint-helm-backend lint-helm-frontend
	helm lint deployment/helm/$(NAME)

render-helm: _helm-dep_up render-helm-backend render-helm-frontend
	helm template deployment/helm/$(NAME)

lint-helm-backend: _helm-dep_up
	helm lint deployment/helm/$(NAME)/charts/$(BACKEND_NAME)

lint-helm-frontend: _helm-dep_up
	helm lint deployment/helm/$(NAME)/charts/$(FRONTEND_NAME)

render-helm-backend: _helm-dep_up
	helm template deployment/helm/$(NAME)/charts/$(BACKEND_NAME)

render-helm-frontend: _helm-dep_up
	helm template deployment/helm/$(NAME)/charts/$(FRONTEND_NAME)

build-helm: lint-helm lint-helm-backend render-helm-backend lint-helm-frontend render-helm-frontend
	helm dependency update deployment/helm/$(NAME)
	helm package deployment/helm/$(NAME)

lint-helm-demo: _helm-dep_up
	helm lint deployment/helm/$(DEMO)

render-helm-demo: _helm-dep_up
	helm template deployment/helm/$(DEMO)

build-helm-demo: lint-helm-demo
	helm dependency update deployment/helm/$(DEMO)
	helm package deployment/helm/$(DEMO)

k8s-helm: render-helm lint-helm build-helm
	helm $(HELM_ARGS) upgrade -i $(NAME) ./$(NAME)-*.tgz

k8s-helm-demo: render-helm lint-helm build-helm render-helm-demo lint-helm-demo build-helm-demo
	helm $(HELM_ARGS) upgrade -i -f deployment/helm/demo-code-metrics-values.yaml $(NAME) ./$(NAME)-*.tgz
	helm $(HELM_ARGS) upgrade -i $(DEMO) ./$(DEMO)-*.tgz

rancher-helm: HELM_ARGS=--kube-context rancher-desktop
rancher-helm: build-rancher k8s-helm

rancher-demo: HELM_ARGS=--kube-context rancher-desktop
rancher-demo: build-rancher k8s-helm-demo

####################
# Threat Model Targets
####################

.PHONY: threatmodel clean-threatmodel update-githubcss

threatmodel: threatmodel/combined.md threatmodel/dist/threat_model.pdf

clean-threatmodel:
	rm -f threatmodel/combined.md threatmodel/dist/threat_model.pdf threatmodel/github.css

update-githubcss: threatmodel/github.css

threatmodel/github.css:
	wget -O threatmodel/github.css https://raw.githubusercontent.com/simov/markdown-viewer/master/themes/github.css

threatmodel/combined.md:
	cat threatmodel/threat_model.md \
		threatmodel/threat_model_web_ui.md \
		threatmodel/threat_model_cmapi.md \
		threatmodel/threat_model_metrics_store.md \
		threatmodel/threat_model_mitigations.md > threatmodel/combined.md
	sed -i 's#./img/architecture.png#./threatmodel/img/architecture.png#' threatmodel/combined.md
	sed -i 's#<div style="page-break-after: always;"></div>#<div style="page-break-after: always;"></div>\n#' threatmodel/combined.md

threatmodel/dist/threat_model.pdf:
	mkdir -p threatmodel/dist
	pandoc -f gfm -t html5 --pdf-engine-opt=--enable-local-file-access --metadata pagetitle="threatmodel" --css threatmodel/github.css threatmodel/combined.md -o threatmodel/dist/threat_model.pdf

help:
	@echo "Required Tooling"
	@echo "Mac:"
	@echo "brew tap imposter-project/imposter"
	@echo "brew install npm uv imposter"	
	@echo "brew install --cask rancher"
	@echo ""