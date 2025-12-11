output "cloudfront_app_url" {
  description = "CloudFront distribution URL for App"
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "cloudfront_app_custom_url" {
  description = "Custom domain URL for App"
  value       = "https://${local.web_custom_domain}"
}

output "s3_app_bucket_name" {
  description = "S3 bucket name for App"
  value       = aws_s3_bucket.app.bucket
}

output "cloudfront_app_distribution_id" {
  description = "CloudFront App distribution ID"
  value       = aws_cloudfront_distribution.app.id
}

