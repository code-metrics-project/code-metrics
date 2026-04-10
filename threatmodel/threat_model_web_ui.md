# CodeMetrics Threat Model - Web UI

Mitigations are available within: [Threat Model Mitigations](./threat_model_mitigations.md)

<table border="1">
	<thead>
		<tr>
			<th>Threat</th>
			<th>Ref</th>
			<th>Threat Technique</th>
			<th>Notes on Existing Mitigations/Gaps</th>
			<th>Mitigation References</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td rowspan=4>Spoofing</td>
			<td>1A.1</td>
			<td>Threat actor conducts phishing on an end user to obtain username/password combinations and sequently gains access to CodeMetrics.</td>
			<td>1 Hour JWT expiries are in place, therefore a user would have to have a valid JWT and this attack would have to take place within that hour timeframe to succeed.</td>
			<td>M3.13</td>
		</tr>
		<tr>
			<td>1A.2</td>
			<td>Threat actor leverages cross site request forgery to gain a valid session as another user. </td>
			<td>CSRF tokens do not appear to be in place. If required, they could be implemented through the shared HTTP client as a default header. However, notable that CodeMetrics uses JWTs as a bearer-authorisation header, therefore an attacker couldn't set this header without knowledge of the token, therefore CSRF attacks are well mitigated.</td>
			<td>M1.2, M3.4, M3.13</td>
		</tr>
		<tr>
			<td>1A.3</td>
			<td>Threat actor creates a fake instance of CodeMetrics with similar internal domain, i.e typosquatting and successfully convinces users to enter login details.</td>
			<td>Somewhat dependent on the environment CodeMetrics would be deployed within - much less likely in internal environments.</td>
			<td>M3.13</td>
		</tr>
		<tr>
			<td>1A.4</td>
			<td>Threat actor performs bruteforce attack to gain access to a users account.</td>
			<td>No rate limits appear to be in place. Should be noted in documentation if CodeMetrics needs to be 'fronted' by a reverse proxy to apply SSL and enforce rate limiting, or implemented within CodeMetrics if this isn't going to be the case.</td>
			<td>M1.1, M1.2, M3.13</td>
		</tr>
		<tr>
			<td rowspan=7>Tampering</td>
			<td>1B.1</td>
			<td>A threat actor attempts to bypass authentication by fuzzing JWT contents, e.g exceptionally long usernames, passwords, supplying multiple occurences of the same parameter. </td>
			<td>Verification logic performed by the jsonwebtoken package - https://npmjs.com/package/jsonwebtoken, specifically the verify function and the decode function, which employs type checking inside of try/catch and JSON parsing. Supplying the same parameter twice varies from application to application so this may be worth testing.</td>
			<td>M1.1, M1.2, M1.4, M1.5, M3.8</td>
		</tr>
		<tr>
			<td>1B.2</td>
			<td>Threat actor embeds malicious scripts within the username/password fields, which are sequently executed to tamper with the web UI.</td>
			<td>Upon entering credentials into Login.vue, credentials are eventually passed to ./services/auth.ts which uses the login function to POST these values to AUTH (/api/authenticate). Login function expects strings for username and password, however it appears that anything typed as a username/password is cast to a string within Login.vue. There doesn't appear to be further validation/escaping prior to this point, meaning the backend API may be able to receive extremely large username/passwords or malicious code. Anything sent would be interpreted as a string.</td>
			<td>M1.1, M1.2, M3.8</td>
		</tr>
		<tr>
			<td>1B.3</td>
			<td>Malicious insider modifies the list of acceptable URLs for authentication and redirects authentication attempts destinted for /api/authenticate to an attacker controlled domain/ip. </td>
			<td>Would require either successfully getting a PR merged with this (very unlikely) that is then deployed without checking the configs, or an insider modifying a config file (comparatively more likely). Access to config files should be limited when deployed and ideally watched for changes, or made read only.</td>
			<td>M1.8</td>
		</tr>
		<tr>
			<td>1B.4</td>
			<td>Malicious insider modifies username password combinations that the web UI relies upon to gain a signed JWT that is accepted.</td>
			<td>Similar to 1B.3, this would require either a successful PR merge followed by a deployment without checking configs, or an insider modifying user credentials. Access to these files should be limited when deployed and ideally watched for changes, or made read only.</td>
			<td>M3.8</td>
		</tr>
		<tr>
			<td>1B.5</td>
			<td>Malicious insider modifies acceptable authenticators that the web UI relies upon to attacker controlled authenticators to gain a signed JWT that is accepted.</td>
			<td>Similar to 1B.3, this would require either a successful PR merge followed by a deployment without checking configs, or an insider modifying config files. Access to these files should be limited when deployed and ideally watched for changes, or made read only.</td>
			<td>M1.8, M3.8</td>
		</tr>
		<tr>
			<td>1B.6</td>
			<td>Threat actor writes malicious input which is not escaped/validated/parsed out by the Web UI before being passed to CodeMetrics API, leading to the ability to tamper with Metrics Store data.</td>
			<td>The backend API section of this will be discussed in the Backend API table, however from a Web UI point of view efforts should be made to sanitize data ahead of time. Data shouldn't be trusted at any point (sanitisation/checking should take place at both the Web UI and backend API), so potentially escaping data passed onwards and setting a max size would be useful.</td>
			<td>M1.1, M1.3, M1.4, M1.5, M3.8</td>
		</tr>
		<tr>
			<td>1B.7</td>
			<td>Threat actor leverages 1B.6 equivilent to write data back to a Data Source Platform, contaminating a source dataset, resulting in impact to CodeMetrics and the original data source platform.</td>
			<td>The capability to 'write back' into a data source platform e.g Jira doesn't currently exist within CodeMetrics; a threat actor would have to either obtain the token/credentials used to communicate with a given data source platform through some form of tampering and lack of input sanitization, then would have to use this. Alternatively an attacker could write malicious scripts to store the requisite write back capability onto the backend api and achieve a file upload through some form of XSS, then would have to get the backend API to invoke this, which is very unlikely. </td>
			<td>M1.1, M1.2, M1.5, M3.8, M4.2, M5.2</td>
		</tr>
		<tr>
			<td rowspan=3>Repudiation</td>
			<td>1C.1</td>
			<td>Threat actor is able to impersonate a user, for example by achieving 1A.x spoofing attacks without a method to log login attempts or active sessions.</td>
			<td>Logging capabilities do exist for CodeMetrics but it does not appear that these are logged.</td>
			<td>M1.1</td>
		</tr>
		<tr>
			<td>1C.2</td>
			<td>Threat actor performs unauthorised queries without a method to log what queries are being queried.</td>
			<td>Web UI itself does not appear to have this logging capability as the query is performed by the backend API, which performs some logging. Potentially useful to expand logging in this area.</td>
			<td>M1.2, M1.3, M2.1, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>1C.3</td>
			<td>Threat actor adds a new connection to a data source without a method to historically view/log additions.</td>
			<td>Web UI itself does not appear to have this logging capability as this action is performed on the backend API, which can be configured to log this. Potentially useful to expand logging to clearly define the user that invoked this.</td>
			<td>M1.2, M1.8</td>
		</tr>
		<tr>
			<td rowspan=5>Information Disclosure</td>
			<td>1D.1</td>
			<td>Threat actor attempts to perform reconniassance to enumerate available endpoints on the Web UI to facilitate activities to identify functionality they wish to target. </td>
			<td>Web UI uses middleware in routing to check if a user is not authenticated and is not on the login page and if so, redirect them to login page. This makes sense however someone could, for example, visit /idonotexist, which may return a 404. If /idonotexist returns a 404 but /Dashboards returns the login page, a threat actor can infer that the page exists.</td>
			<td>M1.2, M3.3</td>
		</tr>
		<tr>
			<td>1D.2</td>
			<td>Threat actor attempts to insert malicious inputs into statements transmitted onwards to CodeMetrics API similar to 1B.6, however attempts to use this to return information they should not have access to.</td>
			<td>CodeMetrics has limited access control; user authentication exists however no permission segmentation exists within authenticated users. If a user is authorised and has a JWT, any timespan, ticket type, etc available to the account of the upstream data source is available to the authorised user of CodeMetrics. If this is intended design, highlighting this in documentation would be useful to prevent users indirectly receiving sensitive data via metrics that they would not normally have access to. In the case of users without authorisation the Web UI routing middleware will detect the lack of a JWT and redirect the user to login.</td>
			<td>M1.1, M1.2, M1.3, M1.4, M1.5, M2.1, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>1D.3</td>
			<td>Threat actor attempts to use malicious queries similar to 1B.6, however attempts to leverage this to circumvent CodeMetrics API server and read directly from Metrics Store.</td>
			<td>CodeMetrics API routes do check if a user has a valid JWT, however do not check the source of this; as long as you have a valid JWT signed by the backend API and have the capability to communicate with it, you will be treated the same as if your request came through CodeMetrics Web UI.</td>
			<td>M1.3, M1.5, M2.2</td>
		</tr>
		<tr>
			<td>1D.4</td>
			<td>Threat actor/insider runs queries using the token/access credentials of a user who has a greater level of access than required in a data source, thereby allowing potentially unintended or sensitive data to be returned.</td>
			<td>See 1D.2 notes. Ultimately whilst this can be mitigated through RBAC in CodeMetrics, the token/credentials used to pull metrics from an upstream data source should be adhering to the principles of least privilege and only granting access to the data you wish to enter CodeMetrics.</td>
			<td>M1.3, M2.1, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>1D.5</td>
			<td>Threat actor sniffs traffic between an end user and CodeMetrics Web UI to capture information in flight.</td>
			<td>HTTPs should be in use - how this is achieved, i.e reverse proxy, integrated into codemetrics itself is TBC.</td>
			<td>M3.1, M3.11, M5.2</td>
		</tr>
		<tr>
			<td rowspan=4>Denial of Service</td>
			<td>1E.1</td>
			<td>Threat actor performs excessive number of queries, e.g using a script to consume excessive resources and induce degraded service or a compromise of availability of the data source platform and to legitimate users.</td>
			<td>No rate limiting for outgoing requests to an upstream data source appears to be present within CodeMetrics. Potentially this could be added as a guardrail config option dependent on an upstream data source in the case of very large queries to ease the strain on an upstream system, or alternatively setting a hard limit on the size of a query in terms of data returned, timespans, etc which could be increased if required.</td>
			<td>M1.2, M1.3, M1.8, M1.11, M3.12, M3.14</td>
		</tr>
		<tr>
			<td>1E.2</td>
			<td>Threat actor / malicious insider attempts to consume overwhelming number of tickets/data from a given data source platform, leading to a compromise of availability of the Web UI. </td>
			<td>Similar to 1E.1 however directed at the Web UI itself rather than causing service issues in an upstream data source. Some form of rate limiting / max memory usage for CodeMetrics queries to prevent this would be useful.</td>
			<td>M1.2, M1.3, M1.8, M1.11, M3.12, M3.14</td>
		</tr>
		<tr>
			<td>1E.3</td>
			<td>Threat actor leverages 1B.6 and/or 1B.7 to destroy data within a given data source, compromising the availability of CodeMetrics or the original data source platform.</td>
			<td>See 1B.6 and 1B.7 notes, CodeMetrics does not contain a 'write back' capability. Potentially documentation should direct users to only allow the account CodeMetrics uses to connect to upstream data sources read privileges and to limit its scope as mentioned in 1D.4</td>
			<td>M1.1, M1.2, M1.8, M1.11, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>1E.4</td>
			<td>Threat actor performs DOS/DDOS attack against Web UI to cause loss of availability.</td>
			<td>Impractical to build this protection into CodeMetrics itself; ideally CodeMetrics would be used in an internal environment where the risk of a DDOS is lower, however if an environment required it CodeMetrics could be fronted by a service such as AWS Shield, or have firewall rules in place to block rogue addresses that may be spamming the service.</td>
			<td>M1.2, M1.8, M1.11, M3.12</td>
		</tr>
		<tr>
			<td rowspan=2>Elevation of Privilege</td>
			<td>1F.1</td>
			<td>Threat actor uses malicious statements to achieve a vulnerability against the underlying Web UI container, e.g vulnerability in node.js, node.js dependencies or a vulnerability within the base container image that is adapted to contain the Web UI and uses this to escalate privileges, e.g by gaining a command shell.</td>
			<td>Continually updating container images as required and maintaining vigilance with regard to new vulnerabilities is the optimal approach. CodeMetrics would ideally be scanned using something like Trivy and Sonarqube to identify vulnerabilities and scan container images.</td>
			<td>M1.2, M1.5, M1.12, M3.7</td>
		</tr>
		<tr>
			<td>1F.2</td>
			<td>Variant of 1F.1 whereby an attacker could identify credentials used to communicate with the backend API server and use this to further escalate privileges or attempt lateral movement onto the backend API server itself, masquerading as a legitimate request from the Web UI. </td>
			<td>No API key is used to communicate with the backend API server as discussed in 1D.3, however an attacker could attempt to modify or tamper with vue pages or routes, which would be equally damaging, therefore UI code should be marked read only in the container.</td>
			<td>M1.1, M1.2, M1.12, M3.7</td>
		</tr>
	</tbody>
</table>

<div style="page-break-after: always;"></div>
