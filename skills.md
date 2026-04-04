# Skills & Architecture Boundaries

This document defines the strict tech stack and boundaries for the GigAegis project.

## Frontend
- React
- Vite
- Tailwind CSS (for fast styling)
- PWA structure

## Backend
- Node.js
- Express.js

## Database
- None for MVP. We are using local JSON files (`honest_workers.json`, `fraud_syndicate.json`) for mock data ingestion.

## Rules
- Do not suggest complex DevOps, Docker, or external cloud databases.
- Keep the architecture lean, localized, and event-driven.
