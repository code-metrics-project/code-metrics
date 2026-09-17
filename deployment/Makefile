### Download
.PHONY: extract copy-config download stage-demo-config configure-demo-remote-config prepare-demo-config

EXAMPLE_CONFIG_DIR := ../backend/config/examples
MOCK_CONFIG_DIR := ../mocks/config
STAGED_CONFIG_DIR := dist/config/api
MOCKS_OUTPUT_FILE := mocks_output.json

get-release:
	curl -s https://api.github.com/repos/code-metrics-project/releases/releases/latest \
			| grep "browser_download_url.*zip" \
			| cut -d : -f 2,3 \
			| tr -d \" \
			| wget -qi - -P dist/

extract:
	cd dist/ && for f in *.zip; do unzip "$$f" -d "$${f%.zip}"; done

copy-config:
	mkdir -p dist/codemetrics-api/config
	rm -f dist/codemetrics-api/config/*
	cp dist/config/api/* dist/codemetrics-api/config/

stage-demo-config:
	mkdir -p $(STAGED_CONFIG_DIR)
	rm -f $(STAGED_CONFIG_DIR)/*
	cp $(EXAMPLE_CONFIG_DIR)/dashboard-config.json $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/license.yaml $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/pipeline-config.yaml $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/quality-gates-config.yaml $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/queries-config.json $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/rbac.yaml $(STAGED_CONFIG_DIR)/
	cp $(MOCK_CONFIG_DIR)/remote-config.yaml $(STAGED_CONFIG_DIR)/
	cp $(EXAMPLE_CONFIG_DIR)/workload-config.yaml $(STAGED_CONFIG_DIR)/

configure-demo-remote-config: stage-demo-config
	@MOCKS_BASE_URL="$${MOCKS_BASE_URL:-$$(node -e "const fs = require('fs'); const path = '$(MOCKS_OUTPUT_FILE)'; if (!fs.existsSync(path)) process.exit(0); const data = JSON.parse(fs.readFileSync(path, 'utf8')); process.stdout.write(Object.values(data || {}).map(function (outputs) { return outputs && outputs.MockBaseUrl; }).find(Boolean) || '');")}"; \
	if [ -z "$$MOCKS_BASE_URL" ]; then \
		echo "MOCKS_BASE_URL is not set. Export MOCKS_BASE_URL=<url> or create $(MOCKS_OUTPUT_FILE) with the mock deploy outputs."; \
		exit 1; \
	fi; \
	MOCKS_BASE_URL="$$MOCKS_BASE_URL" node -e "const fs = require('fs'); const file = '$(STAGED_CONFIG_DIR)/remote-config.yaml'; const rawUrl = process.env.MOCKS_BASE_URL; const url = rawUrl.replace(/\/+$$/, ''); const text = fs.readFileSync(file, 'utf8').replaceAll('http://localhost:8080', url).replaceAll('http://mocks:8080', url); fs.writeFileSync(file, text);"; \
	echo "Configured $(STAGED_CONFIG_DIR)/remote-config.yaml with $$MOCKS_BASE_URL"

prepare-demo-config: configure-demo-remote-config copy-config

get-dev:
	cd ../backend && npm ci && npm run release:dev
	cd ../frontend && bun install --frozen-lockfile && bun run build

	rm -rf ./dist/codemetrics-{api,frontend}
	mkdir -p dist/codemetrics-{api/config,frontend}

	cp -r ../backend/dist/* dist/codemetrics-api/
	cp -r ../frontend/dist/* dist/codemetrics-frontend/

### Mocks (Imposter Go)
.PHONY: get-imposter-go get-imposter-go-plugins build-imposter-go-lambda deploy-aws-cdk-mocks destroy-aws-cdk-mocks-all

IMPOSTER_GO_VERSION := 5.21.3
IMPOSTER_GO_LAMBDA_DIR := dist/imposter-go-lambda

get-imposter-go:
	mkdir -p dist
	curl -fL https://github.com/imposter-project/imposter-go/releases/download/v$(IMPOSTER_GO_VERSION)/imposter-go_linux_amd64.tar.gz \
			-o dist/imposter-go_linux_amd64.tar.gz
	cd dist && tar xzf imposter-go_linux_amd64.tar.gz
	mv dist/imposter-go dist/bootstrap
	rm -f dist/imposter-go_linux_amd64.tar.gz dist/CHANGELOG.md dist/README.md

get-imposter-go-plugins:
	mkdir -p dist
	curl -fL "https://github.com/imposter-project/imposter-go-plugins/releases/download/v$(IMPOSTER_GO_VERSION)/plugin-oidc-server_linux_amd64.zip" \
			-o dist/plugin-oidc-server_linux_amd64.zip
	mkdir -p dist/plugins
	cd dist && unzip -o plugin-oidc-server_linux_amd64.zip -d plugins/
	rm -f dist/plugin-oidc-server_linux_amd64.zip

build-imposter-go-lambda: get-imposter-go get-imposter-go-plugins
	rm -rf $(IMPOSTER_GO_LAMBDA_DIR)
	mkdir -p $(IMPOSTER_GO_LAMBDA_DIR)/config $(IMPOSTER_GO_LAMBDA_DIR)/plugins
	cp dist/bootstrap $(IMPOSTER_GO_LAMBDA_DIR)/
	cp dist/plugins/* $(IMPOSTER_GO_LAMBDA_DIR)/plugins/
	rsync -a --exclude='config/' --exclude='Makefile' --exclude='README.md' \
		--exclude='.imposter*' --exclude='validate-mock-config.sh' \
		../mocks/ $(IMPOSTER_GO_LAMBDA_DIR)/config/

deploy-aws-cdk-mocks: build-imposter-go-lambda
	cd aws/cdk/mocks && npm ci && npm run deploy -- --outputs-file "../../../$(MOCKS_OUTPUT_FILE)"

destroy-aws-cdk-mocks-all:
	cd aws/cdk/mocks && cdk destroy --all

### CDK
.PHONY: deploy-aws-cdk-native install-cdk update-cdk destroy-aws-cdk-native-all build-aws-cdk-native build-prepopulatelambda build-authwiringlambda

install-cdk:
	brew install aws-cdk

build-prepopulatelambda:
	cd aws/cdk/native/prepopulateCognito && npm ci && npm run build

build-authwiringlambda:
	cd aws/cdk/native/authWiring && npm ci && npm run build

update-cdk:
	brew upgrade aws-cdk
	cd aws/cdk/native && npm install aws-cdk@latest aws-cdk-lib@latest --save
	cd aws/cdk/mocks && npm install aws-cdk@latest aws-cdk-lib@latest --save

build-aws-cdk-native:
	cd aws/cdk/native && npm ci && npm test && npm run build

deploy-aws-cdk-native: build-prepopulatelambda build-authwiringlambda build-aws-cdk-native
	cd aws/cdk/native && npm run deploy -- --outputs-file "../../../native_output.json"

#### upload to S3 ???

destroy-aws-cdk-native-all:
	cd aws/cdk/native && cdk destroy --all

### SAM
.PHONY: install-sam build-aws-sam deploy-aws-sam deploy-local-sam invoke-local-sam

install-sam:
	brew install aws-sam-cli

build-aws-sam:
	cd aws/sam/lambda && npm ci && npm run build

deploy-aws-sam:
	cd aws/sam/lambda && sam deploy --guided

deploy-local-sam:
	cd aws/sam/lambda && sam local start-lambda

invoke-local-sam:
	cd aws/sam/lambda && aws lambda invoke --endpoint http://localhost:3001 --function-name CodeMetricsFunction --payload file://events/event.json --cli-binary-format raw-in-base64-out -
