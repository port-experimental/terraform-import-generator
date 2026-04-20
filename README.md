# Terraform Import Generator

Generate Terraform import blocks for Port resources and migrate configurations between Port organizations.

## Quick Start

```bash
# Install
npm install && npm run build && npm link

# Set credentials
export PORT_CLIENT_ID=<source_client_id>
export PORT_CLIENT_SECRET=<source_client_secret>
export PORT_BETA_FEATURES_ENABLED=true

# Run everything in one command
port-tf-import -m --auto-fix --report --terraform
```

This single command:
1. Fetches all resources from Port
2. Generates import blocks (`*_imports.tf`)
3. Creates `providers.tf` (if missing)
4. Runs `terraform init`
5. Runs `terraform plan -generate-config-out=generated.tf`
6. Applies fixes automatically
7. Validates with `terraform plan`

## Migration Workflow

### One-Command Migration (Recommended)

```bash
export PORT_CLIENT_ID=<source_client_id>
export PORT_CLIENT_SECRET=<source_client_secret>
export PORT_BETA_FEATURES_ENABLED=true

port-tf-import -m --auto-fix --report --terraform
```

Then:
1. Review `migration_report.md` for blueprint dependencies
2. Add `depends_on` to `generated.tf` for blueprints with relations
3. Switch to target credentials and apply:

```bash
export PORT_CLIENT_ID=<target_client_id>
export PORT_CLIENT_SECRET=<target_client_secret>

rm *_imports.tf
terraform apply
```

### Manual Step-by-Step

If you prefer more control, run each step separately:

```bash
# Step 1: Generate imports and fix script
port-tf-import -m --auto-fix --report --generate-fix-script

# Step 2: Create providers.tf (see CLI Options section)

# Step 3: Run terraform
terraform init
terraform plan -generate-config-out=generated.tf

# Step 4: Apply fixes
./fix_generated.sh

# Step 5: Validate
terraform plan
```

## CLI Options

| Option | Description |
|--------|-------------|
| `-m, --migration-mode` | Display warnings for common migration issues |
| `--auto-fix` | Track fixes for reporting (entity types, relation titles, page ordering) |
| `--report` | Generate `migration_report.md` |
| `--generate-fix-script` | Generate `fix_generated.sh` |
| `--terraform` | Run terraform init, plan, generate config, and apply fixes automatically |
| `--exclude-github-integrations` | Skip GitHub integrations |
| `--exclude-system-blueprints` | Skip system blueprints (`_*` prefixed) |
| `--exclude-ai-pages` | Skip pages with AI agent widgets |
| `--exclude <patterns...>` | Pattern-based exclusion (e.g., `"integration:GitHub-*"`) |
| `-b, --export-entities-for-blueprints <ids>` | Export entities for specific blueprints |
| `-p, --provider-alias <alias>` | Provider alias (default: `port-labs`) |

## Fix Script

The `fix_generated.sh` script fixes issues in `generated.tf` that Terraform cannot handle:

| Issue | Fix |
|-------|-----|
| Entity page types | `type = "entity"` → `type = "blueprint-entities"` |
| jq_condition expressions | `expressions = null` → `expressions = []` |

## Migration Warnings

Use `-m` to detect issues requiring manual attention:

| Warning | Description | Action |
|---------|-------------|--------|
| GitHub Integrations | Installation IDs are org-specific | Reconfigure in target |
| System Blueprints | `_user`, `_team`, etc. | Must exist in target |
| AI Agent Pages | Missing agentIdentifier | Configure manually |
| Automation Triggers | May need userInputs | Review after apply |
| Page Ordering | References non-imported pages | Fixed by script |

## Filtering

Exclude resources that shouldn't be migrated:

```bash
# Exclude GitHub integrations and AI pages
port-tf-import -m --exclude-github-integrations --exclude-ai-pages

# Pattern-based exclusion
port-tf-import -m --exclude "integration:GitHub-*" --exclude "blueprint:_*"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT_CLIENT_ID` | Port client ID (required) |
| `PORT_CLIENT_SECRET` | Port client secret (required) |
| `PORT_BETA_FEATURES_ENABLED` | Set to `true` for page support |
| `PORT_BASE_URL` | API URL (default: `https://api.getport.io`) |
| `PORT_PROVIDER_ALIAS` | Provider alias for import blocks |

For US region: `PORT_BASE_URL=https://api.us.getport.io`

## Generated Files

| File | Description |
|------|-------------|
| `*_imports.tf` | Import blocks for each resource type |
| `providers.tf` | Terraform provider config (created by `--terraform` if missing) |
| `generated.tf` | Terraform resource config (created by `terraform plan`) |
| `migration_report.md` | Migration summary with dependencies |
| `fix_generated.sh` | Post-processing fix script |
