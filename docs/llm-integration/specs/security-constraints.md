# Security Constraints

**Back to**: [Main Index](../README.md)

---

## Current Architecture

### Localhost-Only Services

**Security Model**:
- Services bound to localhost interface only
- VS Code extension manages service lifecycle
- Network isolation provides security boundary

**Ports**:
- Debrief State Server: `localhost:60123`
- Tool Vault Server: `localhost:60124`

### Phase 1: No Authentication

**Rationale**:
1. LLM extensions run in user's environment with full user privileges
2. Services already localhost-only with no external exposure
3. Operational simplicity for initial rollout
4. VS Code extension controls service lifecycle

### Future Enhancements (Phase 2+)

- API key authentication for multi-user scenarios
- Request rate limiting
- Audit logging for compliance

---

**Back to**: [Main Index](../README.md)
