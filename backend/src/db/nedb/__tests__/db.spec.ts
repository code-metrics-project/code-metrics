import { initNeDB, NeDBDatastore } from "../db";
import { EXPIRY_FIELD } from "../../api";
import path from "path";
import fs from "fs";
import os from "os";

const TEST_COLLECTION = "test-cache";

const testConfigBase = {
  implName: "nedb",
  storeEnabled: true,
  expiryEnabled: true,
  autoCreate: true,
  expireAfterSeconds: 3600,
  ttlIfToday: -1,
};

describe("NeDB inmem / Error tests", () => {
  let store: NeDBDatastore;

  beforeEach(() => {
    delete process.env.DATASTORE_PATH;
    initNeDB();
  });

  afterEach(async () => {
    await store?.connect(TEST_COLLECTION, async (col) => {
      if (typeof col["close"] === "function") {
        await col["close"]();
      }
    });
  });

  test("should operate purely in-memory with no persistence", async () => {
    store = new NeDBDatastore({
      ...testConfigBase,
      storeEnabled: true,
      expiryEnabled: false,
    });

    const filter = { key: "memory" };
    const value = { foo: "bar" };

    await store.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne(filter, value);
    });

    const result = await store.connect(TEST_COLLECTION, (col) => col.findOne(filter));

    expect(result).toMatchObject(value);
  });

  test("should catch and rethrow error from operation callback", async () => {
    store = new NeDBDatastore({
      ...testConfigBase,
      expiryEnabled: true,
    });

    const expectedError = new Error("Simulated failure");

    const failingOperation = jest.fn().mockImplementation(() => {
      throw expectedError;
    });

    await expect(store.connect(TEST_COLLECTION, failingOperation)).rejects.toThrow("Simulated failure");
  });

  test("should reject if db.remove returns an error", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      // @ts-expect-error override for test
      col.db.remove = (filter, opts, cb) => cb(new Error("Simulated remove error"));

      await expect(col.deleteOne({ key: "fail" })).rejects.toThrow("Simulated remove error");
    });
  });

  test("should reject if db.find returns an error", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      // @ts-expect-error override for test
      col.db.find = (query, cb) => cb(new Error("Simulated find error"));

      await expect(col.listItems()).rejects.toThrow("Simulated find error");
    });
  });

  test("should reject if db.remove in deleteAll returns an error", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      // @ts-expect-error override for test
      col.db.remove = (query, opts, cb) => cb(new Error("Simulated deleteAll error"));

      await expect(col.deleteAll()).rejects.toThrow("Simulated deleteAll error");
    });
  });

  test("should reject if db.update in insertOne returns an error", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      // @ts-expect-error override for test
      col.db.update = (query, doc, opts, cb) => cb(new Error("Simulated insertOne error"));

      await expect(col.insertOne({ key: "fail" }, { foo: "bar" })).rejects.toThrow("Simulated insertOne error");
    });
  });
});

