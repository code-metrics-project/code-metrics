import { ConfigHolder, JiraTicketOptions, PipelinesTypes, TicketManagementTypes } from "../model/config/common";
import { logger } from "../utils/logger/logger";
import {
  DeprecatedWorkloadProjectManagementConfigAzure,
  V1WorkloadProjectManagementConfigJira,
  JiraIssueOptions,
  V1RemoteConfigWrapper,
  V1Workload,
  V1WorkloadConfigWrapper,
} from "../model/config/v1/v1model";
import { RemoteConfigWrapper, TicketManagementServer } from "../model/config/remote-config";
import {
  JobNameMapping,
  SoftwareComponent,
  Workload,
  WorkloadConfigWrapper,
  WorkloadTicketConfigAzure,
  WorkloadTicketConfigJira,
} from "../model/config/workload-config";
import { determineConfigVersion } from "./config";
import { ConfigVersion } from "../model/config/base";
import { cloneDeep } from "lodash";
import { LEGACY_FIRST_STAGE_ID } from "../services/deployment/common";

/**
 * Polyfill legacy configuration data for backwards compatibility.
 * @param loadedConfig
 */
export const polyfillLegacyConfig = (loadedConfig: ConfigHolder): ConfigHolder => {
  const config = loadedConfig;

  polyfillRemoteConfigs(config.remoteConfigs);

  const workloadConfigVersion = determineConfigVersion(config.workloadConfigs);
  if (workloadConfigVersion === ConfigVersion.V1_0) {
    const v1WorkloadConfig = config.workloadConfigs as V1WorkloadConfigWrapper;
    polyfillRepoMappings(workloadConfigVersion, v1WorkloadConfig);

    for (const workload of v1WorkloadConfig.workloads) {
      polyfillWorkloadConfig(workloadConfigVersion, workload);
    }
  }

  return config;
};

const polyfillRemoteConfigs = (rawRemoteConfig: V1RemoteConfigWrapper | RemoteConfigWrapper) => {
  if (determineConfigVersion(rawRemoteConfig) !== ConfigVersion.V1_0) {
    return;
  }
  const v1RemoteConfig = rawRemoteConfig as V1RemoteConfigWrapper;
  const v2RemoteConfig = rawRemoteConfig as RemoteConfigWrapper;

  const v1ProjectManagement = v1RemoteConfig.projectManagement;
  v2RemoteConfig.ticketManagement = {};

  for (const ticketMgmtType of Object.values(TicketManagementTypes)) {
    const legacyDefaults = v1ProjectManagement[ticketMgmtType]?.defaults;
    if (legacyDefaults && ticketMgmtType === TicketManagementTypes.JIRA) {
      const legacyJiraDefaults = legacyDefaults as JiraIssueOptions;
      const jiraServers: TicketManagementServer[] = [];

      for (const server of v1ProjectManagement[ticketMgmtType].servers) {
        jiraServers.push({
          ...server,
          defaults: <JiraTicketOptions>{
            projectName: legacyJiraDefaults.project,
            ticketTypes: legacyJiraDefaults.bugs?.issueTypes ?? legacyJiraDefaults.bugTypes,
            ticketPriorities: legacyJiraDefaults.ticketPriorities,
            teamFilterQuery: legacyJiraDefaults.bugs?.teamFilterJql ?? legacyJiraDefaults.teamFilterJql,
          },
        });

        if (legacyJiraDefaults.incidents) {
          jiraServers.push({
            ...server,
            id: server.id + "-incidents",
            defaults: <JiraTicketOptions>{
              projectName: legacyJiraDefaults.incidents.project,
              ticketTypes: legacyJiraDefaults.incidents.issueTypes,
              ticketPriorities: legacyJiraDefaults.ticketPriorities,
              teamFilterQuery: legacyJiraDefaults.incidents.teamFilterJql ?? legacyJiraDefaults.incidents.prodFilterJql,
            },
          });
        }
      }

      v2RemoteConfig.ticketManagement[ticketMgmtType] = {
        servers: jiraServers,
      };
      logger(`Polyfilled remote ticket management for ${ticketMgmtType}`);
    }
  }

  // backwards compatibility shim to avoid a breaking change
  // to the semantics of the config data model when
  // no pipeline config is set
  if (!v1RemoteConfig.pipelines) {
    v2RemoteConfig.pipelines = {
      azure: v1RemoteConfig.codeManagement.azure,
      github: v1RemoteConfig.codeManagement.github,
    };
    logger(`Polyfilled remote pipeline config`);
  }
};

