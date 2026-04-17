#!/bin/bash
# scripts/setup_vm.sh
# This script sets up an Azure Ubuntu VM for the SQAuto application.

set -e

echo "[+] Starting VM Setup for SQAuto..."

# 1. Update and install basic dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 2. Install Docker
if ! [ -x "$(command -v docker)" ]; then
    echo "[+] Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo "[+] Docker is already installed."
fi

# 3. Add current user to docker group
sudo usermod -aG docker $USER
echo "[!] You may need to log out and back in for docker group changes to take effect."

# 4. Create project directory
mkdir -p ~/sqauto
cd ~/sqauto

# 5. Setup basic .env placeholder
if [ ! -f .env ]; then
    echo "[+] Creating .env placeholder..."
    touch .env
    echo "DATABASE_URL=placeholder" >> .env
    echo "API_PORT=8000" >> .env
    echo "WEB_PORT=3000" >> .env
fi

echo "[+] VM Setup Complete!"
echo "[+] Next steps:"
echo "    1. Open port 3000 and 8000 in your Azure Portal (NSG settings)."
echo "    2. Configure your GitHub Secrets (VM_IP, VM_SSH_KEY, DOCKER_HUB_USER)."
