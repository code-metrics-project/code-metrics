# CodeMetrics Threat Model - Mitigations

<table border="1">
	<thead>
		<tr>
			<th>Category</th>
			<th>Ref</th>
			<th>Security Measure</th>
			<th>Addresses Threats</th>
			<th>Status</th>
			<th>Priority</th>
			<th>Responsible</th>
			<th>Notes</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td rowspan=12>Logging & Monitoring</td>
			<td>M1.1</td>
			<td>Log anomalous events on backend API.</td>
			<td>1A.4, 1B.1, 1B.2, 1B.6, 1B.7, 1C.1, 1D.2, 1E.3, 1F.2, 2B.1, 2B.2, 2B.3, 2B.4, 2D.4, 2D.5, 2E.1, 2E.6, 3B.3</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>Log requests with invalid parameters, to endpoints that don't exist, etc.</td>
		</tr>
		<tr>
			<td>M1.2</td>
			<td>Log anomalous events on Web UI.</td>
			<td>1A.2, 1A.4, 1B.1, 1B.2, 1B.7,1C.2, 1C.3, 1D.1, 1D.2, 1E.1, 1E.2, 1E.3, 1E.4, 1F.1, 1F.2, 3B.3</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g log requests which lead to non 200-300 response codes.</td>
		</tr>
		<tr>
			<td>M1.3</td>
			<td>Log anomalous events on metrics datastore.</td>
			<td>1B.6, 1C.2, 1D.2, 1D.3, 1D.4, 1E.1, 1E.2, 2D.3, 2D.5, 2E.1, 3A.1, 3B.2, 3B.3, 3B.4, 3B.6, 3C.1, 3C.2, 3E.1, 3E.2</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g Log requests with invalid parameters or if using AWS, cloudtrail logs for strange activity.</td>
		</tr>
		<tr>
			<td>M1.4</td>
			<td>Monitor for code injection and parameter fuzzing against backend API.</td>
			<td>1B.1, 1B.6, 1D.2, 2A.1, 2B.1, 2B.2, 2B.3, 2E.1, 2E.3, 2E.6, 2F.1, 3B.1, 3B.3, 3F.1</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g Monitor for invalid parameters, non 200-300 range response codes, endpoints that don't exist.</td>
		</tr>
		<tr>
			<td>M1.5</td>
			<td>Monitor for code injection and parameter fuzzing against Web UI.</td>
			<td>1B.1, 1B.6, 1B.7, 1D.2, 1D.3, 1F.1, 2A.1, 3B.1, 3B.3</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g monitor for invalid parameters, non 200-300 range response codes, endpoints that don't exist.</td>
		</tr>
		<tr>
			<td>M1.6</td>
			<td>Monitor for code injection and parameter fuzzing against metrics datastore.</td>
			<td>3B.1, 3B.2, 3B.3, 3C.3, 3D.1, 3D.2, 3E.3, 3F.1, 3F.2</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g Log requests with invalid parameters.</td>
		</tr>
		<tr>
			<td>M1.7</td>
			<td>Container runtime monitoring to monitor backend API health.</td>
			<td>2B.4, 2C.1, 2D.5, 2E.1, 2E.2, 2E.3, 2E.6</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>Healthcheck endpoints exist for backend API.</td>
		</tr>
		<tr>
			<td>M1.8</td>
			<td>Container runtime monitoring to monitor Web UI health.</td>
			<td>1B.3, 1B.5, 1C.3, 1E.1, 1E.2, 1E.3, 1E.4</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>E.g healthcheck endpoints.</td>
		</tr>
		<tr>
			<td>M1.9</td>
			<td>Container runtime monitoring to monitor metrics datastore health (or in the case of DynamoDB or MongoDB, relevant healthchecks via AWS or other means).</td>
			<td>3B.4, 3E.1, 3E.2, 3E.3</td>
			<td>N/A</td>
			<td>MUST</td>
			<td>Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M1.10</td>
			<td>Auditability of requests to the database (including authentication) through solutions such as PgAudit / in built logging.</td>
			<td>3A.1, 3B.2, 3B.3, 3B.4, 3B.6, 3C.1, 3C.2, 3E.1, 3E.2, 3E.3, 3F.1, 3F.2</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M1.11</td>
			<td>Monitor for system load of CodeMetrics to detect concerning events.</td>
			<td>1E.1, 1E.2, 1E.3, 1E.4, 2E.1, 2E.2, 2E.6, 2E.3, 3E.1, 3E.2, 3E.3</td>
			<td>Y</td>
			<td>MUST</td>
			<td>Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M1.12</td>
			<td>Container level shell monitoring of commands.</td>
			<td>1F.1, 1F.2, 2F.1, 3F.1, 3F.2, 3F.3</td>
			<td>X</td>
			<td>SHOULD</td>
			<td>CodeMetrics (Implement capability), Engagement(Action)</td>
			<td>Worth considering, however may be the case that this isn't applicable if keeping the shell is preferred.</td>
		</tr>
		<tr>
			<td rowspan=2>User Access Control</td>
			<td>M2.1</td>
			<td>Consider the implementation of role based access control to limit the abilities and sight of specific metrics to those required by their role.</td>
			<td>1C.2, 1D.2, 1D.4, 2D.3, 2D.5, 2E.1</td>
			<td>X (WONTDO)</td>
			<td>See M5.1</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M2.2</td>
			<td>Similar to M2.1, enforce access control permission checking at both the Web UI (e.g certain pages/drop downs are only visible if certain permissions are evaluated to be present) and at the backend API (where the 'true' validation takes place and a failure to have a certain permission fails the request. Could be implemented as route middleware to wrap requests).</td>
			<td>1D.3</td>
			<td>X (WONTDO)</td>
			<td>See M5.1</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td rowspan=17>Application Architecture</td>
			<td>M3.1</td>
			<td>Implement S2S authentication between Web UI and backend API. E.g API key authentication between Web UI and backend API to prevent an individual sidestepping the Web UI and attempting to interact directly with the backend API, as well as preventing reconniassance of backend API endpoints, as all requests without a valid API key will be rejected before processing.</td>
			<td>1D.5, 2A.1, 2B.1, 2B.2, 2B.3, 2D.2, 2D.4, 2E.3, 2F.1</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.2</td>
			<td>Implement S2S authentication between backend API and metrics datastore.</td>
			<td>3A.1, 3B.5</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.3</td>
			<td>Modify routes in backend API to invoke JWT validation middleware on routes that could lead to sensitive information leakage.</td>
			<td>1D.1, 2B.3, 2D.1, 2E.1, 2E.2, 2E.3, 2F.1, 3B.3</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.4</td>
			<td>Consider implementing CSRF protection.</td>
			<td>1A.2</td>
			<td>Y</td>
			<td>SHOULD</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.5</td>
			<td>Enforce HTTPS between backend API and Web UI to mitigate against attackers attempting to sniff useful information / credentials in flight / query data in flight.</td>
			<td>2D.1, 2D.2, 2D.4</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.6</td>
			<td>Utilise TLS and consider using a custom certificate authority to sign HTTPS from M3.5 and enable certificate validation to detect MITMing or attempted attacks.</td>
			<td>2D.1, 2D.2, 2D.4, 2D.6</td>
			<td>X</td>
			<td>COULD</td>
			<td>CodeMetrics (Implement Capability), Engagement (Action)</td>
			<td>Exact configuration would depend on a given engagement, however the actual presence of config options that are checked e.g certificate validation and certificate paths / nginx docker compose files could be created by CodeMetrics.</td>
		</tr>
		<tr>
			<td>M3.7</td>
			<td>Ensure the root user is not used on microservice containers to mitigate against what a potential threat actor could access upon gaining a shell/access.</td>
			<td>1F.1, 1F.2, 2F.1, 3F.1, 3F.2, 3F.3</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td>Node container images that CodeMetrics docker compose files utilise uses a dedicated node user rather than root.</td>
		</tr>
		<tr>
			<td>M3.8</td>
			<td>Validate and escape inputs submitted on the Web UI to prevent malicious inputs being transmitted to the backend API.</td>
			<td>1B.1, 1B.2, 1B.4, 1B.5, 1B.6, 1B.7, 2B.1</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.9</td>
			<td>Validate and escape user inputs similar to M3.9, however against the backend API to prevent malicious inputs being processed.</td>
			<td>2B.1, 2B.5, 2D.5, 2E.1</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.10</td>
			<td>Ensure query parameterisation is in place on any inputs that are substituted into queries on the backend API.</td>
			<td>2B.5, 2D.5, 2E.1, 3B.3</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.11</td>
			<td>Ensure security headers are deployed against microservices e.g content security policy, HSTS if appropriate.</td>
			<td>1D.5, 2A.1, 2B.1, 2B.2, 2B.3, 2D.2, 2D.4, 2E.3, 2F.1</td>
			<td>Review</td>
			<td>SHOULD</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.12</td>
			<td>Service autoscaling</td>
			<td>1E.1, 1E.2, 1E.4, 2E.1, 2E.2, 2E.3, 2E.6, 3E.1, 3E.2</td>
			<td>Y</td>
			<td>SHOULD</td>
			<td>Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.13</td>
			<td>Ensure JWTs have a validity period attached to them to mitigate against theft.</td>
			<td>1A.1, 1A.2, 1A.3, 1A.4, 2A.1, 2A.2</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.14</td>
			<td>Implement sane query time (meaning oldest possible query date, however could also be interpreted as a maximum timeout in seconds of a query) limitations to prevent excessively large queries.</td>
			<td>1E.1, 1E.2, 2E.1, 2E.3</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td>E.g set a config option to define oldest query-able date to prevent someone attempting to pull all metrics.</td>
		</tr>
		<tr>
			<td>M3.15</td>
			<td>Implement S2S authentication between backend API and upstream authentication providers.</td>
			<td>2A.3, 2A.4</td>
			<td>X</td>
			<td>SHOULD</td>
			<td>CodeMetrics (Implement Capability), Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.16</td>
			<td>Validate and escape any user inputs presented back to users of CodeMetrics UI to mitigate XSS attacks.</td>
			<td>1B.2, 1B.8</td>
			<td>Y</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M3.17</td>
			<td>Implement a minimum cache validity time, whereby subsequent attempts to cache queries will fail until this time has elapsed (e.g 5 minutes) to prevent denial of service attacks.</td>
			<td>2E.6</td>
			<td>X</td>
			<td>SHOULD</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td rowspan=2>Network Controls</td>
			<td>M4.1</td>
			<td>Utilise TLS for communication with databases (not applicable to in memory database).</td>
			<td>3D.3</td>
			<td>Review</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Functionality), Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td>M4.2</td>
			<td>Consider implementing network level whitelisting, e.g iptables, container dns name resolution, etc as a method of limiting access to services. E.g only permit requests from Web UI to backend API, only permit requests from backend API to metrics datastore, only allow requests to upstream data sources from backend API.</td>
			<td>1B.7, 1E.3, 2A.1, 2B.2, 2B.5, 2D.1, 2E.3, 3B.1, 3B.2, 3B.5</td>
			<td>N/A</td>
			<td>SHOULD</td>
			<td>Engagement (Action)</td>
			<td></td>
		</tr>
		<tr>
			<td rowspan=4>Misc</td>
			<td>M5.1</td>
			<td>Review, determine and document if CodeMetrics should contain role based access control, or if one instance of CodeMetrics should be configured for each role/type of user to segment access, with a separate set of credentials for each instances upstream data source to indirectly achieve RBAC. This decision should be documented.</td>
			<td>1C.2, 1D.2, 1D.4, 2D.3, 2D.5, 2E.1</td>
			<td>X (WONTFIX)</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M5.2</td>
			<td>Review, determine and document if CodeMetrics should be fronted by a reverse proxy (therefore changing the need for some aspects of HTTPS as this could be applied at the proxy, as well as rate limiting), or otherwise.</td>
			<td>1B.7, 1D.5, 1E.3, 2A.1, 2B.1, 2B.2, 2B.3, 2B.5, 2D.1, 2D.2, 2D.4, 2E.3, 2F.1, 3B.1, 3B.2, 3B.5</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M5.3</td>
			<td>Review documentation and provide guidance to admins/engagements potentially using CodeMetrics that accounts used for an upstream data source should be limited to only the minimum set of metrics you require in CodeMetrics to avoid inadvertent ingestion of unauthorised metrics.</td>
			<td>1C.2, 1D.2, 1D.4, 2D.3, 2D.5, 2E.1</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
		<tr>
			<td>M5.4</td>
			<td>Review documentation and and strongly discourage the use of administrative accounts.</td>
			<td>2F.2</td>
			<td>X</td>
			<td>MUST</td>
			<td>CodeMetrics (Implement Capability)</td>
			<td></td>
		</tr>
	</tbody>
</table>

<div style="page-break-after: always;"></div>
