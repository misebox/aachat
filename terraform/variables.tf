variable "aws_access_key_id" {
  description = "AWS access key id"
  type        = string

  validation {
    condition     = length(var.aws_access_key_id) > 0
    error_message = "aws_access_key_id must not be empty"
  }
}

variable "aws_secret_access_key" {
  description = "AWS secret access key"
  type        = string

  validation {
    condition     = length(var.aws_secret_access_key) > 0
    error_message = "aws_secret_access_key must not be empty"
  }
}

variable "aws_region" {
  description = "Base custom domain"
  type        = string

  validation {
    condition     = length(var.aws_region) > 0
    error_message = "aws_region must not be empty"
  }
}

variable "web_custom_domain" {
  description = "Web custom domain"
  type        = string

  validation {
    condition     = length(var.web_custom_domain) > 0
    error_message = "web_custom_domain must not be empty"
  }
}

locals {
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  aws_region            = var.aws_region
  web_custom_domain     = var.web_custom_domain
}


