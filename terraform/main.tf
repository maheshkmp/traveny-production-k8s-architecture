terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Fetch latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 2. VPC & Networking Infrastructure
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "traveny-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name        = "traveny-public-subnet"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "traveny-igw"
    Environment = var.environment
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "traveny-public-route-table"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 3. Key Pair (Auto-upload local SSH public key)
resource "aws_key_pair" "deployer" {
  key_name   = "traveny-${var.environment}-key"
  public_key = file(var.ssh_public_key_path)
}

# 4. Security Group (Firewall Rules)
resource "aws_security_group" "k3s_sg" {
  name        = "traveny-k3s-sg"
  description = "Security group for Traveny K3s Cluster & Monitoring"
  vpc_id      = aws_vpc.main.id

  # SSH Access (Restricted to your IP if provided)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.my_ip != "0.0.0.0/0" && var.my_ip != "" ? [var.my_ip] : ["0.0.0.0/0"]
  }

  # HTTP Web Traffic (Public)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS Web Traffic (Public)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Grafana Dashboard Access (Restricted to your IP if provided)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.my_ip != "0.0.0.0/0" && var.my_ip != "" ? [var.my_ip] : ["0.0.0.0/0"]
  }

  # Outbound All Traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "traveny-k3s-sg-${var.environment}"
  }
}

# 5. EC2 Instance Definition
resource "aws_instance" "k3s_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.k3s_sg.id]

  user_data = file("${path.module}/scripts/user_data.sh")

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name        = "traveny-k3s-server"
    Environment = var.environment
  }
}

# 4. Elastic IP (Static Public IP for Server)
resource "aws_eip" "k3s_eip" {
  instance = aws_instance.k3s_server.id
  domain   = "vpc"

  tags = {
    Name = "traveny-static-ip"
  }
}
