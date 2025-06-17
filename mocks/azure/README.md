# Azure DevOps mocks

## Prerequisites

- Get Imposter CLI from https://imposter.sh

## Mocks

These are captured with Imposter as follows:

    imposter proxy https://dev.azure.com/Org-Name-Here -H "Content-Type" --rewrite-urls

Run with:

    imposter up
