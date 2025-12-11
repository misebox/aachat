output "cloudfront_ui_url" {
  description = "CloudFront distribution URL for UI"
  value       = "https://${aws_cloudfront_distribution.ui.domain_name}"
}

output "cloudfront_ui_custom_url" {
  description = "Custom domain URL for UI"
  value       = "https://${local.web_custom_domain}"
}

output "s3_ui_bucket_name" {
  description = "S3 bucket name for UI"
  value       = aws_s3_bucket.ui.bucket
}

output "cloudfront_ui_distribution_id" {
  description = "CloudFront UI distribution ID"
  value       = aws_cloudfront_distribution.ui.id
}

