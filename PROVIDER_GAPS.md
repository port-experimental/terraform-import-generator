# Port Terraform Provider - Migration Gaps

This document outlines issues discovered when using Terraform to migrate Port configurations between organizations. These gaps affect the import/export workflow and cause friction during migrations.

---

## 1. Entity Page Type Mismatch

**Severity:** High (blocks apply)

**Problem:**
The Port API returns pages with `type: "entity"`, but the Terraform provider only accepts `["blueprint-entities", "dashboard", "home"]`.

**Error:**
```
Error: Invalid Attribute Value Match

with port_page.k8s_pods,
on port_page.tf line 16, in resource "port_page" "k8s_pods":
16:   type = "entity"

Attribute type value must be one of: ["blueprint-entities" "dashboard" "home"], got: "entity"
```

**Current Workaround:**
Users must manually run `sed` to fix generated config:
```bash
sed -i '' 's/type *= *"entity"/type = "blueprint-entities"/g' generated.tf
```

**Suggested Fix:**
Either:
1. Accept `"entity"` as a valid type in the provider (aliased to `"blueprint-entities"`)
2. Or update the API to return `"blueprint-entities"` instead of `"entity"`

---

## 2. Null Relation Titles Cause Drift

**Severity:** Medium (causes perpetual drift)

**Problem:**
Blueprint relations can have `title: null` in the API response. When imported, Terraform generates `title = null`. On subsequent plans, the provider detects drift and wants to update, even though nothing changed.

**Example:**
```hcl
relations = {
  service = {
    target   = "service"
    title    = null  # Causes drift on every plan
    many     = false
    required = false
  }
}
```

**Current Workaround:**
Users must manually set explicit titles for all relations:
```hcl
title = "Service"  # Must be set explicitly
```

**Suggested Fix:**
1. Provider should treat `null` and omitted `title` as equivalent (no drift)
2. Or provider should auto-generate a title from the relation key if null

---

## 3. GitHub Integration Installation IDs

**Severity:** Medium (requires manual reconfiguration)

**Problem:**
GitHub integrations contain `installationId` which is specific to the GitHub App installation in the source organization. This ID is invalid in the target organization.

**Current Workaround:**
Users must:
1. Remove the GitHub integration from Terraform management, OR
2. Manually reconfigure the integration in the target org after apply

**Suggested Fix:**
1. Provider documentation should warn about this
2. Consider a `lifecycle { ignore_changes = [installation_id] }` recommendation
3. Or provide a way to "reconnect" an integration without recreating it

---

## 4. System Blueprints Cannot Be Created

**Severity:** Low (expected behavior, but confusing)

**Problem:**
System blueprints (`_user`, `_team`, `_rule_result`, etc.) are returned by the API and get import blocks generated, but they cannot be created via Terraform in a new org. They're managed by Port.

**Current Workaround:**
Users must manually remove system blueprint resources from their Terraform config, or use `port_system_blueprint` data sources instead.

**Suggested Fix:**
1. Clearer error message when attempting to create system blueprints
2. Documentation on which blueprints are system-managed
3. Consider a `port_system_blueprint` resource that only allows reading/referencing (not creating)

---

## 5. Page Ordering Dependencies

**Severity:** Low (causes apply failures)

**Problem:**
Pages have an `after` field that references another page identifier. If the referenced page is a system page (e.g., `_ai_agents`, `_mcp_servers`) or doesn't exist in the target org, the apply fails.

**Example:**
```hcl
resource "port_page" "my_page" {
  after = "_ai_agents"  # System page - may not exist or be referenceable
}
```

**Current Workaround:**
Users must set `after = null` for pages that reference non-existent pages.

**Suggested Fix:**
1. Provider should gracefully handle missing `after` references
2. Or validate at plan time with a clear error message

---

## 6. AI Agent Widget Configuration

**Severity:** Low (causes apply failures for specific pages)

**Problem:**
Pages with AI agent widgets contain `agentIdentifier` references that may not exist in the target organization.

**Current Workaround:**
Users must either:
1. Remove these pages from Terraform management
2. Manually configure the agent reference after migration

**Suggested Fix:**
1. Clearer error messages when agent references are invalid
2. Documentation on AI agent page limitations

---

## 7. Automation Trigger Configuration

**Severity:** Low (may cause apply failures)

**Problem:**
Actions with `automation_trigger` may have complex configurations that reference entities or conditions specific to the source organization.

**Current Workaround:**
Users must review and potentially reconfigure automation triggers manually.

**Suggested Fix:**
1. Validation at plan time for automation trigger references
2. Documentation on automation trigger migration considerations

---

## Summary Table

| Issue | Severity | Blocks Apply? | Auto-Fixable? |
|-------|----------|---------------|---------------|
| Entity page type mismatch | High | Yes | Yes (sed) |
| Null relation titles | Medium | No (drift) | Yes (manual edit) |
| GitHub installation IDs | Medium | No | No (manual reconfig) |
| System blueprints | Low | Yes | Yes (remove from config) |
| Page ordering | Low | Yes | Yes (set after=null) |
| AI agent widgets | Low | Yes | No (manual config) |
| Automation triggers | Low | Maybe | No (manual review) |

---

## Recommendations

### Short-term (Provider Changes)
1. **Accept `"entity"` as page type** - Map to `"blueprint-entities"` internally
2. **Fix null title drift** - Treat null and omitted as equivalent

### Medium-term (Documentation)
1. Add migration guide to provider docs
2. Document system blueprint behavior
3. Document GitHub integration limitations

### Long-term (Tooling)
1. Consider a `terraform import` mode that handles these transformations automatically
2. Add validation warnings at plan time for migration-specific issues
