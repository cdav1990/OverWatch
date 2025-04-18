# Backend Services README

## Overview

This directory contains the documentation and implementation details for the various backend microservices that make up the OverWatch Mission Control system (excluding the API Gateway and ROS Bridge, which have their own directories).

These services handle specific domain responsibilities like hardware interaction, data processing, mission management, etc.

## Service Structure

This directory should contain subdirectories for each individual microservice, for example:

```
services/
├── sensor-services/
│   ├── README.md
│   └── StepByStepGuide.md
├── slam-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── mission-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── data-storage-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── hpc-interface-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── pilot-controller-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── imaging-tech-controller-service/
│   ├── README.md
│   └── StepByStepGuide.md
├── post-processing-service/
│   ├── README.md
│   └── StepByStepGuide.md
└── README.md  (This file)
```

Each service subdirectory should contain:
- A `README.md` describing the service's purpose, responsibilities, APIs (if any), and dependencies.
- A `StepByStepGuide.md` outlining the implementation tasks for that specific service.

## Core Documentation

- **[Backend Architecture](../../02-CoreArchitecture/02-BackendArchitecture.md)**: Provides the high-level design and context for all backend services.
- **[ROS Integration ../ros-integration/](./../ros-integration/)**: Contains details on ROS communication patterns used by many services.

## Next Steps

1. Create subdirectories for each required microservice based on the Backend Architecture.
2. Populate each subdirectory with a specific `README.md` and `StepByStepGuide.md`.
3. Follow the tasks outlined in the individual service guides to implement each microservice. 