NAME := code-metrics
IMAGE_NAME := $(NAME)-mocks
BUILD_TOOL := docker

.PHONY: build-docker run stop

build-docker:
	$(BUILD_TOOL) build -t $(IMAGE_NAME) -f ../docker/Dockerfile.mocks .

run:
	imposter up -r .

stop:
	imposter down
