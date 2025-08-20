# ADR-003: Use GitHub Actions for CI/CD

## Context
We require CI/CD pipelines to build, test, and release the ecosystem. Options considered: GitHub Actions, GitLab CI, Azure Pipelines, Jenkins.

## Decision
We will use **GitHub Actions** as the CI/CD system.

## Rationale
- Direct integration with GitHub repository.
- Simple to configure, large ecosystem of actions.
- Supports caching for Pants builds.
- Easy migration path to GitHub Enterprise or Gitea+Actions for air-gapped deployments.

## Consequences
- Ties us to GitHub infrastructure initially.
- Need to replicate workflows on-prem for MOD/DSTL environments later.
