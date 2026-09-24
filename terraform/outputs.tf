output "ec2_public_ip" {
  description = "Public Elastic IP of the Traveny EC2 Server"
  value       = aws_eip.k3s_eip.public_ip
}

output "ssh_command" {
  description = "Command to SSH into the EC2 server"
  value       = "ssh ubuntu@${aws_eip.k3s_eip.public_ip}"
}

output "grafana_url" {
  description = "URL to access Grafana Dashboard"
  value       = "http://${aws_eip.k3s_eip.public_ip}:3000"
}