describe("NeDB", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-db"));

  let dbPath: string;
  let store: NeDBDatastore;

  beforeEach(() => {
    dbPath = path.join(tempDir, `test-${Date.now()}-${Math.random()}`);
    process.env.DATASTORE_PATH = dbPath;
    initNeDB(dbPath);
    store = new NeDBDatastore(testConfigBase);
  });

  afterEach(async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      if (typeof col["close"] === "function") {
        await col["close"]();
      }
    });
  });

  test("should insert and retrieve a value", async () => {
    const testItem = { foo: "bar" };
    const testFilter = { key: "abc" };

    const nonExpiringStore = new NeDBDatastore({
      ...testConfigBase,
      expiryEnabled: false,
    });

    await nonExpiringStore.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne(testFilter, testItem);
    });

    const result = await nonExpiringStore.connect(TEST_COLLECTION, (col) => col.findOne(testFilter));

    expect(result).toMatchObject(testItem);
  });

  test("should not return expired items (lazy eviction)", async () => {
    const ExpiringStore = new NeDBDatastore({
      ...testConfigBase,
      expiryEnabled: true,
    });
    const expiredItem = {
      foo: "bar",
      [EXPIRY_FIELD]: new Date(0).toISOString(),
    };

    await ExpiringStore.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne({ key: "expired" }, expiredItem);
    });

    const result = await ExpiringStore.connect(TEST_COLLECTION, (col) => col.findOne({ key: "expired" }));

    expect(result).toBeNull();
  });

  test("should delete all items", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne({ key: "one" }, { foo: "bar1" });
      await col.insertOne({ key: "two" }, { foo: "bar2" });

      const all = await col.listItems();
      expect(all.length).toBeGreaterThanOrEqual(2);

      await col.deleteAll();

      const empty = await col.listItems();
      expect(empty.length).toBe(0);
    });
  });

  test("should match documents with extra properties using filter subset", async () => {
    const store = new NeDBDatastore({
      ...testConfigBase,
      expiryEnabled: false,
    });

    const item = { foo: 1, bar: 2 };
    const filter = { foo: 1 };

    await store.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne(filter, item);
    });

    const result = await store.connect(TEST_COLLECTION, (col) => col.findOne(filter));

    expect(result).toMatchObject(item);
  });

  test("should reject if db.findOne returns an error", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      // @ts-expect-error override for test
      col.db.findOne = (_, cb) => cb(new Error("Simulated query error"));
      await expect(col.findOne({ key: "foo" })).rejects.toThrow("Simulated query error");
    });
  });

  test("should return null if document is not found", async () => {
    const item = { foo: 1, bar: 2 };
    const filter = { foo: 1 };

    await store.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne(filter, item);
    });

    const result = await store.connect(TEST_COLLECTION, async (col) => {
      return await col.findOne({ key: "nonexistent" });
    });

    expect(result).toBeNull();
  });

  test("should delete a matching document", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      const filter = { key: "to-delete" };
      await col.insertOne(filter, { value: 123 });

      const existing = await col.findOne(filter);
      expect(existing).not.toBeNull();

      await col.deleteOne(filter);

      const result = await col.findOne(filter);
      expect(result).toBeNull();
    });
  });

  test("should list all documents", async () => {
    await store.connect(TEST_COLLECTION, async (col) => {
      await col.insertOne({ key: "one" }, { foo: 1 });
      await col.insertOne({ key: "two" }, { foo: 2 });

      const items = await col.listItems();
      const keys = items.map((i) => i.key).sort();
      expect(keys).toEqual(["one", "two"]);
    });
  });

  test("should keep collections isolated in the same datastore path", async () => {
    const collectionA = "collectionA";
    const collectionB = "collectionB";
    const storeA = new NeDBDatastore(testConfigBase);
    const storeB = new NeDBDatastore(testConfigBase);

    // Insert into collectionA
    await storeA.connect(collectionA, async (col) => {
      await col.insertOne({ key: "a" }, { value: 1 });
    });
    // Insert into collectionB
    await storeB.connect(collectionB, async (col) => {
      await col.insertOne({ key: "b" }, { value: 2 });
    });

    // Check collectionA does not see collectionB's data
    const resultA = await storeA.connect(collectionA, (col) => col.findOne({ key: "a" }));
    const resultB = await storeB.connect(collectionB, (col) => col.findOne({ key: "b" }));
    const resultAshouldBeNull = await storeA.connect(collectionA, (col) => col.findOne({ key: "b" }));
    const resultBshouldBeNull = await storeB.connect(collectionB, (col) => col.findOne({ key: "a" }));

    expect(resultA).toMatchObject({ key: "a", value: 1 });
    expect(resultB).toMatchObject({ key: "b", value: 2 });
    expect(resultAshouldBeNull).toBeNull();
    expect(resultBshouldBeNull).toBeNull();
  });
});
