NAME := code-metrics
DEMO := $(NAME)-demo
BACKEND_NAME := $(NAME)-api
FRONTEND_NAME := $(NAME)-ui
MOCK_NAME := $(NAME)-mocks
MLAPI_NAME := $(NAME)-mlapi
DOCS_NAME := $(NAME)-docs
PROMO_NAME := $(NAME)-promosite
JENKINS_NAME := demo-jenkins

DEP_UP_RUN := false

###### Validate ##########
.PHONEY: _helm-dep_up lint-helm render-helm lint-helm-backend render-helm-backend lint-helm-frontend render-helm-frontend lint-helm-demo render-helm-demo

_helm-dep_up:
ifeq ($(DEP_UP_RUN), false)
	helm dependency update helm/$(NAME)
	helm dependency update helm/$(NAME)/charts/$(BACKEND_NAME)
	helm dependency update helm/$(NAME)/charts/$(FRONTEND_NAME)
DEP_UP_RUN := true
endif

.PHONEY: clean-threatmodel

clean-threatmodel:
	rm threatmodel/combined.md threatmodel/dist/threat_model.pdf threatmodel/github.css

threatmodel: threatmodel/combined.md threatmodel/dist/threat_model.pdf

update-githubcss: threatmodel/github.css

threatmodel/github.css:
	# We store this as I dont like the wget as a dependency for the build
	wget -O threatmodel/github.css https://raw.githubusercontent.com/simov/markdown-viewer/master/themes/github.css

threatmodel/combined.md:
	cat threatmodel/threat_model.md \
		threatmodel/threat_model_web_ui.md \
		threatmodel/threat_model_cmapi.md \
		threatmodel/threat_model_metrics_store.md \
		threatmodel/threat_model_mitigations.md > threatmodel/combined.md

	# This is because we are running the pandoc command from outside of teh directory
	sed -i 's#./img/architecture.png#./threatmodel/img/architecture.png#' threatmodel/combined.md
	# This feels cumbersome but the cat is removing the newline at the end of each file for some reason.
	sed -i 's#<div style="page-break-after: always;"></div>#<div style="page-break-after: always;"></div>\n#' threatmodel/combined.md

threatmodel/dist/threat_model.pdf:
	mkdir -p threatmodel/dist
	pandoc -f gfm -t html5 --pdf-engine-opt=--enable-local-file-access --metadata pagetitle="threatmodel" --css threatmodel/github.css threatmodel/combined.md -o threatmodel/dist/threat_model.pdf


lint-helm: _helm-dep_up lint-helm-backend lint-helm-frontend
	helm lint helm/$(NAME)

render-helm: _helm-dep_up render-helm-backend render-helm-frontend
	helm template helm/$(NAME)

lint-helm-backend: _helm-dep_up
	helm lint helm/$(NAME)/charts/$(BACKEND_NAME)

lint-helm-frontend: _helm-dep_up
	helm lint helm/$(NAME)/charts/$(FRONTEND_NAME)

render-helm-backend: _helm-dep_up
	helm template helm/$(NAME)/charts/$(BACKEND_NAME)

render-helm-frontend: _helm-dep_up
	helm template helm/$(NAME)/charts/$(FRONTEND_NAME)

lint-helm-demo: _helm-dep_up
	helm lint helm/$(DEMO)

render-helm-demo: _helm-dep_up
	helm template helm/$(DEMO)

###### Build ##########
.PHONEY: build-docker build-docker-backend build-docker-frontend build-docker-mocks build-docker-jenkins build-docker-docs build-docker-machinelearning build-docker-promosite
.PHONEY: build-rancher build-rancher-backend build-rancher-frontend build-rancher-mocks build-rancher-jenkins build-rancher-docs build-rancher-machinelearning build-rancher-promosite
.PHONEY: build-frontend build-backend build-helm build-mocks build-jenkins build-docs build-promosite
.PHONEY: build-helm build-helm-demo
.PHONEY: deps-node deps-node-backend deps-node-frontend

BUILD_TOOL := docker

build-rancher: build-rancher-backend build-rancher-mocks build-rancher-frontend build-rancher-docs build-rancher-jenkins build-rancher-machinelearning build-rancher-promosite