const polyfillWorkloadConfig = (configVersion: ConfigVersion, workload: V1Workload) => {
  polyfillTicketMgmt(configVersion, workload);
  polyfillPipelines(configVersion, workload);
  polyfillRepoGroups(configVersion, workload);
};

const polyfillTicketMgmt = (configVersion: ConfigVersion, rawWorkload: V1Workload | Workload) => {
  if (configVersion !== ConfigVersion.V1_0) {
    return;
  }
  const v1Workload = rawWorkload as V1Workload;
  const v2Workload = rawWorkload as Workload;

  if (v1Workload.projectManagement.type === TicketManagementTypes.JIRA) {
    const v1ProjMgmt = getV1JiraProjMgmtConfig(v1Workload);

    const v2ProjMgmt: WorkloadTicketConfigJira = {
      projectName: v1ProjMgmt.bugs.project,
      teamFilterQuery: v1ProjMgmt.bugs.teamFilterJql,
      type: v1ProjMgmt.type,
      serverId: v1ProjMgmt.serverId,
      ticketPriorities: v1ProjMgmt.ticketPriorities,
      ticketTypes: v1ProjMgmt.bugs.issueTypes,
    };
    v2Workload.projectManagement = v2ProjMgmt;
    logger(`Polyfilled workload ${v1Workload.id} jira project management config`);

    const v2IncidentMgmt: WorkloadTicketConfigJira = {
      projectName: v1ProjMgmt.incidents.project,
      teamFilterQuery: v1ProjMgmt.incidents.teamFilterJql,
      type: v1ProjMgmt.type,
      serverId: v1ProjMgmt.serverId + "-incidents",
      ticketPriorities: v1ProjMgmt.ticketPriorities,
      ticketTypes: v1ProjMgmt.incidents.issueTypes,
    };
    v2Workload.incidents = v2IncidentMgmt;
    logger(`Polyfilled workload ${v1Workload.id} incident management config`);
  } else if (v1Workload.projectManagement.type === TicketManagementTypes.AZURE) {
    const v1ProjMgmt = v1Workload.projectManagement as unknown as DeprecatedWorkloadProjectManagementConfigAzure;

    const v2ProjMgmt: WorkloadTicketConfigAzure = {
      projectName: v1ProjMgmt.project ?? v1ProjMgmt.projectName,
      type: v1ProjMgmt.type,
      serverId: v1ProjMgmt.serverId,
      team: v1ProjMgmt.team,
      ticketPriorities: v1ProjMgmt.ticketPriorities,
      ticketTypes: v1ProjMgmt.bugs?.issueTypes,
    };
    v2Workload.projectManagement = v2ProjMgmt;
    logger(`Polyfilled workload ${v1Workload.id} azure project management config`);
  }

  if (v1Workload.projectManagement?.type !== TicketManagementTypes.JIRA) {
    v2Workload.incidents = cloneDeep(v1Workload.projectManagement);
    logger(`Polyfilled workload ${v1Workload.id} incident management config`);
  }
};

const getV1JiraProjMgmtConfig = (workload: V1Workload): V1WorkloadProjectManagementConfigJira => {
  const deprecatedProjMgmt = workload.projectManagement as unknown as V1WorkloadProjectManagementConfigJira;
  if (!deprecatedProjMgmt.bugs) {
    deprecatedProjMgmt.bugs = {};
  }
  if (!deprecatedProjMgmt.bugs.project) {
    deprecatedProjMgmt.bugs.project = deprecatedProjMgmt.project;
  }
  if (!deprecatedProjMgmt.bugs.issueTypes) {
    deprecatedProjMgmt.bugs.issueTypes = deprecatedProjMgmt.bugTypes;
  }
  if (!deprecatedProjMgmt.bugs.teamFilterJql) {
    deprecatedProjMgmt.bugs.teamFilterJql = deprecatedProjMgmt.teamFilterJql;
  }
  if (!deprecatedProjMgmt.bugs.prodFilterJql) {
    deprecatedProjMgmt.bugs.prodFilterJql = deprecatedProjMgmt.prodFilterJql;
  }
  if (!deprecatedProjMgmt.incidents) {
    deprecatedProjMgmt.incidents = {};
  }
  if (!deprecatedProjMgmt.incidents.project) {
    deprecatedProjMgmt.incidents.project = deprecatedProjMgmt.project;
  }
  return deprecatedProjMgmt;
};

