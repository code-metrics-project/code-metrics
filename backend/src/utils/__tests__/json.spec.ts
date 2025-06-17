import { jsonPathQuery } from "../json";

describe('JSON utilities', () => {
  it('should get a property from a JSON object', () => {
    const json = {
      data: {
        commits: [{ head_sha: 'acb5820ced9479c074f688cc328bf03f341a511d' }],
      },
    };

    const result = jsonPathQuery(json, '$.data.commits[0].head_sha');
    expect(result).toBe('acb5820ced9479c074f688cc328bf03f341a511d');
  });

  it('should return null for a non-existent property', () => {
    const json = {
      data: {
        commits: [{ head_sha: 'acb5820ced9479c074f688cc328bf03f341a511d' }],
      },
    };

    const result = jsonPathQuery(json, '$.data.commits[*].non_existent');
    expect(result).toBeNull();
  });

  it('should return the first result for a JSON path query', () => {
    const json = {
      data: {
        commits: [
          { head_sha: 'acb5820ced9479c074f688cc328bf03f341a511d' },
          { head_sha: 'def5820ced9479c074f688cc328bf03f341a511d' },
        ]
      },
    };

    const result = jsonPathQuery(json, '$.data.commits[*].head_sha');
    expect(result).toBe('acb5820ced9479c074f688cc328bf03f341a511d');
  });
});
