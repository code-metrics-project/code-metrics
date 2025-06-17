# Helm Charts

## Demo

1. Edit `demo-code-metrics-values.yaml` to change all entries of: `default.svc.cluster.local` to `_NAMESPACE_.svc.cluster.local` where `_NAMESPACE_` is the namespace you are deploying to.
2. Deploy the supporting tooling that code-metrics will connect to `helm install code-metrics-demo`
3. Deploy Code-Metrics with the demo values `helm install code-metrics -f demo-code-metrics-values.yaml`

If the ingress is configured properly with a real URL use that to connect otherwise, use `kubectl port-forward svc/code-metrics 8080:8080` & `kubectl port-forward svc/code-metrics 3000:3000` and use the URL `code-metrics.127.0.0.1.sslip.io` to connect (sslip.io just returns the ip of parent domain of the subdomain so in this example 127.0.0.1).

## Production

- helm install code-metrics -f myvalues.yaml

## Development

To re-generate the values.schema.json install the following helm plugin

`helm plugin install https://github.com/losisin/helm-values-schema-json.git`

then run the following command

`helm schema -input helm/code-metrics/values.yaml -output helm/code-metrics/values.schema.json`

If manual edits were made to the values.schema.json file then the above command should be modified 
to output to a new file and then the files should be manually compared and merged. 