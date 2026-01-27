# Architecture

## High level architecture

The tool integrates metrics from your application lifecycle management (ALM) tooling (e.g. Jira), code quality tooling (SonarQube) and version control system (VCS) for application code (e.g. GitHub).

![High level architecture](./img/architecture.png)

## System context

CodeMetrics queries external systems and presents an analysis of the data across multiple repositories.

```mermaid
    C4Context
    title System Context diagram for CodeMetrics

    Boundary(b4, "Code quality tool", "SonarQube/SonarCloud") {
        System_Ext(QualityMetrics, "Code quality metrics", "Metadata on code coverage, complexity, codebase size.")
    }

    Boundary(b2, "Code management tool", "GitHub/Bitbucket/Azure") {
        SystemDb_Ext(RepoMetrics, "Repository metrics", "List of file change types (e.g. lines added/removed).")
        SystemDb_Ext(BuildMetrics, "Build job metrics", "Outcomes (e.g. success/fail) and duration of jobs.")
    }

    Boundary(b3, "Project management tool", "Jira/Azure") {
        SystemDb_Ext(Bugs, "Bug tickets")
        SystemDb_Ext(Incidents, "Incident tickets")
    }

    Enterprise_Boundary(b0, "Your organisation") {
        Person(engineer, "Engineering Lead", "An engineering leader in your organisation.")

        Boundary(b1, "Cloud Account", "") {
            System(CodeMetricsTool, "CodeMetrics Tool", "Aggregates and analyses software metrics.")
            SystemDb(CodeMetricsCache, "CodeMetrics cache", "Caches data to avoid hitting external rate limits")
        }
    }

    Rel(engineer, CodeMetricsTool, "Uses")
    Rel(CodeMetricsTool, CodeMetricsCache, "Uses")
    Rel(CodeMetricsTool, QualityMetrics, "Queries")
    Rel(CodeMetricsTool, RepoMetrics, "Queries")
    Rel(CodeMetricsTool, BuildMetrics, "Queries")
    Rel(CodeMetricsTool, Bugs, "Queries")
    Rel(CodeMetricsTool, Incidents, "Queries")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="3")
```

## Deployment diagram

An example deployment using AWS Lambda (backend), CloudFront/S3 (frontend) and DynamoDB (cache).

> **Note**
> There are [other ways to run](./getting_started.md) CodeMetrics, such as Kubernetes, Docker or plain Node.js.

```mermaid
    C4Deployment
    title Deployment Diagram for CodeMetrics

    Deployment_Node(browser, "Web Browser", "") {
        Container(spa, "Single Page Application", "HTML, CSS, JavaScript", "Front-end user interface to the tool.")
    }

    Deployment_Node(aws, "AWS account", "Cloud") {
        Deployment_Node(wafn, "Web application firewall", "AWS WAF") {
            Container(waf, "WAF", "", "Protects the web application.")
        }
        Deployment_Node(cloudfront, "Web CDN", "AWS CloudFront") {
            Container(cfdistro, "Web distribution", "CloudFront distribution", "Delivers the static content and the CodeMetrics single page application.")
        }
        Deployment_Node(s3, "Web assets", "AWS S3") {
            ContainerDb(web, "Web application", "HTML, CSS, TypeScript", "Web assets for the CodeMetrics single page application.")
        }

        Deployment_Node(cache, "Cache", "AWS DynamoDB") {
            Deployment_Node(tables, "Tables", "DynamoDB"){
                ContainerDb(db, "Metrics cache", "DynamoDB table", "Caches metrics.")
            }
        }
        Deployment_Node(lambda, "API backend", "AWS Lambda") {
            Deployment_Node(func, "Lambda function", "Node.js") {
                Container(api, "API application", "TypeScript and Express", "Provides CodeMetrics functionality via a JSON/HTTPS API.")
            }
        }
    }

    Rel(cfdistro, waf, "Delivers assets", "HTTPS")
    Rel(waf, spa, "[HTTPS]")
    Rel(cfdistro, web, "Fetches origin assets", "HTTPS")
    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")
    Rel(api, db, "Reads from and writes to", "DynamoDB API")

    UpdateRelStyle(cfdistro, waf, $offsetX="-60", $offsetY="20")
    UpdateRelStyle(waf, spa, $offsetX="-40", $offsetY="20")
    UpdateRelStyle(cfdistro, web, $offsetX="-70", $offsetY="-20")
    UpdateRelStyle(spa, api, $offsetX="-180")
    UpdateRelStyle(api, db, $offsetX="20", $offsetY="-40")
```

## Technology overview

The key application technologies are Node.js/Express for the API server and Vue.js for the UI. TypeScript is the primary language. Some of the analyses use a backing store (MongoDB or DynamoDB are a common choices).

The tool interacts with ALM tooling (ADO/Jira), Code quality tools (Sonar) and source control platforms (ADO/Bitbucket/GitHub) typically using their respective HTTPS API. These sources provide the raw data for display or subsequent combined analysis.

Packaging is available via:

1. Docker containers (`node:lts` for the API server and `nginx` for static hosting of the UI). Deployment is to anywhere Docker runs, or Node.js if desired.
2. AWS Lambda function deployment package (ZIP file).

## Configuration

See the [configuration guide](./configuration.md) for more details.
