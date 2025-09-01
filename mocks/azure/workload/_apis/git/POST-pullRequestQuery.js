const { projectName: adoProjectName, repoName } = context.request.pathParams;

const req = JSON.parse(context.request.body);
console.debug(`Received ${req.queries.length} PR queries ids in request`);

const resultsArr = [];
for (let i = 0; i < req.queries.length; i++) {
  const query = req.queries[i];
  const queryItemResults = {};
  for (let j = 0; j < query.items.length; j++) {
    const wiId = Math.floor(Math.random() * (999999 - 100000 + 1)); // random 6 digit work item ids
    const prId = Math.floor(Math.random() * (999 - 100 + 1)); // random 3 digit pull request ids - for more likely grouping
    const res = [
      {
        repository: {
          id: "7b4091ee-129f-454a-a4b0-2165b37a7196",
          url: "${system.server.url}/311002d1-3082-44f0-b213-97c6c295660e/_apis/git/repositories/7b4091ee-129f-454a-a4b0-2165b37a7196",
        },
        pullRequestId: prId,
        codeReviewId: prId,
        status: "completed",
        createdBy: {
          displayName: "Joe Bloggs",
          url: "${system.server.url}/_apis/Identities/e62df57b-b2bf-6095-a4bc-a8989ccc1802",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.ZTYyZGY1N2ItYjJiZi03MDk1LWE0YmMtYTg5ODljY2MxODAy",
            },
          },
          id: random.uuid(),
          uniqueName: "user@example.com",
          imageUrl: "${system.server.url}/_api/_common/identityImage?id=e62df57b-b2bf-6095-a4bc-a8989ccc1802",
          descriptor: "aad.ZTYyZGY1N2ItYjJiZi03MDk1LWE0YmMtYTg5ODljY2MxODAy",
        },
        creationDate: "2023-10-16T00:00:00.0000000Z",
        closedDate: "2023-10-16T00:00:00.0000000Z",
        title: `#${wiId}: Example PR Title`,
        description: "Adds opengraph meta tags for SEO purposes so crawlers can read the values for search results",
        sourceRefName: `refs/heads/bug/${wiId}-add-opengraph-tags`,
        targetRefName: "refs/heads/main",
        mergeStatus: "succeeded",
        isDraft: false,
        mergeId: random.uuid(),
        lastMergeSourceCommit: {
          commitId: "37f178d8821778f35200f8e2af37fabec50e2945",
          url: "${system.server.url}/_apis/git/repositories/7b4091ee-129f-454a-a4b0-2165b37a7196/commits/37f178d8821778f35200f8e2af37fabec50e2945",
        },
        lastMergeTargetCommit: {
          commitId: "b3a155e4f6b7f0a0465498b904667829dc3361a4",
          url: "${system.server.url}/_apis/git/repositories/7b4091ee-129f-454a-a4b0-2165b37a7196/commits/b3a155e4f6b7f0a0465498b904667829dc3361a4",
        },
        lastMergeCommit: {
          commitId: query.items[j],
          url:
            "${system.server.url}/_apis/git/repositories/7b4091ee-129f-454a-a4b0-2165b37a7196/commits/" +
            query.items[j],
        },
        url: "${system.server.url}/_apis/git/repositories/7b4091ee-129f-454a-a4b0-2165b37a7196/pullRequests/" + wiId,
        completionOptions: {
          mergeCommitMessage: `Merged PR ${prId}: fix: Adds opengraph meta tags for SEO purposes so crawlers can read the values for search results\n\nRelated work items: #${wiId}`,
          squashMerge: true,
          mergeStrategy: "squash",
          autoCompleteIgnoreConfigIds: [],
        },
        supportsIterations: true,
        completionQueueTime: "2023-10-16T00:00:00.0000000Z",
      },
    ];
    queryItemResults[query.items[j]] = res;
  }
  resultsArr.push(queryItemResults);
}

const response = {
  queries: req.queries,
  results: resultsArr,
};

console.debug(`Generated ${resultsArr.length} results for ${adoProjectName}/${repoName}`);
respond().withData(JSON.stringify(response));
