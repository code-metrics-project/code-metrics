NAME := code-metrics
IMAGE_NAME := $(NAME)-api
BUILD_TOOL := docker

.PHONY: deps build build-docker test lint dev clean

deps:
	npm ci

build:
	npm run build

build-docker:
	$(BUILD_TOOL) build -t $(IMAGE_NAME) -f ../docker/Dockerfile.backend .

test:
	npm test

test-integration:
	npm run test:integration

test-slow:
	npm run test:slow

lint:
	npm run lint

lint-fix:
	npm run lint:fix

dev:
	npm run dev

clean:
	rm -rf dist node_modules
