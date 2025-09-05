const fs = require('fs');

/**
 * @param github github client
 * @param context job context
 * @param changes {string}
 * @returns {Promise<void>}
 */
module.exports = async ({github, context}, changes) => {
    const releaseVersion = context.ref.split('/')[2];
    console.log(`Creating release: ${releaseVersion}`);
    const release = await github.rest.repos.createRelease({
        owner: 'DeloitteDigitalUK',
        repo: 'code-metrics',
        tag_name: releaseVersion,
        body: `${changes}\n\n## Docker images\n\nSee Docker images on [GitHub Container Registry](https://github.com/orgs/code-metrics-project/packages?repo_name=releases)\n`,
    });
    const releaseId = release.data.id;

    const releaseAssets = getReleaseAssets(releaseVersion);
    console.log(`Uploading ${releaseAssets.length} release assets`);
    for (const asset of releaseAssets) {
        await uploadAsset(github, releaseId, asset.localPath, asset.assetName);
    }
};

function getReleaseAssets(releaseVersion) {
    return [
        {
            localPath: 'dist/backend.zip',
            assetName: 'codemetrics-api.zip',
        },
        {
            localPath: 'dist/ui.zip',
            assetName: 'codemetrics-ui.zip',
        },
        {
            localPath: `dist/code-metrics-${releaseVersion}.tgz`,
            assetName: `helm-code-metrics-${releaseVersion}.tgz`,
        },
        {
            localPath: `dist/code-metrics-demo-${releaseVersion}.tgz`,
            assetName: `helm-code-metrics-demo-${releaseVersion}.tgz`,
        },
        {
            localPath: `dist/config.zip`,
            assetName: `config.zip`,
        },
        {
            localPath: `dist/threatmodel.zip`,
            assetName: `threatmodel.zip`,
        },
    ];
}

async function uploadAsset(github, releaseId, localPath, releaseAssetName) {
    console.log(`Uploading ${localPath} as ${releaseAssetName}`);
    await github.rest.repos.uploadReleaseAsset({
        owner: 'DeloitteDigitalUK',
        repo: 'code-metrics',
        release_id: releaseId,
        name: releaseAssetName,
        data: fs.readFileSync(localPath),
    });
}
