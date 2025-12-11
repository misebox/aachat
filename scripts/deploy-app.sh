#!/bin/bash
set -e

# Deploy App to S3 and invalidate CloudFront cache
# Prerequisites: AWS CLI configured, App built

# Check required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "Error: AWS_ACCESS_KEY_ID is not set"
  exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "Error: AWS_SECRET_ACCESS_KEY is not set"
  exit 1
fi

# Configuration
AWS_REGION=${AWS_REGION}
S3_BUCKET_APP=${S3_BUCKET_APP}
CLOUDFRONT_DISTRIBUTION_APP=${CLOUDFRONT_DISTRIBUTION_APP}

echo "=========================================="
echo "Deploying App to S3 and CloudFront"
echo "=========================================="
echo "Region: $AWS_REGION"
echo "S3 Bucket: $S3_BUCKET_APP"
echo "CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_APP"
echo "=========================================="

# Step 1: Build App
echo ""
echo "Step 1: Building App..."
cd "$(dirname "$0")/../app"
bun run build

# Step 2: Sync to S3
echo ""
echo "Step 2: Uploading to S3..."
aws s3 sync dist/ s3://$S3_BUCKET_APP/ \
  --region $AWS_REGION \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# Upload HTML files with short cache
aws s3 sync dist/ s3://$S3_BUCKET_APP/ \
  --region $AWS_REGION \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=0, must-revalidate"

# Step 3: Invalidate CloudFront cache
echo ""
echo "Step 3: Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_APP \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation created: $INVALIDATION_ID"

# Wait for invalidation to complete
echo ""
echo "Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_APP \
  --id $INVALIDATION_ID

echo ""
echo "=========================================="
echo "APP deployment completed successfully!"
echo "=========================================="
echo "S3 Bucket: s3://$S3_BUCKET_APP"
echo "CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_APP"
echo ""
