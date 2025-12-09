# Terraform Import Generator

## Usage

1. Set env vars:
```bash
export PORT_CLIENT_ID=<your_client_id>
export PORT_CLIENT_SECRET=<your_client_secret>
export PORT_API_BASE_URL=api.getport.io # required. Use api.us.port.io or app.us.port.io for US region
export PORT_BETA_FEATURES_ENABLED=true # this is required if you want to export pages

# Optional: Set the Terraform provider base URL (defaults to https://api.getport.io)
export TF_VAR_port_base_url=https://api.getport.io  # Use https://api.us.getport.io for US region
```

2. Install dependencies, install CLI
```
npm install
npm run build
npm link

```

3. Run CLI

```
port-tf-import
```
By default the following import files will be generated:
- webhook_imports.tf
- action_imports.tf
- blueprint_imports.tf
- scorecard_imports.tf
- integration_imports.tf
- page_imports.tf
- folder_imports.tf
- aggregation_property_imports.tf

If you want to fetch entities for specific blueprints, specify them via command line argument:
```
port-tf-import --export-entities-for-blueprints blueprint1,blueprint2
port-tf-import -b blueprint1,blueprint2
```

### Configuring Provider Alias

By default, the generated import blocks use `port-labs` as the provider alias. You can configure this using:

**CLI option:**
```
port-tf-import -p port
port-tf-import --provider-alias port
```

**Environment variable:**
```
export PORT_PROVIDER_ALIAS=port
port-tf-import
```

**Precedence:** CLI option > environment variable > default (`port-labs`)

This is useful when your Terraform configuration uses a different provider alias, for example:
```hcl
terraform {
  required_providers {
    port = {
      source  = "port-labs/port-labs"
      version = "2.14.4"
    }
  }
}

provider "port" {
}
```

4. You now have all the import statements in `*.tf` - take a look

```
ls *.tf
cat blueprint_imports.tf
```

5. Now run terraform to import

```
terraform plan -generate-config-out=generated.tf
```

## Applying

1. Now update your env vars to point to the new target org

2. If you have relations between your blueprints, you will need to make sure terraform creates them in a sensible order, or else it will try to create all blueprints at once and there will be issues about blueprints not being found. Create `depends_on` statements for each dependency from left to right

```
resource "port_blueprint" "repository" {
  provider = port  # or port-labs, depending on your configuration
  depends_on = [port_blueprint.service]
  ...
  relations = {
    service = {
      description = null
      many        = false
      required    = false
      target      = "service"
      title       = "Service"
    }
  ...
  }
```

resource "port_blueprint" "service" {
  ...
}
```

3. Run apply

```
terraform apply
```
