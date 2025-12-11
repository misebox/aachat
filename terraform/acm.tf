# ACM Certificate for CloudFront UI (must be in us-east-1)
resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = local.web_custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Output DNS validation records (manual configuration required)
output "acm_validation_records" {
  description = "DNS validation records for ACM certificate"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  }
}
