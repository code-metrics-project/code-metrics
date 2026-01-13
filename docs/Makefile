NAME := code-metrics
IMAGE_NAME := $(NAME)-docs
BUILD_TOOL := docker

.PHONY: build build-docker serve clean

build:
	mkdocs build

build-docker:
	$(BUILD_TOOL) build -t $(IMAGE_NAME) -f ../docker/Dockerfile.docs --build-arg="DOCSDIR=./docs" ..

serve:
	mkdocs serve

clean:
	rm -rf site
