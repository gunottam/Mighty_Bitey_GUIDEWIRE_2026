# GigAegis: Parametric Income Protection for the Indian Gig Economy 🚀

**Guidewire DEVTrails 2026 Hackathon** | **Team: Mighty Bytey**

> Secure the earning power of India's delivery partners against catastrophic urban weather events. Zero paperwork. Instant liquidity. Complete transparency.

---

## 🌪️ The Problem Statement

In hyper-dense Indian metropolises, **Zomato Food Delivery Partners** face a highly volatile operational environment. Every monsoon season, severe **urban flooding and waterlogging** paralyzes entire city sections, rendering deliveries physically impossible. For daily-wage gig workers, a day off the road isn't just an inconvenience; it represents a direct threat to their livelihood and financial stability. Traditional insurance products are fundamentally ill-equipped to handle this—they are heavily biased toward health, vehicle damage, or accidents, and are burdened by slow, manual claims processing that gig workers simply cannot afford to wait on.

**GigAegis** bridges this critical protection gap. We focus on exactly one thing: **Loss of Income**. 

## 🛡️ The GigAegis Solution

GigAegis is an automated, parametric micro-insurance platform engineered specifically to protect the daily earnings of Zomato delivery partners during extreme weather events. When the water rises and the wheels stop, GigAegis automatically triggers immediate liquidity.

### Defining Features
- **Strict Coverage Scope**: Purely focused on **Loss of Income ONLY**. We strictly do *not* cover health, vehicle damage, or accident liability. 
- **Parametric Trigger**: Payouts are entirely data-driven, activated automatically by verified external data sets (meteorological APIs and municipal reports) confirming severe urban flooding or waterlogging in the partner's designated operational zone. No adjusters. No claims filing. 
- **Financial Model**: A highly accessible **Weekly Premium** pricing structure tailored to the cashflow reality of Indian gig workers, seamlessly integrated into their weekly payout cycles.
- **Platform Architecture**: 
  - **Admin/Investor Dashboard**: A robust, enterprise-grade Web Platform providing real-time risk exposure monitoring, liquidity pool status, and granular geographic payout heatmaps.
  - **Worker Interface**: A lightweight, simulated mobile-responsive Progressive Web App (PWA) providing frictionless onboarding, real-time weather alerts, and transparent coverage status for the user on the ground.

## 🧠 AI/ML Tech Stack & Workflow

We leverage a modern, event-driven architecture heavily infused with machine learning to automate underwriting, dynamic pricing, and fully autonomous claims orchestration.

- **Data Orchestration & Ingestion**: High-throughput localized weather APIs mapped against high-resolution topographical data to predict and detect waterlogging with hyper-local precision.
- **Dynamic Pricing Engine**: Machine learning models evaluate localized monsoon risk patterns, historical zoning vulnerabilities, and live meteorological data to dynamically adjust weekly premiums per grid sector based on evolving risk exposure.
- **Automated Workflow Orchestration**: Smart contracts execute payouts instantly once a parametric threshold (e.g., >100mm rainfall in 3 hours + reported local flood index) is breached in an active working zone. Funds are deployed directly to the worker's wallet without manual approval.

---

## 🔐 Adversarial Defense & Anti-Spoofing Strategy (Market Crash Compliance)

Operating a parametric trigger model without manual adjusters exposes the liquidity pool to severe moral hazard. To address the strict **24-hour crisis requirement** and comprehensively **avoid regulatory fines**, GigAegis integrates a multi-layered adversarial defense mechanism. 

### 1. Edge-Level Telemetry
We establish a zero-trust environment directly on the worker's device. Our PWA and native wrappers heavily poll **Android `isMock()` APIs** to detect location tampering in real time. We actively deploy **Runtime Application Self-Protection (RASP)** to identify root-cloaking and catch basic app cloning.

### 2. Sensor Fusion (Physical Reality Check)
GPS coordinates alone mean nothing. We enforce a state of Physical Reality by fusing geospatial data with the device's internal **accelerometer and gyroscope**. By extracting the device's triaxial acceleration vectors, we mathematically derive physical velocity to cross-reference kinetic reality with GPS claims:

$$v = \int a \, dt$$

If the GPS telemetry indicates high-speed traversal through a flooded zone, but the accelerometer registers zero kinetic force (velocity is zero), the claim sequence is instantly flagged.

### 3. Network Analysis (Graph Neural Networks)
To detect coordinated flash-mob fraud (the 500-worker syndicate), we deploy advanced Graph Neural Networks (GNNs). We model incoming claims as connected nodes, identifying highly anomalous clusters sharing identical hardware IDs or Wi-Fi BSSIDs. To prioritize massive structural anomalies and isolate organized fraud rings, we evaluate data segments using a custom mathematical fitness function:

$$fitness = \frac{abs\_anom\_amt \times rel\_amt}{level^{1.2}}$$

Upon detecting this syndicate pattern, the relevant segment of the liquidity pool is instantly frozen.

### 4. UX Balance
Security must not punish honest workers experiencing genuine infrastructure failure. Flagged accounts are shifted into a **"Pending Verification"** state. They are prompted to submit a live photo of the extreme weather to unlock their payout. If the network collapses during the storm, their offline sensor telemetry is securely cached and cryptographically signed on the device, uploading automatically when the network restores.

---

*GigAegis. Automated resilience for the modern gig economy.*
# Mighty_Bytey_GUIDEWIRE_2026
