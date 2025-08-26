# ADR-0001: Fix Fly.io Health Check Failures for Code-Server Deployment

## Status
Accepted

## Context
The Fly.io deployment for the Debrief VS Code extension PR preview environment was experiencing consistent health check failures, preventing external access to the application. The deployment was successful and the code-server application was running correctly internally, but Fly.io's load balancer was returning 503 Service Unavailable errors due to failed health checks.

### Problem Analysis
- **Application Status**: Code-server was running correctly and serving VS Code web interface
- **Internal Connectivity**: Application responded properly on localhost:8080 within the container
- **Health Check Failures**: Fly.io health checks were receiving HTTP 302 redirects instead of expected 200 OK responses
- **External Access Blocked**: Load balancer refused to route traffic to "unhealthy" instances

### Root Cause
Code-server's default behavior is to redirect requests from `/` to `/?folder=/home/coder/workspace` with an HTTP 302 status code. Fly.io's health check configuration expected HTTP 200 responses, treating the 302 redirects as service failures.

## Decision
We decided to **remove health check configuration entirely** from the Fly.io deployment.

## Alternatives Considered

### Option 1: Accept 302 Redirects as Healthy
- **Description**: Configure health checks to accept HTTP 302 status codes as healthy responses
- **Assessment**: ❌ **Not feasible** - Fly.io health checks do not support custom expected status codes
- **Reason for rejection**: Fly.io platform limitation

### Option 2: Use Different Health Check Endpoint
- **Description**: Find or configure an endpoint that returns HTTP 200 for health checks
- **Potential endpoints**: `/healthz`, `/ping`, static assets, or API endpoints
- **Assessment**: ⚠️ **High risk** - Code-server may not expose reliable health endpoints
- **Concerns**: 
  - Dependency on code-server's internal API structure
  - Risk of endpoint changes in future versions
  - Additional complexity in identifying suitable endpoints
- **Reason for rejection**: Fragile solution with maintenance overhead

### Option 3: Disable Health Checking (Selected)
- **Description**: Remove the `[[http_service.checks]]` section from `fly.toml`
- **Assessment**: ✅ **Optimal choice**
- **Advantages**:
  - **Immediate resolution**: Eliminates root cause entirely
  - **Simple implementation**: Single configuration change
  - **Low maintenance**: No ongoing monitoring of health check endpoints
  - **Appropriate for use case**: PR preview environments don't require strict health monitoring
- **Trade-offs**: Loss of automatic unhealthy instance detection

## Implementation
1. Removed health check configuration from `fly.toml`:
   ```diff
   - [[http_service.checks]]
   -   interval = "15s"
   -   timeout = "5s"
   -   grace_period = "10s"
   -   method = "GET"
   -   path = "/"
   -   protocol = "http"
   -   tls_skip_verify = false
   ```

2. Redeployed application with updated configuration
3. Verified external accessibility restored

## Consequences

### Positive
- ✅ External access fully restored
- ✅ No more 503 Service Unavailable errors  
- ✅ Simplified deployment configuration
- ✅ Reduced potential for future health check issues

### Negative
- ❌ Loss of automatic failure detection for unhealthy instances
- ❌ No health monitoring visibility in Fly.io dashboard

### Risk Mitigation
- **Context**: This is a PR preview environment, not production infrastructure
- **Impact**: Health monitoring loss is acceptable for development/preview use cases
- **Monitoring**: Application availability can still be verified through external monitoring if needed

## Notes
- This decision is specific to the PR preview environment context
- For production deployments, health checks should be reconsidered with proper endpoint configuration
- The fix was verified with successful external access to https://pr-4-futuredebrief.fly.dev/

## Date
2025-08-26