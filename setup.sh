#!/usr/bin/env bash
# =============================================================================
# Dexaview – Project Setup Script
# =============================================================================
# This script extracts the zip, installs all dependencies, copies the
# environment template files, and prints the next steps.
#
# Usage (run this single command in your terminal from the folder containing
# the dexaview.zip file):
#
#   bash setup.sh
#
# Requirements: bash, unzip, node (v18+), npm, python3 (3.11+), pip
# =============================================================================

set -e  # Stop immediately if any command fails

# --- Colours for readable output -------------------------------------------
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[setup]${RESET} $1"; }
ok()   { echo -e "${GREEN}[done]${RESET}  $1"; }
warn() { echo -e "${YELLOW}[warn]${RESET}  $1"; }
fail() { echo -e "${RED}[error]${RESET} $1"; exit 1; }

echo ""
echo -e "${CYAN}============================================================${RESET}"
echo -e "${CYAN}   Dexaview – Industrial Metaverse – Project Setup          ${RESET}"
echo -e "${CYAN}============================================================${RESET}"
echo ""

# ---------------------------------------------------------------------------
# Step 1 – Extract the zip
# ---------------------------------------------------------------------------
log "Extracting dexaview.zip ..."

[ -f "dexaview.zip" ] || fail "dexaview.zip not found in the current directory. Make sure you run this script from the same folder as the zip file."

unzip -q -o dexaview.zip
ok "Extracted to ./dexaview/"

# ---------------------------------------------------------------------------
# Step 2 – Remove any artefact folders left by the zip tool
# ---------------------------------------------------------------------------
# Clean up any empty placeholder directories that zip may have created
find ./dexaview -type d -name '{frontend' -exec rm -rf {} + 2>/dev/null || true
find ./dexaview -type d -empty -name '*,*' -exec rm -rf {} + 2>/dev/null || true

# ---------------------------------------------------------------------------
# Step 3 – Frontend dependencies
# ---------------------------------------------------------------------------
log "Installing frontend dependencies (npm install) ..."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Download it from https://nodejs.org (v18 or later required)."
command -v npm  >/dev/null 2>&1 || fail "npm is not installed. It comes bundled with Node.js."

cd dexaview/frontend
npm install --silent
ok "Frontend dependencies installed."
cd ../..

# ---------------------------------------------------------------------------
# Step 4 – Backend virtual environment and dependencies
# ---------------------------------------------------------------------------
log "Setting up Python virtual environment ..."

command -v python3 >/dev/null 2>&1 || fail "Python 3 is not installed. Download it from https://python.org (v3.11 or later required)."

cd dexaview/backend
python3 -m venv .venv

# Activate and install
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
ok "Backend Python dependencies installed."
deactivate
cd ../..

# ---------------------------------------------------------------------------
# Step 5 – Copy .env.example → .env (only if .env doesn't already exist)
# ---------------------------------------------------------------------------
log "Creating .env files from templates ..."

if [ ! -f "dexaview/frontend/.env" ]; then
    cp dexaview/frontend/.env.example dexaview/frontend/.env
    ok "Created dexaview/frontend/.env"
else
    warn "dexaview/frontend/.env already exists – skipped (your values are preserved)."
fi

if [ ! -f "dexaview/backend/.env" ]; then
    cp dexaview/backend/.env.example dexaview/backend/.env
    ok "Created dexaview/backend/.env"
else
    warn "dexaview/backend/.env already exists – skipped (your values are preserved)."
fi

# ---------------------------------------------------------------------------
# Step 6 – Create required placeholder directories
# ---------------------------------------------------------------------------
log "Creating asset placeholder directories ..."
mkdir -p dexaview/frontend/public/assets
mkdir -p dexaview/frontend/public/draco
ok "Placeholder directories created."

# ---------------------------------------------------------------------------
# Step 7 – Print final instructions
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================${RESET}"
echo -e "${GREEN}   Setup complete! Follow the steps below to start.         ${RESET}"
echo -e "${GREEN}============================================================${RESET}"
echo ""
echo -e "${YELLOW}REQUIRED: Fill in your API keys before starting the servers${RESET}"
echo ""
echo "  1. Open  dexaview/frontend/.env  and set:"
echo "       VITE_OPENAI_API_KEY=sk-your-openai-key-here"
echo ""
echo "  2. Open  dexaview/backend/.env   and set:"
echo "       DATABASE_URL=mysql+aiomysql://user:password@localhost:3306/dexaview"
echo "       SECRET_KEY=run: python3 -c \"import secrets; print(secrets.token_hex(32))\""
echo ""
echo "  3. Create the MySQL database:"
echo "       mysql -u root -p -e \"CREATE DATABASE dexaview CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
echo ""
echo -e "${CYAN}START THE BACKEND (Terminal 1):${RESET}"
echo "       cd dexaview/backend"
echo "       source .venv/bin/activate          # Mac/Linux"
echo "       .venv\\Scripts\\activate             # Windows"
echo "       uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo -e "${CYAN}START THE FRONTEND (Terminal 2):${RESET}"
echo "       cd dexaview/frontend"
echo "       npm run dev"
echo ""
echo -e "${CYAN}OPEN IN BROWSER:${RESET}"
echo "       Frontend:  http://localhost:5173"
echo "       API docs:  http://localhost:8000/docs"
echo ""
echo -e "${CYAN}RUN THE TEST SUITE:${RESET}"
echo "       cd dexaview/backend"
echo "       source .venv/bin/activate"
echo "       pytest tests/ -v"
echo ""
echo -e "${GREEN}Dexaview is ready to build. Good luck!${RESET}"
echo ""