const polyfillPipelines = (configVersion: ConfigVersion, rawWorkload: V1Workload | Workload) => {
  if (configVersion !== ConfigVersion.V1_0) {
    return;
  }
  const v1Workload = rawWorkload as V1Workload;
  const v2Workload = rawWorkload as Workload;

  // backwards compatibility shim to avoid a breaking change
  // to the semantics of the config data model when
  // no pipeline config is set
  if (!v1Workload.pipelines && v1Workload.codeManagement) {
    v2Workload.pipelines = {
      jobNameMapping: JobNameMapping.RepoName,
      projectName: v1Workload.codeManagement.projectName,
      serverId: v1Workload.codeManagement.serverId,
      type: v1Workload.codeManagement.type as unknown as PipelinesTypes,
      stages: [],
    };
    logger(`Polyfilled workload ${v1Workload.id} pipeline config`);
  }

  if (!v2Workload.pipelines.stages) {
    v2Workload.pipelines.stages = [];
  }

  // shim v1 first pipeline stage to v2 stage
  if (v2Workload.pipelines.type) {
    v2Workload.pipelines.stages.push({
      stageId: LEGACY_FIRST_STAGE_ID,
    });
    logger(`Polyfilled workload ${v1Workload.id} pipeline first stage`);
  }

  // shim v1 deployment config to v2 stage
  if (v1Workload.deployment) {
    v2Workload.pipelines.stages.push({
      stageId: v1Workload.deployment.deploymentId,
      jobMapping: v1Workload.deployment.jobMapping,
    });
    logger(`Polyfilled workload ${v1Workload.id} pipeline deployment stage`);
  }
};

const polyfillRepoGroups = (configVersion: ConfigVersion, rawWorkload: V1Workload | Workload) => {
  if (configVersion !== ConfigVersion.V1_0) {
    return;
  }
  const v1Workload = rawWorkload as V1Workload;
  const v2Workload = rawWorkload as Workload;

  // backwards compatibility shim for repo groups to convert
  // 'repoNames' string arrays to SoftwareComponent elements
  if (v1Workload.codeManagement?.repoGroups) {
    for (const [rgName, rgConfig] of Object.entries(v1Workload.codeManagement.repoGroups)) {
      // noinspection JSDeprecatedSymbols
      if (rgConfig.repoNames) {
        rgConfig.components = rgConfig.components ?? [];
        // noinspection JSDeprecatedSymbols
        rgConfig.components.push(
          ...rgConfig.repoNames.map(
            (repoName) =>
              <SoftwareComponent>{
                repo: repoName,
              },
          ),
        );

        v2Workload.codeManagement.repoGroups[rgName] = rgConfig;
        logger(`Polyfilled workload ${v1Workload.id} repo group config for ${rgName}`);
      }
    }
  }
};

const polyfillRepoMappings = (
  configVersion: ConfigVersion,
  rawWorkloadConfg: V1WorkloadConfigWrapper | WorkloadConfigWrapper,
) => {
  if (configVersion !== ConfigVersion.V1_0) {
    return;
  }
  const v1WorkloadConfig = rawWorkloadConfg as V1WorkloadConfigWrapper;
  const v2WorkloadConfig = rawWorkloadConfg as WorkloadConfigWrapper;

  if (v1WorkloadConfig.repoMappings?.length) {
    for (const repoMapping of v1WorkloadConfig.repoMappings) {
      for (const workload of v1WorkloadConfig.workloads) {
        const v2workload = v2WorkloadConfig.workloads.find((w) => w.id === workload.id);
        v2workload.codeAnalysis.mappings = v2workload.codeAnalysis.mappings ?? [];
        v2workload.codeAnalysis.mappings.push({
          key: repoMapping.sonarProjectKey,
          vcsRepoName: repoMapping.vcsRepoName,
        });
      }
    }

    logger(`Polyfilled workload config repo mappings`);
  }
};
