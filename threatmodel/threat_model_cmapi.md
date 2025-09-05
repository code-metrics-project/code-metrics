# CodeMetrics Threat Model - CodeMetrics API

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
			<td>2A.1</td>
			<td>Threat actor attempts to circumvent CodeMetrics UI and sends requests directly to CodeMetrics backend API to facilitate a brute force attack, leading to eventual successful impersonation of a legitimate user. </td>
			<td>No rate limiting appears to be implemented within CodeMetrics (see 1A.4 for comments around implementing ratelimiting through a reverse proxy/upstream from CodeMetrics). No S2S auth between backend API and Web UI (see 1D.3 for comments on S2S auth). Therefore, this threat is currently unmitigated.</td>
			<td>M1.4, M1.5, M3.1, M3.11, M3.13, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>2A.2</td>
			<td>Threat actor performs phishing attack/social engineering on an end user to obtain credentials and subsequently obtains a valid JWT on their behalf.</td>
			<td>Users should not directly communicate with the backend API to gain authentication, however CodeMetrics doesn't explicitly prevent this.</td>
			<td>M3.13</td>
		</tr>
		<tr>
			<td>2A.3</td>
			<td>Threat actor attempts to spoof an uptream authentication source e.g Cognito, LDAP, Keycloak, OIDC which CodeMetrics is configured to use, resulting in capture of user credentials.  </td>
			<td>Unlikely as this would require the configuration of CodeMetrics to be modified to point to an attacker-controlled authentication provider.</td>
			<td>M3.15</td>
		</tr>
		<tr>
			<td>2A.4</td>
			<td>Threat actor performs brute force attack against backend API, leveraging weak default credentials.</td>
			<td>CodeMetrics helm charts include templates with weak passwords, which, if left unchanged, could allow an attacker to gain access. Recommend documenting that these defaults are unsafe and must be changed when deployed, or syntax deliberately modified to cause the helm chart to fail unless it is altered.</td>
			<td>M3.15</td>
		</tr>
		<tr>
			<td rowspan=5>Tampering</td>
			<td>2B.1</td>
			<td>Threat actor chains 2A.2 or other methods of gaining user credentials (or a valid JWT) and uses this to POST saved queries containing malicious inputs that lead to tampering against the backend API.</td>
			<td>Backend API checks collection ID but does not validate names, descriptions, etc which could lead to arbitrary content being stored.</td>
			<td>M1.1, M1.4, M3.1 M3.8, M3.9, M3.11, M5.2</td>
		</tr>
		<tr>
			<td>2B.2</td>
			<td>Threat actor exploits a lack of service-to-service authentication between Web UI and backend API server to craft malicious requests to attempt tampering against the API server.</td>
			<td>Whilst JWTs are checked for most routes* (* see 2D.1), this checks that a JWT is valid and signed by the backend API; not if the request originated from the Web UI. A threat actor could potentially steal a JWT through 1A.x, then subsequently sidestep any input sanitisation that happens in Web UI by submitting requests directly and supplying the JWT.</td>
			<td>M1.1, M1.4, M3.1, M3.11, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>2B.3</td>
			<td>Threat actor chains 2A.2 or other methods of gaining user credentials (or a valid JWT) and uses this to attempt tampering against authenticated endpoints that do not escape user input, or otherwise transform/split/concatenate user input.</td>
			<td>If a threat actor / malicious insider did have a valid JWT after stealing this / phishing an end user, etc, CodeMetrics checks the type of parameters but does not enforce limits in terms of query size/parameter content. Injection is unlikely, however sending very large queries or fuzzing is feasible.</td>
			<td>M1.1, M1.4, M3.1, M3.3, M3.11, M5.2</td>
		</tr>
		<tr>
			<td>2B.4</td>
			<td>Threat actor with administrative access to backend API modifies a given identity authenticator to an attacker controlled instance in an attempt to harvest username/password credentials during a JWT validation.</td>
			<td>Would require access to the backend API container or it's configuration.</td>
			<td>M1.1, M1.7</td>
		</tr>
		<tr>
			<td>2B.5</td>
			<td>Threat actor attempts to insert malicious statements within API request parameters that lead to code injection against the backend API / tamper with functionality or return tampered data.</td>
			<td>Type of request parameters are checked.</td>
			<td>M3.9, M3.10, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>Repudiation</td>
			<td>2C.1</td>
			<td>Threat actor attempts to perform any given threat without the backend API being able to repudiate the actions undertaken.</td>
			<td>Backend API does have the capability to log actions but these are not always corroborated against a given user and more for debug purposes.</td>
			<td>M1.7</td>
		</tr>
		<tr>
			<td rowspan=6>Information Disclosure</td>
			<td>2D.1</td>
			<td>Threat actor accesses particular backend API endpoints that do not invoke JWT authentication middleware, thereby allowing data to be retrieved from the following endpoints: /api/health/liveness, /api/health/readiness, /api/logout, /api/system/bootstrap, /api/authenticated, /api/authenticate.</td>
			<td>CodeMetrics Web UI does not provide this information, but CodeMetrics backend API can provide it without authorisation. This information is of limited value to an attacker; an attacker could infer the health of the API through repeated requests and measuring latency, as well as by determining if a service is unresponsive to their requests.</td>
			<td>M3.3, M3.5, M3.6, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>2D.2</td>
			<td>Threat actor attempts to sniff traffic between CodeMetrics UI and backend API to steal credentials in transit/work out queries or other useful information.</td>
			<td>HTTPs should be used between UI and backend API to prevent sniffing, however the endpoints discussed in 2D.1 should be modified to expect JWTs to prevent data disclosure.</td>
			<td>M3.1, M3.5, M3.6, M3.11, M5.2</td>
		</tr>
		<tr>
			<td>2D.3</td>
			<td>Threat actor chains 2A.2 or other methods of gaining user credentials (or a valid JWT) and exploits a lack of access control to view metrics they would not normally have the ability to view.</td>
			<td>CodeMetrics has limited access control; user authentication exists however no permission segmentation exists within authenticated users. If a user is authorised and has a JWT, any timespan, ticket type, etc available to the account of the upstream data source is available to the authorised user of CodeMetrics. If this is intended design, highlighting this in documentation would be useful to prevent users indirectly receiving sensitive data via metrics that they would not normally have access to.</td>
			<td>M1.3, M2.1, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>2D.4</td>
			<td>Threat actor attempts to sniff traffic between an upstream data source platform and the CodeMetrics API server to retrieve tokens/credentials or data that would be received by CodeMetrics to perform metric analysis.</td>
			<td>HTTPs should be mandated by backend API when attempting a connection to a data source e.g Bitbucket or Jira; refusal by upstream data source to ahere to HTTPs/attempts to downgrade to HTTP should be met with a refusal to connect further. Potentially could be further chained with certificate validation as a configuration option to mitigate against threat actors spinning up typosquatting instances of an upstream data source.</td>
			<td>M1.1, M3.1, M3.5, M3.6, M3.11, M5.2</td>
		</tr>
		<tr>
			<td>2D.5</td>
			<td>Threat actor leverages 2B.3 lack of input validation to submit queries for metrics outside of the timescales they should be allowed to query.</td>
			<td>See 2D.3 comments - limited access control in place to prevent this. Documentation should highlight that you should limit the access of the account you 'give' to CodeMetrics within an upstream data source and state that dates/times are uncapped, or CodeMetrics should be updated with access control for this.</td>
			<td>M1.1, M1.3, M1.7, M2.1, M3.9, M3.10, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>2D.6</td>
			<td>Threat actor sniffs traffic between CodeMetrics and an upstream authentication source e.g Cognito, LDAP, Keycloak to extract sensitive credentials and information.</td>
			<td>Documentation for authentication should explicitly highlight the dangers of not enabling TLS for authentication sources. Configurations such as 'LDAP_TLS=false' or running Keycloak without HTTPS should be marked as dangerous.</td>
			<td>M3.6</td>
		</tr>
		<tr>
			<td rowspan=6>Denial of Service</td>
			<td>2E.1</td>
			<td>Threat actor deliberately makes impossibly large queries in an attempt to disrupt the backend API / cause the upstream data source to ratelimit or block the backend API, thereby disrupting availability, e.g by supplying 0001-01-01 as a startDate.</td>
			<td>Feasible to cause slowdowns on large datasets or otherwise disrupt performance.</td>
			<td>M1.1, M1.3, M1.4, M1.7, M1.11, M2.1, M3.3, M3.9, M3.10, M3.12, M3.14, M5.1, M5.3</td>
		</tr>
		<tr>
			<td>2E.2</td>
			<td>Threat actor performs DOS/DDOS attack against backend API to cause loss of availability.</td>
			<td>See 1E.4 comments as the same principles apply.</td>
			<td>M1.7, M1.11, M3.3, M3.12</td>
		</tr>
		<tr>
			<td>2E.3</td>
			<td>Threat actor exploits the lack of JWT validation on /api/system/queries endpoint similarly to 2D.1, however uses this to constantly attempt to fetch or load queries using a script or other automated means to cause availability issues.</td>
			<td>Similar to 2E.1 however 2E.1 woud require a user to have a valid JWT; 2E.3 does not require a valid JWT as they are not validated for these routes, therefore the potential for someone to attempt this is much higher in comparison to 2E.1.</td>
			<td>M1.4, M1.7, M1.11, M3.1, M3.3, M3.11, M3.12, M3.14, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>2E.4</td>
			<td>Threat actor, through insider threat or DDoS, manages to disrupt an authentication provider, causing CodeMetrics to default to other authentication providers that may use less secure credentials.</td>
			<td>The expected behaviour in the event of an authentication provider outage should be defined and the possibility to 'downgrade' to other authentication providers should be defined as an option. E.g if LDAP is disrupted, should downgrading to file based credentials be allowable?</td>
			<td>M1.1, M1.7, M1.11, M3.12 (authentication provider), M4.2</td>
		</tr>
		<tr>
			<td>2E.5</td>
			<td>Threat actor, through insider threat or DDoS, manages to disrupt an authentication provider, causing a lack of availability of CodeMetrics logins.</td>
			<td>See 2E.4</td>
			<td>M1.1, M1.7, M1.11, M3.12 (authentication provider), M4.2</td>
		</tr>
		<tr>
			<td>2E.6</td>
			<td>Threat actor with authenticated access to CodeMetrics (or an insider threat) repeatedly queries /api/system/cache to trigger a cache refresh. No rate limiting in place means it is possible to spam this URL to consume resources and potentially disrupt availability of CodeMetrics.</td>
			<td>Rate limiting is not in place and therefore repeated caching could lead to increased system resource consumption. Advise creation of a cache staleness time, whereby calls to /api/system/cache will not take effect if X number of minutes have not elapsed between the previous cache time and current date, e.g 5 minutes. </td>
			<td>M1.1, M1.4, M1.7, M1.11, M3.12, M3.17</td>
		</tr>
		<tr>
			<td rowspan=2>Elevation of Privilege</td>
			<td>2F.1</td>
			<td>Threat actor uses malicious statements to achieve a vulnerability against the underlying backend API container, e.g vulnerability in node.js, node.js dependencies or a vulnerability within the base container image that is adapted to contain the backend API and uses this to escalate privileges, e.g by gaining a command shell.</td>
			<td>See 1F.1 comments as the same principles apply.</td>
			<td>M1.4, M1.12, M3.1, M3.3, M3.7, M3.11, M5.2</td>
		</tr>
		<tr>
			<td>2F.2</td>
			<td>Malicious user leveraging 2F.1 or other means gains access to CodeMetrics backend API. Provided LDAP is in place with an administrative account, an attacker could enumerate and extract sensitive information from the LDAP server, using this information to laterally move to non-CodeMetrics services.</td>
			<td>Requires LDAP be deployed with an administrative account. Notable that even without an administrative account it would be possible to enumerate other user accounts to disclose names and ldap OU information.</td>
			<td>M5.4</td>
		</tr>
	</tbody>
</table>

<div style="page-break-after: always;"></div>
