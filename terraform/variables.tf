variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance Type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "AWS Key Pair Name for SSH access"
  type        = string
  default     = "traveny-ec2-key"
}

variable "environment" {
  description = "Deployment Environment"
  type        = string
  default     = "production"
}
