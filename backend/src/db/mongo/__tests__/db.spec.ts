import { MongoDatastore, initMongoDb, mongoAdmin } from "../db";
import { DatastoreConfig, DO_NOT_EXPIRE, EXPIRY_FIELD } from "../../api";
import { overrideConfigItem } from "../../../config/sources/source";

// Mock mongodb
const mockListCollections = jest.fn();
const mockCreateCollection = jest.fn();
const mockCollection = jest.fn();
const mockIndexExists = jest.fn();
const mockCreateIndex = jest.fn();
const mockCountDocuments = jest.fn();
const mockDeleteMany = jest.fn();

const mockDb = jest.fn().mockReturnValue({
  listCollections: mockListCollections,
  createCollection: mockCreateCollection,
  collection: mockCollection,
});

const mockConnect = jest.fn().mockResolvedValue({
  db: mockDb,
});

jest.mock("mongodb", () => ({
  MongoClient: {
    connect: (...args: unknown[]) => mockConnect(...args),
  },
}));

// Mock logger to suppress output in tests
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
}));

const buildConfig = (overrides: Partial<DatastoreConfig> = {}): DatastoreConfig => ({
  implName: "mongodb",
  storeEnabled: true,
  expiryEnabled: false,
  autoCreate: true,
  expireAfterSeconds: DO_NOT_EXPIRE,
  ttlIfToday: DO_NOT_EXPIRE,
  ...overrides,
});

describe("MongoDatastore", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    overrideConfigItem("DATABASE_URI", "mongodb://localhost:27017");
    overrideConfigItem("DATABASE_NAME", "test-db");
    await initMongoDb();

    // Reset mock implementations
    mockCollection.mockReturnValue({
      indexExists: mockIndexExists,
      createIndex: mockCreateIndex,
      findOne: jest.fn(),
    });
  });

  describe("auto-creation", () => {
    it("should create a collection when it does not exist and autoCreate is true", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(false), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);
      mockCreateCollection.mockResolvedValue({});

      const ds = new MongoDatastore(buildConfig({ autoCreate: true }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateCollection).toHaveBeenCalledWith("testCollection");
    });

    it("should throw an error when collection does not exist and autoCreate is false", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(false), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);

      const ds = new MongoDatastore(buildConfig({ autoCreate: false }));
      await expect(ds.connect("testCollection", async () => "result")).rejects.toThrow(
        "Collection 'testCollection' does not exist and DATASTORE_AUTO_CREATE is disabled. Create the collection manually or set DATASTORE_AUTO_CREATE=true.",
      );

      expect(mockCreateCollection).not.toHaveBeenCalled();
    });

    it("should succeed without creating collection when it already exists and autoCreate is false", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);

      const ds = new MongoDatastore(buildConfig({ autoCreate: false }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateCollection).not.toHaveBeenCalled();
    });

    it("should succeed without creating collection when it already exists and autoCreate is true", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);

      const ds = new MongoDatastore(buildConfig({ autoCreate: true }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateCollection).not.toHaveBeenCalled();
    });
  });

  describe("expiry index auto-creation", () => {
    it("should create expiry index when autoCreate is true and index does not exist", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);
      mockIndexExists.mockResolvedValue(false);
      mockCreateIndex.mockResolvedValue("expiry");

      const ds = new MongoDatastore(buildConfig({ autoCreate: true, expiryEnabled: true }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateIndex).toHaveBeenCalledWith(
        { [EXPIRY_FIELD]: 1 },
        { expireAfterSeconds: 0, name: "expiry" },
      );
    });

    it("should warn but not throw when autoCreate is false and expiry index does not exist", async () => {
      const { warn } = jest.requireMock("../../../utils/logger/logger");
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);
      mockIndexExists.mockResolvedValue(false);

      const ds = new MongoDatastore(buildConfig({ autoCreate: false, expiryEnabled: true }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateIndex).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("DATASTORE_AUTO_CREATE is disabled"),
      );
    });

    it("should not create expiry index when it already exists", async () => {
      const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
      mockListCollections.mockReturnValue(mockCursor);
      mockIndexExists.mockResolvedValue(true);

      const ds = new MongoDatastore(buildConfig({ autoCreate: true, expiryEnabled: true }));
      const result = await ds.connect("testCollection", async () => "ok");

      expect(result).toBe("ok");
      expect(mockCreateIndex).not.toHaveBeenCalled();
    });
  });
});

describe("MongoAdmin", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    overrideConfigItem("DATABASE_URI", "mongodb://localhost:27017");
    overrideConfigItem("DATABASE_NAME", "test-db");
    await initMongoDb();
  });

  it("should list all collections", async () => {
    const mockToArray = jest.fn().mockResolvedValue([{ name: "col1" }, { name: "col2" }]);
    mockListCollections.mockReturnValue({ toArray: mockToArray });

    const result = await mongoAdmin.listCollections();
    expect(result).toEqual(["col1", "col2"]);
    expect(mockListCollections).toHaveBeenCalledWith({}, { nameOnly: true });
  });

  it("should return empty array when no collections exist", async () => {
    const mockToArray = jest.fn().mockResolvedValue([]);
    mockListCollections.mockReturnValue({ toArray: mockToArray });

    const result = await mongoAdmin.listCollections();
    expect(result).toEqual([]);
  });

  it("should check collection existence — exists", async () => {
    const mockCursor = { hasNext: jest.fn().mockResolvedValue(true), close: jest.fn() };
    mockListCollections.mockReturnValue(mockCursor);

    const result = await mongoAdmin.collectionExists("myCol");
    expect(result).toBe(true);
    expect(mockListCollections).toHaveBeenCalledWith({ name: "myCol" });
  });

  it("should check collection existence — does not exist", async () => {
    const mockCursor = { hasNext: jest.fn().mockResolvedValue(false), close: jest.fn() };
    mockListCollections.mockReturnValue(mockCursor);

    const result = await mongoAdmin.collectionExists("missing");
    expect(result).toBe(false);
  });

  it("should count items in a collection", async () => {
    mockCountDocuments.mockResolvedValue(42);
    mockCollection.mockReturnValue({ countDocuments: mockCountDocuments });

    const result = await mongoAdmin.countItems("myCol");
    expect(result).toBe(42);
  });

  it("should empty a collection", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mockCollection.mockReturnValue({ deleteMany: mockDeleteMany });

    await mongoAdmin.emptyCollection("myCol");
    expect(mockDeleteMany).toHaveBeenCalledWith({});
  });
});
