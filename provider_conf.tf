terraform {
  required_providers {
    port-labs = {
      source = "port-labs/port-labs"
      version = ">= 2.14.0"
    }
  }
}

variable "port_base_url" {
  type        = string
  description = "Port API base URL (e.g., https://api.getport.io or https://api.us.getport.io)"
  default     = "https://api.getport.io"
}

provider "port-labs" {
    # Configuration options
    # client_id = "{YOUR CLIENT ID}"     # or set the environment variable PORT_CLIENT_ID
    # secret    = "{YOUR CLIENT SECRET}" # or set the environment variable PORT_CLIENT_SECRET
    base_url  = var.port_base_url       # or set the environment variable TF_VAR_port_base_url
}

