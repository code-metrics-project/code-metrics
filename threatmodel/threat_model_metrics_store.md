# CodeMetrics Threat Model - Metrics Datastore

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
			<td rowspan=1>Spoofing</td>
			<td>3A.1</td>
			<td>Threat actor attempts brute force attack against datastore to eventually gain access and impersonate a legitimate database user.</td>
			<td>Feasible as datastore configurations to not explicitly only accept requests from the backend API, therefore if you were on the same network range and could communicate with the metrics store you could attempt a brute force.</td>
			<td>M1.3, M1.10, M3.2</td>
		</tr>
		<tr>
			<td rowspan=6>Tampering</td>
			<td>3B.1</td>
			<td>Threat actor attempts to insert malicious statements into an upstream datastore e.g inserting XSS script into Jira ticket names or other fields that are ingested by the API and subsequently stored in a datastore. Results are presented back through the Web UI and facilitate tampering against CodeMetrics.</td>
			<td>Even if not directly malicious, when ingesting large amounts of data from ticketing systems like Jira or other sources, it's likely to encounter some strange symbols/formatting issues that could make their way into the database. DynamoDB doesn't enforce a specific type but stringifies items, MongoDB and inmem specifies string datatype. In the event this was ingested and returned to the Web UI, most content would be used by ApexCharts to graph the actual data resulting in a failed graph output rather than XSS. Potentially a series name or other data that vue uses and displays could result in a script being displayed as a series title or part of the data, vue automatically escapes the templates that are used to render graphs; see vuejs.org/guide/best-practices/security</td>
			<td>M1.4, M1.5, M1.6, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>3B.2</td>
			<td>Variant of 3B.1 for other database configurations where code injection / parameter tampering could take place against the datastore itself (MongoDB, DynamoDB).</td>
			<td>Query parameterisation when talking to database will mitigate against code injection directly in parameters. Parameters passed to DB api.ts have types validated however there appears to be limited filtering of queries, which should be strengthened. </td>
			<td>M1.3, M1.6, M1.10, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>3B.3</td>
			<td>Malicious query parameters supplied by users in Web UI or directly to API, which result in commands being executed against the database to drop data/modify details.</td>
			<td>No method via Web UI to drop data through native functionality e.g a delete button or a delete function in the backend API. However a user could attempt 3B.2 to drop data in the same way or modify data. </td>
			<td>M1.1, M1.2, M1.3, M1.4, M1.5, M1.6, M1.10, M3.3, M3.10</td>
		</tr>
		<tr>
			<td>3B.4</td>
			<td>Malicious insider with access to database modifies values to manipulate metrics.</td>
			<td>Access to the database should be locked down to the minimum amount of administrators that require it to prevent this from occuring. This should be mentioned in the documentation but ultimately relies on administrators securing their database appropriately.</td>
			<td>M1.3, M1.9, M1.10</td>
		</tr>
		<tr>
			<td>3B.5</td>
			<td>Threat actor exploits lack of service to service authentication between datastores and API, enabling any 3A-E.x to take place directly against the database without needing to go through the backend API (not including in-memory database).</td>
			<td>Databases do not currently enforce whitelisting to only allow incoming requests from the backend api, which could mitigate.</td>
			<td>M3.2, M4.2, M5.2</td>
		</tr>
		<tr>
			<td>3B.6</td>
			<td>Threat actor gains access to AWS environment and uses this to tamper with database configuration (in the case of DynamoDB or MongoDB in AWS, or in memory database on a container).</td>
			<td>Similar to 3B.5; reliant on administrators securing the environment CodeMetrics runs within rather than an issue with CodeMetrics itself. In memory databases do prevent a potential vector, as if the backend api container was compromised (which presumably runs the in memory database), an attacker could attempt a kernel exploit or memory allocation exploit to read out pages of memory allocated to the database.</td>
			<td>M1.3, M1.10</td>
		</tr>
		<tr>
			<td rowspan=2>Repudiation</td>
			<td>3C.1</td>
			<td>Insider threat is able to modify data within database without a method to log/repudiate that changes have been made, and by whom.</td>
			<td>Limited database logging which could be strengthened to report on changes and attribute them.</td>
			<td>M1.3, M1.10</td>
		</tr>
		<tr>
			<td>3C.2</td>
			<td>Threat actor is able to attempt logins/send attempted injection attacks/modify data without the ability to log/repudiate that changes have been made, and by whom, similar to 3C.1</td>
			<td>Similar to 3C.1; logging could be strengthened to report on this, or mitigated by only allowing the DB to communicate with the backend API.</td>
			<td>M1.3, M1.10</td>
		</tr>
		<tr>
			<td rowspan=3>Information Disclosure</td>
			<td>3D.1</td>
			<td>Threat actor exploits lack of sanitisation/limiting of data ingestion from an upstream data source, leading to sensitive data being contained within the database and disclosed to individuals through the CodeMetrics Web UI. </td>
			<td>See 1D.2 notes. Ultimately whilst this can be mitigated through RBAC in CodeMetrics, the token/credentials used to pull metrics from an upstream data source should be adhering to the principles of least privilege and only granting access to the data you wish to enter CodeMetrics.</td>
			<td>M1.6</td>
		</tr>
		<tr>
			<td>3D.2</td>
			<td>Variant of 3D.1 where a tampering attack e.g 3B.x is chained with 3D.1 to disclose sensitive metrics from the database.</td>
			<td>Can be mitigated through 3B.x mitigations, however the overall stance should be to limit CodeMetrics' access to an upstream data source to only the data you are comfortable with anyone with a CodeMetrics account being able to view.</td>
			<td>M1.6</td>
		</tr>
		<tr>
			<td>3D.3</td>
			<td>Threat actor attempts to sniff traffic between backend API and metrics datastore to capture queries or returning query data in flight.</td>
			<td>Can be mitigated through TLS, however implementation will largely depend on each engagement similar to 1D.5</td>
			<td>M4.1</td>
		</tr>
		<tr>
			<td rowspan=3>Denial of Service</td>
			<td>3E.1</td>
			<td>Threat actor attempts to ingest substantially more metrics data than expected into the in memory data store, resulting in excessive memory consumption and potentially impacting database performance and ultimately availability (In memory data source configuration).</td>
			<td>In the case of DynamoDB or MongoDB this can be sufficiently mitigated through autoscaling, however in memory database configuration could feasibly reach a memory 'ceiling' which could cause service unavailability. In memory database code does explicitly have a comment calling out that it should not be used in production but perhaps a file in documentation reflecting this would be ideal.</td>
			<td>M1.3, M1.9, M1.10, M1.11, M3.12</td>
		</tr>
		<tr>
			<td>3E.2</td>
			<td>Threat actor gains access to AWS environment similar to 3B.6 however uses this to terminate services.</td>
			<td>Similar to 3B.5; reliant on administrators securing the environment CodeMetrics runs within rather than an issue with CodeMetrics itself.</td>
			<td>M1.3, M1.9, M1.10, M1.11, M3.12</td>
		</tr>
		<tr>
			<td>3E.3</td>
			<td>Threat actor leverages 3B.x tampering attacks and uses this to empty datastore of data used for metric analysis.</td>
			<td>Relevant mitigations mentioned for 3B.x threats should be applied, however the potential damage of emptying the metrics DB is limited as ultimately this can be repopulated from an upstream data source; regardless 3B.x mitigations should be in place to prevent such tampering.</td>
			<td>M1.6, M1.9, M1.10, M1.11</td>
		</tr>
		<tr>
			<td rowspan=3>Elevation of Privilege</td>
			<td>3F.1</td>
			<td>Threat actor uses malicious statements to achieve a vulnerability against the underlying backend API container, e.g vulnerability in node.js, node.js dependencies or a vulnerability within the base container image that is adapted to contain the backend API (and the in memory database if this option is used) and uses this to escalate privileges, e.g by gaining a command shell.</td>
			<td>See 1F.1 comments as the same principles apply.</td>
			<td>M1.4, M1.6, M1.10, M1.12, M3.7</td>
		</tr>
		<tr>
			<td>3F.2</td>
			<td>Threat actor leverages 3F.1 and attempts to leverage container exploits to read memory allocated to database process to uncover datastore content without authorisation.</td>
			<td>As discussed in 3B.6, this could be feasible if in memory options were selected in production and the version of Linux and / or the container image itself had known vulnerabilities. Whilst at the moment this is not the case, if a CodeMetrics instance remained on node 20.x for several months or a year and vulnerabilities were discovered in memory management / memory isolation, this could be feasible. Mitigations are to ensure versions are updated in a timely manner and potentailly some kind of document within docs/bulletins for CodeMetrics updates in the event of a significant vulnerability.</td>
			<td>M1.6, M1.10, M1.12, M3.7</td>
		</tr>
		<tr>
			<td>3F.3</td>
			<td>Threat actor leverages 3F.1 to gain access to the backend API container and attempts to read the volume mounted .env file to uncover sensitive details, e.g authenticators, access token secrets.</td>
			<td>Potentially modify perimssions of .env to enforce it being readable only to a specific container user, however if a threat actor gains access to the container as this user the mitigation is limited. Ultimately credentials need to be passed to the container to connect onwards to the authenticators/data sources/metrics db. Potentially removing the shell could limit an attackers abilities. </td>
			<td>M1.12, M3.7</td>
		</tr>
	</tbody>
</table>

<div style="page-break-after: always;"></div>
