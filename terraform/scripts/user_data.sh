#!/bin/bash
set -e

# Update packages
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw

# Install K3s Kubernetes (with world-readable kubeconfig for non-root kubectl)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --tls-san $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)" sh -

# Configure kubeconfig for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown -R ubuntu:ubuntu /home/ubuntu/.kube
chmod 600 /home/ubuntu/.kube/config

# Add KUBECONFIG export to bashrc
echo "export KUBECONFIG=/home/ubuntu/.kube/config" >> /home/ubuntu/.bashrc

echo "✅ K3s Installation Complete!"
