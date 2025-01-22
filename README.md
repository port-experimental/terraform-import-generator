# Terraform Import Generator

## Usage

1. Set env vars:
```
export PORT_CLIENT_ID=<your_client_id>
export PORT_CLIENT_SECRET=<your_client_secret>
export PORT_BETA_FEATURES_ENABLED=true # this is required if you want to export pages
```

2. Install deps
```
yarn install
```

3. Run the tool - bun is really easy and fast, and you don't need to mess around with transpiling any typescript. If you use devenv, just write `devenv shell` first

```
bun run main.ts
```

4. You now have all the import statements in `*.tf` - take a look

```
ls *.tf
cat blueprints.tf
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
