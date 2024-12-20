terraform {
    required_providers {
        port = {
            source  = "port-labs/port-labs"
            version = "~> 2.0.3"
        }
    }
}

provider "port" {
    # client_id = "{YOUR CLIENT ID}"     # or set the environment variable PORT_CLIENT_ID
    # secret    = "{YOUR CLIENT SECRET}" # or set the environment variable PORT_CLIENT_SECRET
    base_url  = "https://api.getport.io"
}
