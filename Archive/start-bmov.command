#!/bin/bash

# BMOV - BIM Model Optimizer and Viewer
# Single-click startup script for macOS
# Developed by Rishabh Gautam

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "🏗️  Starting NBIM - NaMo Bharat BIM Tool"
echo "👨‍💻 Developed by Rishabh Gautam"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Node.js and npm found"
echo "📦 Checking dependencies..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        echo "Press any key to exit..."
        read -n 1
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

echo "� Checking for running servers..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing servers..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 2

echo "🚀 Starting NBIM application..."
echo "📊 Mock server will start on http://localhost:4000"
echo "🌐 Development server will start on http://localhost:3000"
echo ""
echo "🔑 LOGIN CREDENTIALS:"
echo "   Admin:        username: admin@ncrtc.in        password: admin123"
echo "   Control Room: username: control@ncrtc.in     password: control123" 
echo "   Maintenance:  username: maintenance@ncrtc.in password: maint123"
echo "   Safety:       username: safety@ncrtc.in      password: safety123"
echo "   Viewer:       username: viewer@ncrtc.in      password: viewer123"
echo ""
echo "🔄 Starting both servers in parallel..."
echo "Press Ctrl+C to stop both servers"
echo ""

SESSION_MODE="fresh"
ROLE_PARAM=""

# Check if arguments are provided
if [ $# -gt 0 ]; then
    # Parse arguments
    for arg in "$@"; do
        case "$arg" in
            --keep-session|-k)
                SESSION_MODE="keep"
                ;;
            --fresh|-f)
                SESSION_MODE="fresh"
                ;;
            --role=*)
                ROLE_PARAM="${arg#*=}"
                ;;
        esac
    done
else
    # Interactive Menu with detailed debugging
    echo "========================================="
    echo "DEBUG: Entering interactive menu mode"
    echo "========================================="
    echo ""
    echo "----------------------------------------"
    echo "Select Session Mode:"
    echo "1) Fresh Session (Logout first) [Default]"
    echo "2) Keep Session"
    echo "----------------------------------------"
    read -p "Enter choice [1-2]: " session_choice
    
    echo ""
    echo "DEBUG: Raw input received: '$session_choice'"
    echo "DEBUG: Input length: ${#session_choice}"
    
    # Trim whitespace
    session_choice=$(echo "$session_choice" | tr -d '[:space:]')
    echo "DEBUG: After trim: '$session_choice'"
    
    if [ -z "$session_choice" ]; then
        session_choice="1"
        echo "DEBUG: Empty input, defaulting to: '$session_choice'"
    fi
    
    case "$session_choice" in
        "2") 
            SESSION_MODE="keep"
            echo "DEBUG: Case matched '2' -> keep"
            ;;
        "1")
            SESSION_MODE="fresh"
            echo "DEBUG: Case matched '1' -> fresh"
            ;;
        *)
            SESSION_MODE="fresh"
            echo "DEBUG: Case matched default -> fresh"
            ;;
    esac
    
    echo "✅ Session mode set to: $SESSION_MODE"
    echo ""
    echo "----------------------------------------"
    echo "Select Role to Auto-login:"
    echo "1) None (Manual Login) [Default]"
    echo "2) Admin"
    echo "3) Control Room"
    echo "4) Viewer"
    echo "5) Maintenance"
    echo "6) Safety"
    echo "----------------------------------------"
    read -p "Enter choice [1-6]: " role_choice
    
    echo ""
    echo "DEBUG: Raw input received: '$role_choice'"
    echo "DEBUG: Input length: ${#role_choice}"
    
    # Trim whitespace
    role_choice=$(echo "$role_choice" | tr -d '[:space:]')
    echo "DEBUG: After trim: '$role_choice'"
    
    if [ -z "$role_choice" ]; then
        role_choice="1"
        echo "DEBUG: Empty input, defaulting to: '$role_choice'"
    fi
    
    case "$role_choice" in
        "2") 
            ROLE_PARAM="admin"
            echo "DEBUG: Case matched '2' -> admin"
            ;;
        "3") 
            ROLE_PARAM="control"
            echo "DEBUG: Case matched '3' -> control"
            ;;
        "4") 
            ROLE_PARAM="viewer"
            echo "DEBUG: Case matched '4' -> viewer"
            ;;
        "5") 
            ROLE_PARAM="maintenance"
            echo "DEBUG: Case matched '5' -> maintenance"
            ;;
        "6") 
            ROLE_PARAM="safety"
            echo "DEBUG: Case matched '6' -> safety"
            ;;
        "1")
            ROLE_PARAM=""
            echo "DEBUG: Case matched '1' -> none (manual login)"
            ;;
        *)
            ROLE_PARAM=""
            echo "DEBUG: Case matched default -> none (manual login)"
            ;;
    esac
    
    echo ""
    if [ -n "$ROLE_PARAM" ]; then
        echo "✅ Auto-login role set to: $ROLE_PARAM"
    else
        echo "✅ Auto-login: None (Manual login required)"
    fi
    echo ""
fi

echo "========================================="
echo "FINAL CONFIGURATION:"
echo "  SESSION_MODE: $SESSION_MODE"
echo "  ROLE_PARAM: ${ROLE_PARAM:-<none>}"
echo "========================================="
echo ""

# Start both mock server and dev server in parallel
npm run dev:full &

# Wait for servers to start
echo "⏳ Waiting for servers to start..."
sleep 5

# Check if servers are running and open browser
echo "========================================="
echo "CONSTRUCTING URL:"
echo "  SESSION_MODE = '$SESSION_MODE'"
echo "  ROLE_PARAM = '${ROLE_PARAM:-<empty>}'"
echo "  ROLE_PARAM length: ${#ROLE_PARAM}"
echo "  ROLE_PARAM is empty: $([ -z "$ROLE_PARAM" ] && echo 'YES' || echo 'NO')"
echo "========================================="

if [ "$SESSION_MODE" = "fresh" ]; then
    echo "🌐 Opening browser with fresh session..."
    if [ -n "$ROLE_PARAM" ]; then
        OPEN_URL="http://localhost:3000/?clearSession=true&autoLogin=$ROLE_PARAM"
        echo "DEBUG: URL with clearSession AND autoLogin=$ROLE_PARAM"
    else
        OPEN_URL="http://localhost:3000/?clearSession=true&forceLogin=true"
        echo "DEBUG: URL with clearSession AND forceLogin (no auto-login)"
    fi
else
    echo "🌐 Opening browser preserving session..."
    if [ -n "$ROLE_PARAM" ]; then
        OPEN_URL="http://localhost:3000/?autoLogin=$ROLE_PARAM"
        echo "DEBUG: URL with ONLY autoLogin=$ROLE_PARAM"
    else
        OPEN_URL="http://localhost:3000/"
        echo "DEBUG: URL with NO parameters"
    fi
fi

echo "========================================="
echo "FINAL URL TO OPEN:"
echo "  $OPEN_URL"
echo "========================================="
echo ""

# Add a confirmation step (skip for automated testing)
if [ -t 0 ]; then
    echo "Press ENTER to open browser with this URL, or Ctrl+C to cancel..."
    read -r
else
    echo "Automated mode - opening browser automatically..."
fi

if command -v open >/dev/null 2>&1; then
    # macOS
    open "$OPEN_URL"
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "$OPEN_URL"
elif command -v start >/dev/null 2>&1; then
    # Windows
    start "$OPEN_URL"
else
    echo "📋 Please open: $OPEN_URL"
fi

# Wait for background job to finish
wait

echo ""
echo "👋 BMOV application has been stopped"
echo "Press any key to close this window..."
read -n 1