Example SARIF upload:

    curl -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer eyJhbGciOiJI...'
         -d "@example.sarif" "http://localhost:3000/api/vulnerabilities?workload=athena&repoName=spring-petclinic&reportDate=2023-12-11"
