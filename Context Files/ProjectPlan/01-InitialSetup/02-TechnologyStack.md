# OverWatch Mission Control - Technology Stack

This document outlines the specific technology stack chosen for the OverWatch Mission Control project, based on the requirements detailed in `01-ProjectRequirements.md` and the `BigPictureProjectOverview.md`.

## Frontend Technologies

### Core Framework

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **React** | 18.x | Industry standard, component model fits UI needs, concurrent features aid responsiveness with real-time data. | Building the entire OverWatch UI, Mission Planning, Control Panels. |
| **TypeScript** | 5.x | Essential for managing complexity, type safety across components, state, and API interactions. | Ensuring type safety throughout the frontend codebase. |
| **Vite** | 4.x | Extremely fast development server and optimized builds crucial for iterative development. | Frontend build tooling and development server. |

### UI Components & Styling

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **gecko-ui** | Internal (Git Repo) | **REQUIRED:** Gecko Robotics internal component library. Ensures consistency with other internal applications and utilizes established UI patterns. | Primary source for core UI elements (buttons, inputs, tables, layout components, etc.). |
| **Figma-Style-Dictionary** | Internal | **REQUIRED:** Contains official Gecko Robotics design tokens (colors, typography, spacing) exported from Figma. Ensures brand consistency. | Generating theme variables (CSS vars, JS objects) to be consumed by `gecko-ui`'s theming system. |

### State Management

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **Zustand** | 4.x | Simple, lightweight global state management for UI state (e.g., active tools, panel visibility). | Managing client-side UI state. |
| **TanStack Query** | 4.x | Efficient server state management for fetching mission data, user settings, etc., from the API Gateway. | Handling data fetching, caching, and synchronization with the backend API. |

### 3D Visualization

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **Cesium** | 1.x | Best-in-class for global geographic context, terrain, and displaying mission areas on a globe. | GeoPage for initial mission area selection and global context display. |
| **Babylon.js** | 0.150.x+ | Leading library for detailed, custom 3D rendering required for local mission view, drone models, paths, frustums, and defect overlays. | Rendering the local 3D mission environment, drone, paths, sensor visualizations. |
| **Web Workers** | Browser API | Critical for offloading heavy Babylon.js rendering to prevent blocking the main UI thread, ensuring responsiveness. | Running the Babylon.js rendering loop in a separate thread. |

### ROS Communication

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **roslibjs** | 1.3.x | Standard library for WebSocket communication with `rosbridge_server`. | Connecting the frontend to the ROS ecosystem via the ROS Bridge service. |

## Backend Technologies

### Core Platform

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **Python** | 3.10+ | Dominant language in robotics/CV/AI with excellent libraries (OpenCV, PyTorch, ROS clients). | Implementing all backend microservices. |
| **ROS** | Noetic / ROS2 Humble | Essential robotics middleware for hardware abstraction, communication (topics/services), and integrating components like MAVROS, sensor drivers. | Core communication backbone for hardware interaction and data flow. |

### API & Services

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **FastAPI** | 0.95+ | High-performance framework ideal for the API Gateway, providing async support and automatic docs. | Building the API Gateway service. |
| **gRPC** | 1.50+ | Efficient binary protocol potentially used for high-throughput communication between specific backend services (e.g., to/from HPC). | Optional: Inter-service communication where REST/ROS is insufficient. |
| **rosbridge_suite** | 0.11+ | Standard package providing the WebSocket-to-ROS interface needed for frontend communication. | The core of the ROS Bridge service. |

### Data Storage

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **PostgreSQL** | 15.x | Robust relational storage for structured data like mission definitions, user accounts, configuration. PostGIS for potential spatial queries. | Storing mission plans, user data, system configuration. |
| **MongoDB** | 6.x | Suitable for less structured or rapidly evolving data like telemetry logs or potentially AI model outputs. | Optional: Storing flexible log data or intermediate processing results. |
| **Redis** | 7.x | High-speed cache or potentially for transient real-time state synchronization if needed. | Caching frequently accessed data, potential messaging queue. |
| **Local NAS** | High Capacity (TB+) | Essential for storing vast amounts of raw sensor data (images, LiDAR) reliably on-site via 10GbE. | Primary storage for raw images and LiDAR point clouds during operation. |

### Hardware Integration & Edge Compute

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **MAVROS** | Latest | Standard ROS package for MAVLink communication with PX4/ArduPilot flight controllers. | Interfacing with the drone's flight controller. |
| **NVIDIA Jetson AGX Xavier (64GB)** | N/A | Powerful edge compute platform capable of running real-time CV/AI inference and managing sensors onboard the drone. | On-drone computer for edge AI, sensor management, data relay. |
| **Hardware SDKs** | Vendor Specific | Necessary for direct, low-level control and data acquisition from Phase One, Ouster, Sony cameras. | Interfacing directly with high-end sensors in Sensor Services. |

### On-Site HPC & AI