build-rancher-backend: BUILD_TOOL=nerdctl
build-rancher-backend: TOOL_ARGS=-n k8s.io
build-rancher-backend: build-backend
build-rancher-frontend: BUILD_TOOL=nerdctl
build-rancher-frontend: TOOL_ARGS=-n k8s.io
build-rancher-frontend: build-frontend
build-rancher-mocks: BUILD_TOOL=nerdctl
build-rancher-mocks: TOOL_ARGS=-n k8s.io
build-rancher-mocks: build-mocks
build-rancher-docs: BUILD_TOOL=nerdctl
build-rancher-docs: TOOL_ARGS=-n k8s.io
build-rancher-docs: build-docs
build-rancher-jenkins: BUILD_TOOL=nerdctl
build-rancher-jenkins: TOOL_ARGS=-n k8s.io
build-rancher-jenkins: build-jenkins
build-rancher-machinelearning: BUILD_TOOL=nerdctl
build-rancher-machinelearning: TOOL_ARGS=-n k8s.io
build-rancher-machinelearning: build-machinelearning
build-rancher-promosite: BUILD_TOOL=nerdctl
build-rancher-promosite: TOOL_ARGS=-n k8s.io
build-rancher-promosite: build-promosite

build-docker: build-docker-backend build-docker-frontend build-docker-mocks build-docker-docs build-docker-jenkins build-docker-machinelearning build-docker-promosite

build-docker-backend: build-backend
build-docker-frontend: build-frontend
build-docker-mocks: build-mocks
build-docker-docs: build-docs
build-docker-jenkins: build-jenkins
build-docker-machinelearning: build-machinelearning
build-docker-promosite: build-promosite

build-frontend:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(FRONTEND_NAME) -f docker/Dockerfile.ui ui/

build-backend:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(BACKEND_NAME) -f docker/Dockerfile.backend backend/

build-mocks:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(MOCK_NAME) -f docker/Dockerfile.mocks mocks

build-docs:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(DOCS_NAME) -f docker/Dockerfile.docs --build-arg="DOCSDIR=./docs" .

build-jenkins:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(JENKINS_NAME) -f docker/Dockerfile.jenkins examples/jenkins

build-machinelearning:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(MLAPI_NAME) -f docker/Dockerfile.machinelearning machinelearning

build-promosite:
	$(BUILD_TOOL) $(TOOL_ARGS) build -t $(PROMO_NAME) -f docker/Dockerfile.promosite .

build-helm: lint-helm lint-helm-backend render-helm-backend lint-helm-frontend render-helm-frontend
	helm dependency update helm/$(NAME)
	helm package helm/$(NAME)

build-helm-demo: lint-helm-demo
	helm dependency update helm/$(DEMO)
	helm package helm/$(DEMO)

deps-node-backend:
	cd backend && npm ci

deps-node-frontend:
	cd ui && npm ci

deps-node: deps-node-backend deps-node-frontend

#### DEPLOY ####
.PHONEY: docker-compose docker-compose-mocks
.PHONEY: rancher-helm rancher-manifest
.PHONEY: k8s-helm k8s-helm-demo

docker-compose-mocks:
	docker-compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml -f compose/docker-compose-examples.yaml --project-directory . up --build

docker-compose-promosite:
	docker-compose -f compose/docker-compose-promosite.yaml --project-directory . up --build
	
docker-compose:
	docker-compose -f compose/docker-compose.yaml --project-directory . up --build

rancher-helm: HELM_ARGS=--kube-context rancher-desktop
rancher-helm: build-rancher k8s-helm

rancher-demo: HELM_ARGS=--kube-context rancher-desktop
rancher-demo: build-rancher k8s-helm-demo

k8s-helm: render-helm lint-helm build-helm
	helm $(HELM_ARGS) upgrade -i $(NAME) ./$(NAME)-*.tgz

k8s-helm-demo: render-helm lint-helm build-helm render-helm-demo lint-helm-demo build-helm-demo
	helm $(HELM_ARGS) upgrade -i -f helm/demo-code-metrics-values.yaml $(NAME) ./$(NAME)-*.tgz
	helm $(HELM_ARGS) upgrade -i $(DEMO) ./$(DEMO)-*.tgz