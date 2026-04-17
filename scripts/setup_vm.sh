#!/bin/bash
# scripts/setup_vm.sh
# Comprehensive bootstrap script for SQAuto production VM.

set -e

echo "[+] Starting SQAuto VM Bootstrap..."

# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Add Swap Space (2GB)
if [ ! -f /swapfile ]; then
    echo "[+] Creating 2GB Swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "[+] Swap setup complete."
else
    echo "[+] Swap file already exists."
fi

# 3. Install Docker
if ! [ -x "$(command -v docker)" ]; then
    echo "[+] Installing Docker and Docker Compose..."
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
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

# 4. Permissions
sudo usermod -aG docker $USER
echo "[!] User added to docker group. Please log out and back in for changes to take effect."

# 5. Project Directory
mkdir -p ~/SQAuto
cd ~/SQAuto

echo "[+] VM Bootstrap Finalized!"
echo "[+] Remaining Manual Steps:"
echo "    1. Add GitHub Secrets to your repository (VM_IP, VM_SSH_KEY, DOCKER_HUB_USERNAME, etc.)"
echo "    2. Push your code to main to trigger the first deployment."
