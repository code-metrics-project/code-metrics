import { DependencyAlertsService } from "../dependencyAlerts";

describe("DependencyAlertsService", () => {
  describe("analyzeAlerts", () => {
    it("should return empty analysis when no alerts exist", () => {
      const service = new DependencyAlertsService();
      const result = (service as any).analyzeAlerts("test-workload", "test-repo", []);
      
      expect(result.total).toBe(0);
      expect(result.summary.complianceRate).toBe("100");
    });

    it("should calculate alert age correctly", () => {
      const service = new DependencyAlertsService();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const age = (service as any).calculateAlertAge(oneDayAgo);
      expect(age).toBeGreaterThanOrEqual(1);
      expect(age).toBeLessThanOrEqual(2);
    });

    it("should identify SLA violations for critical alerts", () => {
      const service = new DependencyAlertsService();
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      
      const mockAlert = {
        number: 1,
        state: "open",
        created_at: eightDaysAgo,
        updated_at: eightDaysAgo,
        html_url: "https://github.com/test/repo/security/dependabot/1",
        security_advisory: {
          severity: "critical",
          summary: "Test vulnerability"
        },
        dependency: {
          package: {
            name: "test-package"
          }
        }
      };

      const result = (service as any).analyzeAlerts("test-workload", "test-repo", [mockAlert]);
      
      expect(result.total).toBe(1);
      expect(result.summary.openViolations).toBe(1);
      expect(result.slaViolations.length).toBe(1);
      expect(result.slaViolations[0].daysOverdue).toBe(1);
    });

    it("should mark alerts as compliant if within SLA", () => {
      const service = new DependencyAlertsService();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const mockAlert = {
        number: 1,
        state: "open",
        created_at: threeDaysAgo,
        updated_at: threeDaysAgo,
        html_url: "https://github.com/test/repo/security/dependabot/1",
        security_advisory: {
          severity: "critical",
          summary: "Test vulnerability"
        },
        dependency: {
          package: {
            name: "test-package"
          }
        }
      };

      const result = (service as any).analyzeAlerts("test-workload", "test-repo", [mockAlert]);
      
      expect(result.total).toBe(1);
      expect(result.summary.openViolations).toBe(0);
      expect(result.compliant.length).toBe(1);
    });
  });
});
