# Backend Services - Step by Step Guide (Overall)

This document provides a high-level overview of the sequence for implementing the individual backend microservices. Detailed task lists reside within each service's subdirectory.

Use the status markers to track the overall progress of each service implementation:
- `{ }` - Not Started
- `{IP}` - In Progress
- `{X}` - Complete

## Implementation Sequence for Services

*Note: Some services can be developed in parallel, but dependencies should be considered. Follow the main [Implementation Guide](../../01-InitialSetup/01-Implementation-Guide.md) for precise sequencing.* 

### Foundational Services

1.  `{ }` **Authentication Service** (Implicit or Explicit)
    -   Needed early for securing other services and APIs.
    -   *Tasks defined within its own guide if created, or as part of API Gateway/ROS Bridge.* 

2.  `{ }` **Data Storage Service**
    -   Handles persistence for missions, sensor data, etc.
    -   Often needed by multiple other services.
    -   Refer to `data-storage-service/StepByStepGuide.md`

### Core Hardware/ROS Interaction

3.  `{ }` **Pilot Controller Service**
    -   Core MAVLink/MAVROS communication.
    -   Handles basic telemetry and drone control.
    -   Refer to `pilot-controller-service/StepByStepGuide.md`

4.  `{ }` **Sensor Services** (Can be parallelized per sensor)
    -   Interfaces with specific hardware SDKs (PhaseOne, Ouster, Sony).
    -   Publishes raw data to ROS.
    -   Refer to `sensor-services/StepByStepGuide.md` (or individual sensor guides)

5.  `{ }` **Imaging Tech Controller Service**
    -   Camera and gimbal control logic.
    -   Depends on Pilot Controller and Sensor Services.
    -   Refer to `imaging-tech-controller-service/StepByStepGuide.md`

### Processing and Mission Logic

6.  `{ }` **Mission Service**
    -   Manages mission planning, execution state, and commands.
    -   Depends on Pilot Controller, Data Storage.
    -   Refer to `mission-service/StepByStepGuide.md`

7.  `{ }` **SLAM Service**
    -   Integrates SLAM algorithm (e.g., FAST-LIVO2).
    -   Consumes sensor data, publishes pose/map data.
    -   Refer to `slam-service/StepByStepGuide.md`

8.  `{ }` **HPC Interface Service**
    -   Routes data to/from HPC for heavy processing.
    -   May use gRPC or other protocols.
    -   Refer to `hpc-interface-service/StepByStepGuide.md`

9.  `{ }` **Post-Processing Service**
    -   Handles offline processing tasks (high-res models, reports).
    -   Depends on Data Storage and potentially HPC Interface.
    -   Refer to `post-processing-service/StepByStepGuide.md`

## General Service Tasks (Apply to each service)

*These should be detailed within each service's StepByStepGuide.*

-   **Service Setup:** Initialize project, dependencies, basic structure.
-   **Core Logic:** Implement primary functionality.
-   **API/Interface:** Define internal/external APIs (ROS Topics/Services, gRPC, REST if applicable).
-   **Configuration:** Implement environment variable handling.
-   **Testing:** Unit and integration tests.
-   **Containerization:** Create Dockerfile.
-   **Logging/Monitoring:** Implement observability.

## Progress Tracking (Overall Services)

| Service | Status | Notes |
|---------|--------|-------|
| Authentication Service | `{ }` | Implicit/Explicit |
| Data Storage Service | `{ }` | |
| Pilot Controller Service | `{ }` | |
| Sensor Services | `{ }` | |
| Imaging Tech Controller Service | `{ }` | |
| Mission Service | `{ }` | |
| SLAM Service | `{ }` | |
| HPC Interface Service | `{ }` | |
| Post-Processing Service | `{ }` | |

## Next Steps

1.  Create the subdirectories and specific `README.md` / `StepByStepGuide.md` files for each service listed above.
2.  Begin implementing services based on priority and dependencies, following their respective step-by-step guides. 