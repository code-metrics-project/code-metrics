# Feature support

This table shows feature support for third party tools.

## [Source Code Management](./config_code_management.md) (SCM)

| Tool                                                                        | Support                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Azure DevOps](https://azure.microsoft.com/en-gb/products/devops/repos)     | ✅ Supported                                                               |
| [Bitbucket (Cloud)](https://bitbucket.org/product)                          | 🟡 [Beta](https://github.com/DeloitteDigitalUK/code-metrics/issues/291)    |
| [Bitbucket Server](https://www.atlassian.com/software/bitbucket/enterprise) | ✅ Supported                                                               |
| [GitHub](https://github.com/)                                               | ✅ Supported                                                               |
| [Gitlab](https://about.gitlab.com/)                                         | 🗓️ [Planned](https://github.com/DeloitteDigitalUK/code-metrics/issues/325) |

## [Quality Gates](./quality_gates_admin.md)

| Tool                                                                        | Support              |
| --------------------------------------------------------------------------- | -------------------- |
| [Azure DevOps](https://azure.microsoft.com/en-gb/products/devops/repos)     | ❌ Not yet supported |
| [Bitbucket (Cloud)](https://bitbucket.org/product)                          | ❌ Not yet supported |
| [Bitbucket Server](https://www.atlassian.com/software/bitbucket/enterprise) | ❌ Not yet supported |
| [GitHub](https://github.com/)                                               | ✅ Supported         |
| [Gitlab](https://about.gitlab.com/)                                         | ❌ Not yet supported |

## [CI/CD Pipelines](./config_pipelines.md)

| Tool                                                                        | Support                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [AWS CodePipeline](https://aws.amazon.com/codepipeline/)                    | 🟡 [Beta](https://github.com/DeloitteDigitalUK/code-metrics/issues/541) |
| [Azure DevOps](https://azure.microsoft.com/en-gb/products/devops/repos)     | ✅ Supported                                                            |
| [Bitbucket (Cloud)](https://bitbucket.org/product)                          | ❌ Not yet supported                                                    |
| [Bitbucket Server](https://www.atlassian.com/software/bitbucket/enterprise) | ❌ Not yet supported                                                    |
| [Dynatrace](https://www.dynatrace.com/) deployment events                   | ✅ Supported                                                            |
| [GitHub](https://github.com/)                                               | ✅ Supported                                                            |
| [Gitlab](https://about.gitlab.com/)                                         | ❌ Not yet supported                                                    |
| [Jenkins](https://www.jenkins.io)                                           | ✅ Supported                                                            |

## [Code Analysis](./config_code_quality.md)

| Tool                                                           | Support      |
| -------------------------------------------------------------- | ------------ |
| [SonarCloud](https://www.sonarsource.com/products/sonarcloud/) | ✅ Supported |
| [SonarQube](https://www.sonarsource.com/products/sonarqube/)   | ✅ Supported |

## [Application Lifecycle Management](./config_project_management.md) (ALM)

| Tool                                                                        | Support                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Azure DevOps](https://azure.microsoft.com/en-gb/products/devops/repos)     | ✅ Supported                                                            |
| [Bitbucket (Cloud)](https://bitbucket.org/product)                          | ❌ Not yet supported                                                    |
| [Bitbucket Server](https://www.atlassian.com/software/bitbucket/enterprise) | ❌ Not yet supported                                                    |
| [GitHub](https://github.com/)                                               | 🟡 [Beta](https://github.com/DeloitteDigitalUK/code-metrics/issues/166) |
| [Gitlab](https://about.gitlab.com/)                                         | ❌ Not yet supported                                                    |
| [Jira](https://www.atlassian.com/software/jira)                             | ✅ Supported                                                            |
| [ServiceNow](https://www.servicenow.com/)                                   | ✅ Supported for incidents                                              |

## AI Agents

AI agents generate executive summaries of repository changes, providing high-level insights into development activity.

| Provider                                                        | Support      |
| --------------------------------------------------------------- | ------------ |
| [Anthropic Claude](https://www.anthropic.com/)                  | ✅ Supported |
| [Google Gemini](https://ai.google.dev/)                         | ✅ Supported |

Configure AI agents in [remote-config.yaml](./configuration.md) under the `llm` section. See [examples/remote-config.yaml](../backend/config/examples/remote-config.yaml) for configuration details.

➡️ [Learn more about AI Summaries](./ai_summaries.md)
