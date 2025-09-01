import { ConfigSource, getConfigItem, getConfigItemAsNumber, getConfigItemAsBoolean, setConfigSources, addConfigSource } from '../source';

// Mock ConfigSource implementations for testing
class MockConfigSource implements ConfigSource {
  private values: Map<string, string>;

  constructor(values: Record<string, string> = {}) {
    this.values = new Map(Object.entries(values));
  }

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  setValue(key: string, value: string): void {
    this.values.set(key, value);
  }

  deleteValue(key: string): void {
    this.values.delete(key);
  }
}

describe('ConfigSource', () => {
  describe('ProcessEnvConfigSource', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should return environment variable value when it exists', () => {
      process.env.TEST_KEY = 'test_value';
      const source = new (require('../source').ProcessEnvConfigSource)();

      expect(source.get('TEST_KEY')).toBe('test_value');
    });

    it('should return undefined when environment variable does not exist', () => {
      delete process.env.TEST_KEY;
      const source = new (require('../source').ProcessEnvConfigSource)();

      expect(source.get('TEST_KEY')).toBeUndefined();
    });
  });
});

describe('getConfigItem', () => {
  let mockSource1: MockConfigSource;
  let mockSource2: MockConfigSource;

  beforeEach(() => {
    mockSource1 = new MockConfigSource({
      'KEY1': 'value1',
      'KEY2': 'value2'
    });
    mockSource2 = new MockConfigSource({
      'KEY2': 'different_value2',
      'KEY3': 'value3'
    });

    // Set test sources
    setConfigSources([mockSource1, mockSource2]);
  });

  it('should return value from first source when key exists', () => {
    expect(getConfigItem('KEY1')).toBe('value1');
  });

  it('should return value from first source even when key exists in multiple sources', () => {
    expect(getConfigItem('KEY2')).toBe('value2');
  });

  it('should return value from second source when key only exists there', () => {
    expect(getConfigItem('KEY3')).toBe('value3');
  });

  it('should return default value when key does not exist in any source', () => {
    expect(getConfigItem('NONEXISTENT_KEY', 'default')).toBe('default');
  });

  it('should return undefined when key does not exist and no default provided', () => {
    expect(getConfigItem('NONEXISTENT_KEY')).toBeUndefined();
  });

  it('should handle empty string values', () => {
    mockSource1.setValue('EMPTY_KEY', '');
    expect(getConfigItem('EMPTY_KEY')).toBe('');
  });
});

describe('getConfigItemAsNumber', () => {
  let mockSource: MockConfigSource;

  beforeEach(() => {
    mockSource = new MockConfigSource();
    setConfigSources([mockSource]);
  });

  it('should return parsed number when value is a valid integer', () => {
    mockSource.setValue('NUMBER_KEY', '42');
    expect(getConfigItemAsNumber('NUMBER_KEY')).toBe(42);
  });

  it('should return parsed number when value is a valid negative integer', () => {
    mockSource.setValue('NEGATIVE_KEY', '-123');
    expect(getConfigItemAsNumber('NEGATIVE_KEY')).toBe(-123);
  });

  it('should return parsed number when value is zero', () => {
    mockSource.setValue('ZERO_KEY', '0');
    expect(getConfigItemAsNumber('ZERO_KEY')).toBe(0);
  });

  it('should return default value when value is not a valid number', () => {
    mockSource.setValue('INVALID_KEY', 'not_a_number');
    expect(getConfigItemAsNumber('INVALID_KEY', 100)).toBe(100);
  });

  it('should return default value when key does not exist', () => {
    expect(getConfigItemAsNumber('NONEXISTENT_KEY', 50)).toBe(50);
  });

  it('should return undefined when key does not exist and no default provided', () => {
    expect(getConfigItemAsNumber('NONEXISTENT_KEY')).toBeUndefined();
  });

  it('should handle decimal numbers by parsing as integer', () => {
    mockSource.setValue('DECIMAL_KEY', '123.456');
    expect(getConfigItemAsNumber('DECIMAL_KEY')).toBe(123);
  });

  it('should return default for empty string', () => {
    mockSource.setValue('EMPTY_KEY', '');
    expect(getConfigItemAsNumber('EMPTY_KEY', 99)).toBe(99);
  });

  it('should handle leading/trailing whitespace in numbers', () => {
    mockSource.setValue('WHITESPACE_KEY', '  789  ');
    expect(getConfigItemAsNumber('WHITESPACE_KEY')).toBe(789);
  });
});