| Technology | Class | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **On-Site Server** | Threadripper/EPYC, 1-2TB RAM, Multi-GPU | Required computational power for near real-time photogrammetry and advanced AI defect detection on high-res data. | Running photogrammetry (Gaussian Splatting), AI defect detection models. |
| **NVIDIA GPUs** | RTX 6000 Ada / HGX | High-end GPUs needed for accelerating photogrammetry and deep learning inference. | Powering computation on the HPC server. |
| **PyTorch / TensorFlow** | Latest | Standard deep learning frameworks for running AI models. | Executing defect detection models. |
| **CV Libraries (OpenCV, CV-CUDA)** | Latest | Essential libraries for image processing and accelerating CV tasks on GPUs. | Image preprocessing, feature detection, supporting AI models. |
| **Photogrammetry Software** | e.g., RealityCapture / Agisoft Metashape / COLMAP / Custom (Gaussian Splatting) | Software to perform 3D reconstruction from images. Gaussian Splatting specifically mentioned for speed. | Generating the 3D model from images/LiDAR. |
| **3D Data Frameworks** | e.g., NVIDIA fVDB | Potential frameworks for efficiently handling and processing large-scale 3D point clouds/meshes on GPUs. | Enabling AI analysis directly on the 3D model/point cloud. |

## DevOps & Infrastructure

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **Docker** | Latest | Containerization for consistent environments across development, HPC, and potential deployment. | Packaging all backend services and potentially frontend for deployment. |
| **Kubernetes (Optional)** | Latest | Potential for orchestrating backend services if deployed to cloud or complex on-premise cluster. May be overkill for single on-site server. | Optional: Orchestrating backend microservices. |
| **GitHub Actions** | N/A | CI/CD automation integrated with source control. | Automating builds, tests, and potentially deployments. |
| **Prometheus + Grafana** | Latest | Open-source standard for metrics collection and visualization. | Monitoring system health, performance, and resource usage. |
| **Rugged 10GbE Switch / Wi-Fi 6E AP** | N/A | Necessary network hardware for high-bandwidth tethered communication and local wireless connectivity. | Core networking infrastructure on-site. |

## Development Tools

| Technology | Version | Justification | Specific Use Case |
|------------|---------|---------------|-------------------|
| **ESLint + Prettier** | Latest | Enforcing code style and quality for frontend TypeScript/React code. | Frontend code linting/formatting. |
| **Black + isort + Flake8** | Latest | Enforcing code style and quality for backend Python code. | Backend code linting/formatting. |
| **Jest + React Testing Library** | Latest | Unit/integration testing framework for React components. | Frontend testing. |
| **Pytest** | Latest | Flexible and powerful testing framework for Python backend services. | Backend testing. |
| **Style Dictionary CLI** | Latest | Tool required to build/export design tokens from `Figma-Style-Dictionary`. | Building theme variables from the design token repository. |

## Summary

This technology stack is selected to meet the demanding requirements of high-resolution, real-time drone inspection. It balances industry standards (React, Python, ROS, Docker) with cutting-edge technologies (Jetson, On-Site HPC, Gaussian Splatting, Advanced AI/CV) needed to achieve the project's specific goals like <1mm GSD and live defect detection.

## Dependency Overview

This section outlines the primary dependencies between different components of the OverWatch system.

### Frontend Dependencies

-   **UI Components (e.g., MissionPlanner, TelemetryDisplay)** depend on:
    -   State Management (Zustand for UI state, TanStack Query for server state)
    -   Backend API Gateway (via TanStack Query) for mission data, etc.
    -   `roslibjs` for real-time data (e.g., telemetry, status) via ROS Bridge.
-   **3D Visualization (Cesium/Babylon.js)** depends on:
    -   Backend API Gateway for loading models, mission data.
    -   Potentially `roslibjs` for visualizing real-time drone pose, sensor data.

### Backend Dependencies

-   **API Gateway (FastAPI)** depends on:
    -   Database (PostgreSQL) for mission/user data.
    -   Other backend services (e.g., Mission Service, Sensor Service) via internal APIs (REST/gRPC).
-   **ROS Bridge (rosbridge_suite)** depends on:
    -   ROS Core (Noetic/Humble).
-   **Mission Service (Python)** depends on:
    -   Database (PostgreSQL).
    -   Potentially ROS for interacting with drone/path planning nodes.
-   **Sensor Services (Python)** depend on:
    -   Hardware SDKs.
    -   ROS for publishing sensor data.
    -   Potentially On-Site HPC for offloading processing.
    -   Local NAS for storing raw data.
-   **HPC Services (Python/AI Frameworks)** depend on:
    -   Data from Sensor Services or NAS.
    -   CV Libraries, AI Frameworks.
    -   Potentially Database for results.

### Cross-Cutting Dependencies

-   **All Backend Services (potentially):**
    -   Docker for containerization.
    -   Monitoring (Prometheus) via client libraries.
    -   Configuration Management.
-   **Frontend & Backend:**
    -   Networking Infrastructure (Switches, APs).
    -   CI/CD (GitHub Actions).

*Note: This is an initial overview and will be refined as the architecture matures.* 