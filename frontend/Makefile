NAME := code-metrics
IMAGE_NAME := $(NAME)-ui
BUILD_TOOL := docker

.PHONY: deps build build-docker test test-e2e lint lint-fix dev clean

deps:
	npm ci

build:
	npm run build

build-docker:
	$(BUILD_TOOL) build -t $(IMAGE_NAME) -f ../docker/Dockerfile.ui .

test:
	npm test

test-e2e:
	npm run test:e2e:headless

test-e2e-smoke:
	npm run test:e2e:smoke

lint:
	npm run lint

lint-fix:
	npm run lint:fix

dev:
	npm run dev

clean:
	rm -rf dist node_modules
