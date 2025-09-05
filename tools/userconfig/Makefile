# Binary name
BINARY_NAME=userconfig

# Output directory
DIST_DIR=dist

# Platforms to build for
PLATFORMS = \
  darwin/amd64 \
  darwin/arm64 \
  linux/amd64 \
  linux/arm64 \
  windows/amd64

.PHONY: all clean build build-all test

# Default target
all: clean build

test:
	go test ./...

clean:
	rm -rf $(DIST_DIR)

build:
	@mkdir -p $(DIST_DIR)
	GOOS=$(shell go env GOOS) GOARCH=$(shell go env GOARCH) \
	go build -o $(DIST_DIR)/$(BINARY_NAME)-$(shell go env GOOS)-$(shell go env GOARCH) main.go

build-all:
	mkdir -p $(DIST_DIR)
	$(foreach platform,$(PLATFORMS), \
		GOOS=$(word 1,$(subst /, ,$(platform))) \
		GOARCH=$(word 2,$(subst /, ,$(platform))) \
		OUTPUT_NAME=$(BINARY_NAME)-$(word 1,$(subst /, ,$(platform)))-$(word 2,$(subst /, ,$(platform))); \
		if [ "$(word 1,$(subst /, ,$(platform)))" = "windows" ]; then \
			OUTPUT_NAME=$$OUTPUT_NAME.exe; \
		fi; \
		echo "Building $$OUTPUT_NAME"; \
		GOOS=$$GOOS GOARCH=$$GOARCH go build -o $(DIST_DIR)/$$OUTPUT_NAME main.go; \
	)
