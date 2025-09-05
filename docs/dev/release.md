# Release

The following artifacts are produced as part of a release:

- ZIP archives, including Lambda function and static website (frontend and backend)
- Docker images (frontend, backend and mocks)
- Documentation website

## Release key and dev key

The backend includes a public key that is used to validate the [license file](../configuration.md). The public key is bundled inside the backend application binary.

During development and testing, a development key is used:

    backend/public-keys/pubkey-license-dev.json

For formal releases, the release key is used:

    backend/public-keys/pubkey-license-release.json

Only one of these keys is included within the released binary. This is controlled by running one of the following `npm` commands:

- `npm run build` - development and test releases
- `npm run release` - formal releases

## Process

Releases are cut from the `main` branch.

To cut a new release perform the following steps.

---

### Automated release

The automated release process happens in three parts:

1. Release script updates version, and creates tag
2. Push to GitHub, where Actions workflow runs tests
3. On successful test execution, Docker images are built and pushed and a GitHub Release is created

#### Step 1: Update version and create tag

Run the release prep script:

```bash
./scripts/prep_release.sh <release type>
```

> Release type should be one of `major`, `minor` or `patch`, per [Semver](https://semver.org/).
> 
> For example:
> 
> ```bash
> ./scripts/prep_release.sh minor
> ```

This script will:

- update the version in `package.json`
- commit the changes and
- create a tag for that commit

> **Note**
> The script does not push to the remote.

#### Step 2: Push to remote and let GitHub Actions run

Push the changes to the remote:

```bash
git push origin main --tags
```

View the GitHub Actions workflow at: [https://github.com/DeloitteDigitalUK/code-metrics/actions](https://github.com/DeloitteDigitalUK/code-metrics/actions)

This will:

- run tests
- package assets
- build and push Docker images
- create GitHub release

On successful execution, see [Releases](https://github.com/DeloitteDigitalUK/code-metrics/releases).

---

### Manual release

If you don't want to use the automated release process, use the following steps.

#### Step 1: Manually run tests

Before you start, check all the tests pass:

Backend:
```bash
$ cd $PROJECT_ROOT/backend
$ npm test && npm run test:integration && npm run test:slow
```

Frontend:
```bash
cd $PROJECT_ROOT/ui
npm run test:unit
```

Integration:
```bash
./scripts/validate-test_e2e_mocks.sh
```

#### Step 2: Update the version in `backend`

Update the `version` field in `backend/package.json`.

> Notes:
> 
> - we need to keep the version in backend/package.json up to date with the release
> - this only works when we build a production version of the app
> - UI package version is ignored

Commit this change with a message like:

```
build: release x.y.z.
```

#### Step 3: Cut the tag

Create a tag in the following format:

    x.y.z

For example:

    1.2.3

Push your tag to GitHub. The CI/CD pipeline will test the application components, then build and push the Docker images.  

#### Step 4: Create a GitHub release

Follow the instructions here: [https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release)

---

## Documentation website

The documentation website is located at https://code-metrics-project.github.io/docs

The GitHub org for this is: `code-metrics-project` and the repository within it is `docs`.

The release process involves copying elements from the main repository's `docs` directory into the docs repository. The docs repository has its own release pipeline that is triggered by a push to the `main` branch.

To initiate the copy from the main project repository, run the `docs-site` [GitHub Actions workflow](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/docs-site.yaml).

---

## Public releases

Public releases are located at https://github.com/code-metrics-project/releases

The GitHub org for this is `code-metrics-project` and the repository within it is `release`.

The release process involves copying the release name, body and its assets form the main repository to the `code-metrics-project/release` repository.

To initiate the public release from the main project repository, run the `public-release` [GitHub Actions workflow](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/public-release.yaml).
