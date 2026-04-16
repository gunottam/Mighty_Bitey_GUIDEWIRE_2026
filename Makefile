# ============================================
# GigAegis — Project Makefile
# One-command setup for hackathon judges
# ============================================

.PHONY: install dev backend frontend test validate clean

# ── Install all dependencies ───────────────
install:
	@echo "🛡️  GigAegis — Installing dependencies..."
	@cd backend && npm install --silent
	@cd gigaegis-frontend && npm install --silent
	@echo "✅ All dependencies installed."
	@echo ""
	@echo "Next steps:"
	@echo "  1. cp backend/.env.example backend/.env"
	@echo "  2. make dev"

# ── Start both servers (requires two terminals) ──
dev:
	@echo "🚀 Starting GigAegis..."
	@echo "   Backend:  http://localhost:3000"
	@echo "   Frontend: http://localhost:5173"
	@echo ""
	@echo "Run in separate terminals:"
	@echo "   make backend"
	@echo "   make frontend"

# ── Backend only ───────────────────────────
backend:
	@cd backend && node index.js

# ── Frontend only ──────────────────────────
frontend:
	@cd gigaegis-frontend && npm run dev

# ── Run integration tests ──────────────────
test:
	@echo "🧪 Running 12-test integration suite..."
	@cd backend && node index.js &
	@sleep 3
	@node test_chaos.js
	@kill %1 2>/dev/null || true

# ── Run ML validation engine ──────────────
validate:
	@echo "🔬 Running ML Validation Engine (6 tasks)..."
	@cd backend && node -e "require('./ml/validation').runFullValidation()"

# ── Build frontend for production ──────────
build:
	@cd gigaegis-frontend && npm run build

# ── Clean all build artifacts ──────────────
clean:
	@rm -rf gigaegis-frontend/dist
	@rm -rf backend/node_modules gigaegis-frontend/node_modules
	@echo "🧹 Cleaned."
