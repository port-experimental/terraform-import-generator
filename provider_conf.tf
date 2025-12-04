terraform {
  required_providers {
    port-labs = {
      source = "port-labs/port-labs"
      version = ">= 2.14.0"
    }
  }
}

provider "port-labs" {
    # Configuration options
    # client_id = "{YOUR CLIENT ID}"     # or set the environment variable PORT_CLIENT_ID
    # secret    = "{YOUR CLIENT SECRET}" # or set the environment variable PORT_CLIENT_SECRET
    base_url  = "https://api.getport.io"
}

