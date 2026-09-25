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

variable "my_ip" {
  description = "Your personal IP address for restricted firewall access (CIDR format e.g. 203.0.113.25/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_public_key_path" {
  description = "Path to your local SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
