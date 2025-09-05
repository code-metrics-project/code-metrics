handle(context.request);

function handle(req) {
  const rawWorkItemIds = req.queryParams.ids;
  const workItemIds = rawWorkItemIds.split(",");
  console.debug(`Received ${workItemIds} as workItemId list, length: ${workItemIds.length}`);

  // No / Invalid Work Item ids case - structured as per ADO response
  if (!workItemIds.length || !workItemIds[0]) {
    console.debug("No Work Item ids provided");
    respond()
      .withData(
        JSON.stringify({
          count: 1,
          results: {
            Message: "A value is required but was not present in the request.\r\n",
          },
        }),
      )
      .withStatusCode(400);
    return;
  }

  const workItemTypes = ["Bug", "Task", "User Story"];
  const envIdentified = ["DEV", "QA", "PRE-PRODUCTION", "PRODUCTION"];
  const severities = ["1 - Highest", "2 - High", "3 - Medium", "4 - Low", "5 - Lowest"];

  // Work Item Id list provided
  const results = [];
  for (let i = 0; i < workItemIds.length; i++) {
    const id = workItemIds[i];
    const type = workItemTypes[Math.floor(Math.random() * workItemTypes.length)];
    const rev = Math.floor(Math.random() * 51); // random revision number 1 - 50
    const comments = Math.floor(Math.random() * 11); // random number of comments 1 - 10
    const priority = Math.floor(Math.random() * 6); // random priority 1 Lowest - 5 Highest
    const env = envIdentified[Math.floor(Math.random() * envIdentified.length)]; // random environment
    const severity = severities[Math.floor(Math.random() * severities.length)]; // random severity 1 Highest - 5 Lowest
    const dates = generateRandomDates();

    results.push({
      id: id,
      rev: rev,
      fields: {
        "System.AreaPath": "ADO Mock Project\\MockTeam",
        "System.TeamProject": "ADO Mock Project",
        "System.IterationPath": "ADO Mock Project\\Iterations\\Iteration 2",
        "System.WorkItemType": type,
        "System.State": "Closed",
        "System.Reason": "Verified",
        "System.AssignedTo": {
          displayName: "Ada Lovelace",
          url: "${system.server.url}/_apis/Identities/112009ec-22ec-6869-bcb8-bb57ad28f13d",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
            },
          },
          id: "112009ec-22ec-6869-bcb8-bb57ad28f13d",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
          descriptor: "aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
        },
        "System.CreatedDate": dates.createdDate,
        "System.CreatedBy": {
          displayName: "Ada Lovelace",
          url: "${system.server.url}/_apis/Identities/112009ec-22ec-6869-bcb8-bb57ad28f13d",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
            },
          },
          id: "112009ec-22ec-6869-bcb8-bb57ad28f13d",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
          descriptor: "aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
        },
        "System.ChangedDate": dates.changedDate,
        "System.ChangedBy": {
          displayName: "Ada Lovelace",
          url: "${system.server.url}/_apis/Identities/1461352e-f6e5-6c9d-9801-d32eda20ecc0",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
            },
          },
          id: "1461352e-f6e5-6c9d-9801-d32eda20ecc0",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
          descriptor: "aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
        },
        "System.CommentCount": comments,
        "System.Title": "BE | SEO | No values rendered for metadata",
        "System.BoardColumn": "Closed",
        "System.BoardColumnDone": false,
        "Microsoft.VSTS.Common.StateChangeDate": dates.changedDate,
        "Microsoft.VSTS.Common.ActivatedDate": dates.createdDate,
        "Microsoft.VSTS.Common.ActivatedBy": {
          displayName: "Ada Lovelace",
          url: "${system.server.url}/_apis/Identities/e62df57b-b2bf-6095-a4bc-a8989ccc1802",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.ZTYyZGY1N2ItYjJiZi03MDk1LWE0YmMtYTg5ODljY2MxODAy",
            },
          },
          id: "e62df57b-b2bf-6095-a4bc-a8989ccc1802",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.ZTYyZGY1N2ItYjJiZi03MDk1LWE0YmMtYTg5ODljY2MxODAy",
          descriptor: "aad.ZTYyZGY1N2ItYjJiZi03MDk1LWE0YmMtYTg5ODljY2MxODAy",
        },
        "Microsoft.VSTS.Common.ResolvedDate": dates.resolvedDate,
        "Microsoft.VSTS.Common.ResolvedBy": {
          displayName: "Joe Bloggs",
          url: "${system.server.url}/_apis/Identities/1461352e-f6e5-6c9d-9801-d32eda20ecc0",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
            },
          },
          id: "1461352e-f6e5-6c9d-9801-d32eda20ecc0",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
          descriptor: "aad.MTQ2MTM1MmUtZjZlNS03YzlkLTk4MDEtZDMyZWRhMjBlY2Mw",
        },
        "Microsoft.VSTS.Common.ResolvedReason": "Fixed",
        "Microsoft.VSTS.Common.ClosedDate": dates.resolvedDate,
        "Microsoft.VSTS.Common.ClosedBy": {
          displayName: "Ada Lovelace",
          url: "${system.server.url}/_apis/Identities/112009ec-22ec-6869-bcb8-bb57ad28f13d",
          _links: {
            avatar: {
              href: "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
            },
          },
          id: "112009ec-22ec-6869-bcb8-bb57ad28f13d",
          uniqueName: "user@example.com",
          imageUrl:
            "${system.server.url}/_apis/GraphProfile/MemberAvatars/aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
          descriptor: "aad.MTEyMDA5ZWMtMjJlYy03ODY5LWJjYjgtYmI1N2FkMjhmMTNk",
        },
        "Microsoft.VSTS.Common.Priority": priority,
        "Microsoft.VSTS.Common.Severity": severity,
        "Microsoft.VSTS.Common.ValueArea": "Business",
        "AgileBrandandComm.DefectType": "Code Defect",
        "AgileBrandandComm.EnvironmentIdentified": env,
        "Microsoft.VSTS.TCM.ReproSteps":
          "<div><b>Steps to reproduce<b><br><ol><li>Step 1<li>Step 2<li>Step 3</ol></div>",
        "AgileRM.ResolutionNote":
          "<div>Added og:title, og:image, og:description tags to fix metadata for crawlers</div>",
      },
      url: "${system.server.url}/_apis/wit/workItems/" + id,
    });
  }

  const response = {
    count: results.length,
    value: results,
  };

  console.debug(`Generated ${results.length} results for ${workItemIds}`);
  respond().withData(JSON.stringify(response));
}

function generateRandomDates() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago in milliseconds
  const createdDate = new Date(sevenDaysAgo.getTime() + Math.random() * (now.getTime() - sevenDaysAgo.getTime())); // random time within the last 7 days
  const changedDate = new Date(createdDate.getTime() + Math.random() * (now.getTime() - createdDate.getTime())); // random time after createdDate but before now
  const resolvedDate = new Date(changedDate.getTime() + Math.random() * (now.getTime() - changedDate.getTime())); // random time after changedDate but before now
  return {
    createdDate: createdDate.toISOString(),
    changedDate: changedDate.toISOString(),
    resolvedDate: resolvedDate.toISOString(),
  };
}
