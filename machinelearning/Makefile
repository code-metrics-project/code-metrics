NAME := code-metrics
MLAPI_NAME := $(NAME)-mlapi

.PHONEY: setup install-uv install-tools lint test

setup: install-uv install-tools

install-uv:
	brew install uv

install-tools:
	uv tool install ruff
	uv tool install pytest
	uv tool install black

lint:
	uv tool run ruff check --output-format=github src/
	uv tool run black src/

build: lint test
	uv build

test:
	PYTHONPATH=src/ uv run -m pytest
run:
	uv run dev