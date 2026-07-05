#!/usr/bin/env bash
# scripts/vm_setup.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-time bootstrap script for the SQAuto Azure VM (Ubuntu 24.04).
# Run this ONCE after first SSH into the VM as the admin user.
#
# Usage:
#   ssh <user>@172.188.98.219
#   curl -fsSL https://raw.githubusercontent.com/<owner>/SQAuto/main/scripts/vm_setup.sh | bash
#
# Or copy and run manually:
#   bash scripts/vm_setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "═══════════════════════════════════════════════════════════"
echo "  SQAuto — VM Bootstrap (Ubuntu 24.04 / Azure)"
echo "═══════════════════════════════════════════════════════════"

# ─── 1. System update ─────────────────────────────────────────────────────────
echo "→ Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ─── 2. Install Docker (official repo) ────────────────────────────────────────
echo "→ Installing Docker Engine..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker without sudo
sudo usermod -aG docker "$USER"
newgrp docker || true

# ─── 3. Enable Docker on boot ─────────────────────────────────────────────────
sudo systemctl enable --now docker

# ─── 4. Clone the repo ────────────────────────────────────────────────────────
echo "→ Cloning SQAuto repository..."
if [ ! -d ~/SQAuto ]; then
  git clone https://github.com/"$(git config --global user.name || echo '<YOUR_GITHUB_OWNER>')"/SQAuto.git ~/SQAuto
fi

# ─── 5. Create .env from example ─────────────────────────────────────────────
echo "→ Creating .env..."
cd ~/SQAuto
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit ~/SQAuto/.env with your real values before starting!"
  echo "   nano ~/SQAuto/.env"
fi

# ─── 6. Open firewall ports (Azure NSG must also allow these) ─────────────────
echo "→ Configuring UFW..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (future)
sudo ufw --force enable

# ─── 7. (Optional) Install certbot for Let's Encrypt TLS ─────────────────────
# Uncomment when a domain is pointed at this VM:
# sudo apt-get install -y certbot
# sudo certbot certonly --standalone -d sqauto.zeraynce.com

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  VM bootstrap complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit ~/SQAuto/.env  (fill in real secrets)"
echo "  2. Add GitHub Actions secrets to your repo:"
echo "     VM_HOST       = 172.188.98.219"
echo "     VM_USER       = <your_ssh_user>"
echo "     VM_SSH_KEY    = <base64-encoded private key or raw PEM>"
echo "     NEXT_PUBLIC_API_URL = http://172.188.98.219/api"
echo ""
echo "  3. Push to main → CI will build & deploy automatically."
echo "═══════════════════════════════════════════════════════════"
