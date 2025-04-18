# OverWatch System Overview

## Introduction

OverWatch is an advanced drone mission planning and execution platform designed for precision control of unmanned aerial vehicles (UAVs) in complex operational environments. The system enables users to plan, simulate, and execute sophisticated drone missions with a focus on industrial inspections, surveying, and monitoring operations.

## Core Capabilities

OverWatch provides an end-to-end solution for drone operations with the following key capabilities:

### 1. Geographic Planning

- Interactive map-based mission creation
- Custom area selection tools (point, rectangle, polygon)
- Geographic conversion between global and local coordinate systems
- Seamless transition from 2D maps to 3D operational views

### 2. Mission Planning Tools

- **Manual Grid Generator**: Creates systematic raster scan patterns over selected surfaces
- **2D Mission Generator**: Plans paths based on horizontally projected areas
- **3D Mission Generator**: Creates paths that follow 3D structures with precise standoff distances

### 3. Coordinate System Management

- Support for multiple coordinate reference frames:
  - Global WGS84 (latitude/longitude)
  - Local ENU (East-North-Up) for precise mission planning
  - Babylon.js scene coordinates for 3D visualization
- Takeoff-centric coordinate system for intuitive field operations
- Conversion utilities for seamless transitions between reference frames

### 4. 3D Visualization

- Detailed 3D scene rendering using Babylon.js
- Real-time mission simulation with drone movement
- Face selection for building and structure inspection
- Camera frustum visualization for image capture planning
- CAD-style controls for precise positioning and navigation

### 5. Hardware Integration

- PX4 flight controller compatibility
- Advanced camera control (gimbal pitch, photo/video modes)
- Real-time telemetry visualization
- MAVLink command implementation
- ROS (Robot Operating System) integration

### 6. Mission Execution

- Real-time mission monitoring
- Live drone position tracking
- Telemetry data visualization
- Mission parameter adjustments during flight
- Safety parameter management

## System Architecture

OverWatch employs a modular architecture with these key components:

### Front-End Components

1. **Dashboard**: System overview and mission status
2. **GeoPage**: Geographic mission planning with Cesium integration
3. **Mission Planning**: 3D environment for detailed mission design
4. **ROS Bridge**: Connection to drone systems via Robot Operating System
5. **Telemetry**: Real-time data visualization
6. **Controls**: Direct drone control interface

### Core Technologies

- **React**: Front-end UI framework
- **Babylon.js**: 3D visualization engine
- **Cesium**: Geographic mapping and visualization
- **TypeScript**: Type-safe programming language
- **ROSLIB**: ROS WebSocket integration
- **MAVLink**: Micro Air Vehicle communication protocol

## Workflow Overview

### 1. Mission Creation Workflow

1. **Geographic Area Selection** (GeoPage)
   - Select point, rectangle, or custom polygon on map
   - Define mission name and parameters
   - Create mission based on selected area

2. **Mission Setup**
   - System automatically sets takeoff point at selected location
   - Ground Control Points (GCPs) are initialized
   - 3D environment is loaded with reference points

3. **Detailed Mission Planning**
   - Select appropriate mission generator (Manual Grid, 2D, or 3D)
   - Configure mission parameters (altitude, overlap, etc.)
   - Generate and refine flight paths
   - Add inspection points and camera actions

4. **Simulation and Validation**
   - Run mission simulation in 3D environment
   - Verify flight paths and camera coverage
   - Identify and resolve potential issues
   - Optimize mission parameters

### 2. Field Operations Workflow

1. **Pre-flight Setup**
   - Position drone at designated takeoff point
   - Connect to drone via ROS/MAVLink
   - Verify telemetry data connection
   - Confirm mission parameters

2. **Mission Execution**
   - Monitor real-time drone position in 3D view
   - Track mission progress against plan
   - Control camera operations (photo capture, video)
   - Manage gimbal positioning for optimal data collection

3. **Data Handling**
   - Live data visualization during mission
   - Post-mission data processing options
   - Integration with analysis tools

## Coordinate System Management

OverWatch implements a sophisticated coordinate management approach:

1. **Global to Local Conversion**
   - Mission origin defined at selected geographic point
   - All positions calculated relative to this origin using ENU (East-North-Up) system
   - Ensures high precision in local operations

2. **Takeoff-Centric Operations**
   - Uses drone takeoff location as (0,0,0) origin
   - Provides intuitive spatial reference for field teams
   - Simplifies communication and navigation during missions

3. **ROS Integration Layer**
   - Transforms between ROS coordinate conventions and application frames
   - Handles different sensor frames (cameras, LiDAR)
   - Ensures consistent positioning across all systems

## Path Planning Tools

### Manual Grid Generator

Specialized for:
- Comprehensive coverage of flat surfaces
- Photogrammetry data collection
- Systematic inspection patterns

Key features:
- Configurable altitude and overlap
- Camera parameter integration
- Optimized flight lines for efficiency

### 2D Mission Generator

Designed for:
- Large area surveys
- Terrain following operations
- Irregular shape coverage

Key features:
- Adapts to complex polygon boundaries
- Consistent ground sampling distance
- Efficient path optimization

### 3D Mission Generator

Optimized for:
- Building and structure inspection
- Complex 3D surface coverage
- Precise standoff distance maintenance

Key features:
- Face selection with normal vector detection
- Automatic gimbal angle adjustment
- Advanced path optimization for complex structures

## Camera and Sensor Control

OverWatch provides advanced control for drone imaging systems:

- **Gimbal Control**: Precise pitch adjustment for optimal imaging angles
- **Camera Modes**: Photo and video mode switching
- **Camera Triggering**: Automated and manual image capture
- **Video Recording**: Start/stop recording with status tracking
- **MAVLink Integration**: Standard protocol support for most camera systems

## Getting Started

To begin using OverWatch:

1. **Installation**
   - Deploy the OverWatch application on your system
   - Configure connection settings for your drone hardware
   - Set up ROS bridge if using ROS-compatible drones

2. **Initial Setup**
   - Create your first mission using the GeoPage
   - Familiarize yourself with the 3D mission planning environment
   - Run a simulation to understand the workflow

3. **Training and Resources**
   - Review the documentation for detailed guides on specific features
   - Practice mission planning with the simulation mode
   - Start with simple missions before advancing to complex operations

## Summary

OverWatch represents a comprehensive solution for professional drone operations, combining advanced 3D visualization, precise mission planning, and robust hardware integration. Whether performing industrial inspections, surveying construction sites, or monitoring critical infrastructure, OverWatch provides the tools needed for successful mission execution with maximum efficiency and data quality. 