describe('getConfigItemAsBoolean', () => {
  let mockSource: MockConfigSource;

  beforeEach(() => {
    mockSource = new MockConfigSource();
    setConfigSources([mockSource]);
  });

  it('should return true when value is "true" (lowercase)', () => {
    mockSource.setValue('TRUE_KEY', 'true');
    expect(getConfigItemAsBoolean('TRUE_KEY')).toBe(true);
  });

  it('should return true when value is "TRUE" (uppercase)', () => {
    mockSource.setValue('TRUE_UPPER_KEY', 'TRUE');
    expect(getConfigItemAsBoolean('TRUE_UPPER_KEY')).toBe(true);
  });

  it('should return true when value is "True" (mixed case)', () => {
    mockSource.setValue('TRUE_MIXED_KEY', 'True');
    expect(getConfigItemAsBoolean('TRUE_MIXED_KEY')).toBe(true);
  });

  it('should return false when value is "false"', () => {
    mockSource.setValue('FALSE_KEY', 'false');
    expect(getConfigItemAsBoolean('FALSE_KEY')).toBe(false);
  });

  it('should return false when value is any other string', () => {
    mockSource.setValue('OTHER_KEY', 'yes');
    expect(getConfigItemAsBoolean('OTHER_KEY')).toBe(false);
  });

  it('should return false when value is empty string', () => {
    mockSource.setValue('EMPTY_KEY', '');
    expect(getConfigItemAsBoolean('EMPTY_KEY')).toBe(false);
  });

  it('should return default value when key does not exist', () => {
    expect(getConfigItemAsBoolean('NONEXISTENT_KEY', true)).toBe(true);
  });

  it('should return false by default when key does not exist and no default provided', () => {
    expect(getConfigItemAsBoolean('NONEXISTENT_KEY')).toBe(false);
  });

  it('should handle numeric strings as false', () => {
    mockSource.setValue('NUMERIC_KEY', '1');
    expect(getConfigItemAsBoolean('NUMERIC_KEY')).toBe(false);
  });
});

describe('setConfigSources', () => {
  it('should replace all existing sources with new sources', () => {
    const source1 = new MockConfigSource({ 'KEY1': 'value1' });
    const source2 = new MockConfigSource({ 'KEY2': 'value2' });

    setConfigSources([source1, source2]);

    expect(getConfigItem('KEY1')).toBe('value1');
    expect(getConfigItem('KEY2')).toBe('value2');
  });

  it('should respect source priority order', () => {
    const source1 = new MockConfigSource({ 'SHARED_KEY': 'first_value' });
    const source2 = new MockConfigSource({ 'SHARED_KEY': 'second_value' });

    setConfigSources([source1, source2]);
    expect(getConfigItem('SHARED_KEY')).toBe('first_value');

    setConfigSources([source2, source1]);
    expect(getConfigItem('SHARED_KEY')).toBe('second_value');
  });

  it('should handle empty sources array', () => {
    setConfigSources([]);
    expect(getConfigItem('ANY_KEY', 'default')).toBe('default');
  });
});

describe('addConfigSource', () => {
  beforeEach(() => {
    // Start with a clean state
    setConfigSources([]);
  });

  it('should add source to the beginning of the list (highest priority)', () => {
    const source1 = new MockConfigSource({ 'KEY': 'value1' });
    const source2 = new MockConfigSource({ 'KEY': 'value2' });

    addConfigSource(source1);
    addConfigSource(source2);

    // source2 should have higher priority since it was added last
    expect(getConfigItem('KEY')).toBe('value2');
  });

  it('should maintain existing sources when adding new ones', () => {
    const source1 = new MockConfigSource({ 'KEY1': 'value1' });
    const source2 = new MockConfigSource({ 'KEY2': 'value2' });

    addConfigSource(source1);
    addConfigSource(source2);

    expect(getConfigItem('KEY1')).toBe('value1');
    expect(getConfigItem('KEY2')).toBe('value2');
  });

  it('should add multiple sources in correct priority order', () => {
    const source1 = new MockConfigSource({ 'KEY': 'low_priority' });
    const source2 = new MockConfigSource({ 'KEY': 'medium_priority' });
    const source3 = new MockConfigSource({ 'KEY': 'high_priority' });

    addConfigSource(source1);
    addConfigSource(source2);
    addConfigSource(source3);

    expect(getConfigItem('KEY')).toBe('high_priority');
  });
});

describe('Integration tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should work with ProcessEnvConfigSource and mock sources together', () => {
    process.env.ENV_KEY = 'env_value';

    const mockSource = new MockConfigSource({ 'MOCK_KEY': 'mock_value' });
    const processEnvSource = new (require('../source').ProcessEnvConfigSource)();

    setConfigSources([mockSource, processEnvSource]);

    expect(getConfigItem('MOCK_KEY')).toBe('mock_value');
    expect(getConfigItem('ENV_KEY')).toBe('env_value');
  });

  it('should prioritize mock source over environment variables', () => {
    process.env.SHARED_KEY = 'env_value';

    const mockSource = new MockConfigSource({ 'SHARED_KEY': 'mock_value' });
    const processEnvSource = new (require('../source').ProcessEnvConfigSource)();

    setConfigSources([mockSource, processEnvSource]);

    expect(getConfigItem('SHARED_KEY')).toBe('mock_value');
  });

  it('should fall back to environment variables when mock source does not have the key', () => {
    process.env.ENV_ONLY_KEY = 'env_value';

    const mockSource = new MockConfigSource({ 'MOCK_ONLY_KEY': 'mock_value' });
    const processEnvSource = new (require('../source').ProcessEnvConfigSource)();

    setConfigSources([mockSource, processEnvSource]);

    expect(getConfigItem('ENV_ONLY_KEY')).toBe('env_value');
    expect(getConfigItem('MOCK_ONLY_KEY')).toBe('mock_value');
  });
});
