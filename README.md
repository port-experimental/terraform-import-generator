# Terraform Import Generator

## Usage

1. Set env vars:
```
export PORT_CLIENT_ID=<your_client_id>
export PORT_CLIENT_SECRET=<your_client_secret>
export PORT_API_BASE_URL=api.getport.io # required. Use api.us.port.io or app.us.port.io for US region
export PORT_BETA_FEATURES_ENABLED=true # this is required if you want to export pages
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
  provider = port-labs
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
}

resource "port_blueprint" "service" {
  ...
}
```

3. Run apply

```
terraform apply
```
