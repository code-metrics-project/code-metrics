# Dependency Alerts API

This feature provides an API endpoint for fetching and analyzing dependency vulnerability alerts from GitHub repositories (Dependabot alerts).

## API Endpoint

### GET `/api/dependency-alerts`

Fetches dependency vulnerability alerts for a specified GitHub repository and provides SLA compliance analysis.

#### Query Parameters

- `workloadId` (required): The workload identifier configured in the system
- `repo` (required): GitHub repository name

#### Example Request

```bash
GET /api/dependency-alerts?workloadId=myworkload&repo=example
```

#### Response Format

```json
{
  "total": 10,
  "byState": {
    "open": 5,
    "dismissed": 2,
    "fixed": 3
  },
  "bySeverity": {
    "critical": 2,
    "high": 3,
    "medium": 4,
    "low": 1
  },
  "slaViolations": [
    {
      "number": 123,
      "state": "open",
      "severity": "critical",
      "package": "lodash",
      "age": 10,
      "slaLimit": 7,
      "daysOverdue": 3,
      "title": "Prototype Pollution in lodash",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-05T00:00:00Z",
      "htmlUrl": "https://github.com/owner/repo/security/dependabot/123"
    }
  ],
  "compliant": [],
  "summary": {
    "totalViolations": 5,
    "complianceRate": "50.0",
    "openViolations": 5
  }
}
```

## SLA Configuration

Default SLA periods by severity:
- **Critical**: 7 days
- **High**: 14 days
- **Medium**: 30 days
- **Low**: 90 days

## Implementation Details

### Files Structure

- **Model**: `/backend/src/model/dependencyAlerts.ts` - Type definitions
- **Service**: `/backend/src/services/dependencyAlerts/dependencyAlerts.ts` - Business logic
- **Route**: `/backend/src/routes/dependencyAlerts.ts` - HTTP endpoint handler
- **Tests**: `/backend/src/services/dependencyAlerts/__tests__/dependencyAlerts.spec.ts`

### Key Features

1. **GitHub Integration**: Uses existing Octokit connection management from the code-metrics platform
2. **SLA Tracking**: Automatically calculates alert age and compares against defined SLAs
3. **Compliance Metrics**: Provides summary statistics including compliance rate and violation counts
4. **Error Handling**: Gracefully handles missing repositories or access issues

### Authentication

The endpoint requires authentication and uses the GitHub API token configured for the specified workload.

## Usage Example

```typescript
// Frontend API call
const response = await fetch(
  '/api/dependency-alerts?workloadId=myapp&owner=myorg&repo=myrepo'
);
const data = await response.json();

console.log(`Total alerts: ${data.total}`);
console.log(`Open violations: ${data.summary.openViolations}`);
console.log(`Compliance rate: ${data.summary.complianceRate}%`);
```

## Future Enhancements

- Support for multiple repositories in a single request
- Configurable SLA thresholds per workload
- Historical tracking of alert trends
- Integration with notification systems for SLA breaches
