// Polyfill for random.uuid() - required in Docker environment
var random = typeof random !== "undefined" ? random : undefined;
if (!random) {
  random = {
    uuid: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  };
}

const { projectName: adoProjectName, repoName, commitId } = context.request.pathParams;

// Use a smaller set of "hot" files that are frequently changed
// This creates more realistic bug culprit data where certain files are touched multiple times
const hotFiles = [
  "/myProject/src/UserService.java",
  "/myProject/src/AuthController.java",
  "/myProject/src/PaymentProcessor.java",
  "/myProject/src/OrderManager.java",
  "/myProject/src/DatabaseHelper.java",
  "/myProject/src/ApiClient.java",
  "/myProject/src/ConfigLoader.java",
  "/myProject/src/utils/StringUtils.java",
];

// Occasionally add some random files too
const randomFileCount = 50;

const changes = [];
const changeCount = Math.round(Math.random() * 5) + 2; // Between 2-7 commit changes

for (let i = 0; i < changeCount; i++) {
  const gOID = random.uuid();
  const gOOID = random.uuid();

  // 70% chance to use a hot file, 30% chance for a random file
  let filePath;
  if (Math.random() < 0.7) {
    filePath = hotFiles[Math.floor(Math.random() * hotFiles.length)];
  } else {
    const gFileNum = Math.round(Math.random() * randomFileCount);
    filePath = "/myProject/src/file." + gFileNum;
  }

  changes.push({
    item: {
      objectId: gOID,
      originalObjectId: gOOID,
      gitObjectType: "blob",
      commitId: commitId,
      path: filePath,
      url:
        "${system.server.url}/f594b5fb-900c-49d0-bbd8-24d2bc2985ad/_apis/git/repositories/6ebe4899-440c-44cd-9236-3c10048cecaa/items" +
        encodeURIComponent(filePath) +
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
