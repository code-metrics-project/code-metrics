const { projectName: adoProjectName, repoName, commitId } = context.request.pathParams;

const changes = [];
const changeCount = Math.round(Math.random() * 9) + 1; // Between 1-10 commit changes
for (let i = 0; i < changeCount; i++) {
  const gOID = random.uuid();
  const gOOID = random.uuid();

  const gFileNum = Math.round(Math.random() * 50); // Random 'file' in 50

  changes.push({
    item: {
      objectId: gOID,
      originalObjectId: gOOID,
      gitObjectType: "blob",
      commitId: commitId,
      path: "/myProject/src/file." + gFileNum,
      url:
        "${system.server.url}/f594b5fb-900c-49d0-bbd8-24d2bc2985ad/_apis/git/repositories/6ebe4899-440c-44cd-9236-3c10048cecaa/items/myProject%2Fsrc%2Ffile." +
        gFileNum +
        "?versionType=Commit&version=" +
        commitId,
    },
    changeType: "edit",
  });
}

const response = {
  changeCounts: {
    Edit: changeCount,
  },
  changes: changes,
};

console.debug(`Generated ${changes.length} changes for ${adoProjectName}/${repoName} commit with hash ${commitId}`);
respond().withData(JSON.stringify(response));
