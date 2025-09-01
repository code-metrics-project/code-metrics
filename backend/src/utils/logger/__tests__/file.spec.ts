import * as fs from 'fs';
import * as path from 'path';
import { LogQueue } from '../file';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

describe('LogQueue', () => {
  let mockWriteStream: jest.Mocked<fs.WriteStream>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock WriteStream
    mockWriteStream = {
      write: jest.fn(),
      end: jest.fn(),
    } as any;

    // Mock fs functions
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('constructor', () => {
    it('should create LogQueue with valid log file path', () => {
      const logFilePath = '/var/log/test.log';
      
      new LogQueue(logFilePath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(path.dirname(logFilePath));
      expect(mockFs.createWriteStream).toHaveBeenCalledWith(logFilePath, { flags: 'a' });
      expect(consoleSpy.log).toHaveBeenCalledWith(`Log file initialised at ${logFilePath}`);
    });

    it('should create directories if they do not exist', () => {
      const logFilePath = '/var/log/new/test.log';
      mockFs.existsSync.mockReturnValue(false);
      
      new LogQueue(logFilePath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(path.dirname(logFilePath));
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(path.dirname(logFilePath), { recursive: true });
      expect(mockFs.createWriteStream).toHaveBeenCalledWith(logFilePath, { flags: 'a' });
    });

    it('should handle undefined log file path', () => {
      new LogQueue(undefined);

      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.createWriteStream).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should handle errors during file stream creation', () => {
      const logFilePath = '/var/log/test.log';
      const error = new Error('Permission denied');
      mockFs.createWriteStream.mockImplementation(() => {
        throw error;
      });

      new LogQueue(logFilePath);

      expect(consoleSpy.error).toHaveBeenCalledWith(`Failed to initialise log file: ${error}`);
    });
  });

  describe('enqueue', () => {
    it('should not enqueue if writeStream is null', () => {
      const logQueue = new LogQueue(undefined);
      
      logQueue.enqueue('test log entry');

      expect(mockWriteStream.write).not.toHaveBeenCalled();
    });

    it('should enqueue and process log entry', (done) => {
      const logQueue = new LogQueue('/var/log/test.log');
      const logEntry = 'test log entry';
      
      // Mock successful write
      mockWriteStream.write.mockImplementation((data: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(null));
        }
        return true;
      });

      logQueue.enqueue(logEntry);

      setImmediate(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(logEntry, expect.any(Function));
        done();
      });
    });

    it('should handle write stream errors', (done) => {
      const logQueue = new LogQueue('/var/log/test.log');
      const logEntry = 'test log entry';
      const writeError = new Error('Write failed');
      
      // Mock write failure
      mockWriteStream.write.mockImplementation((data: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(writeError));
        }
        return false;
      });

      logQueue.enqueue(logEntry);

      setImmediate(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(logEntry, expect.any(Function));
        expect(consoleSpy.error).toHaveBeenCalledWith(`Failed to write to log file: ${writeError}`);
        done();
      });
    });

    it('should process multiple log entries in order', (done) => {
      const logQueue = new LogQueue('/var/log/test.log');
      const entries = ['entry1', 'entry2', 'entry3'];
      let writeCallCount = 0;
      
      // Mock successful writes
      mockWriteStream.write.mockImplementation((data: any, callback?: any) => {
        writeCallCount++;
        if (callback) {
          setImmediate(() => callback(null));
        }
        return true;
      });

      entries.forEach(entry => logQueue.enqueue(entry));

      setTimeout(() => {
        expect(writeCallCount).toBe(3);
        expect(mockWriteStream.write).toHaveBeenNthCalledWith(1, 'entry1', expect.any(Function));
        expect(mockWriteStream.write).toHaveBeenNthCalledWith(2, 'entry2', expect.any(Function));
        expect(mockWriteStream.write).toHaveBeenNthCalledWith(3, 'entry3', expect.any(Function));
        done();
      }, 50);
    });
  });

  describe('close', () => {
    it('should close the write stream', () => {
      const logQueue = new LogQueue('/var/log/test.log');
      
      logQueue.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('should handle close when writeStream is null', () => {
      const logQueue = new LogQueue(undefined);
      
      expect(() => logQueue.close()).not.toThrow();
      expect(mockWriteStream.end).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle processQueue errors gracefully', (done) => {
      const logQueue = new LogQueue('/var/log/test.log');
      const logEntry = 'test log entry';
      
      // Mock write stream to be null during processing
      mockWriteStream.write.mockImplementation((data: any, callback?: any) => {
        // Simulate writeStream being set to null
        (logQueue as any).writeStream = null;
        if (callback) {
          setImmediate(() => callback(new Error('Stream is null')));
        }
        return false;
      });

      logQueue.enqueue(logEntry);

      setImmediate(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('Error processing log queue:')
        );
        done();
      });
    });
  });
});
