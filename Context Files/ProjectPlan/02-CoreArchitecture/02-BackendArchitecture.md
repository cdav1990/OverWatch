# Backend Architecture

## Overview

The OverWatch Mission Control backend is built on a microservices architecture using Python and ROS (Robot Operating System). This architecture is designed to handle real-time data processing, hardware integration, and provide a robust API for the frontend application.

## Architectural Principles

1. **Microservices Decomposition**: Organizing the system into independent, specialized services
2. **Message-Based Communication**: Using ROS topics and services for asynchronous communication
3. **Separation of Concerns**: Clearly defined service boundaries based on domain responsibilities
4. **Scalability**: Ability to scale individual services independently based on load
5. **Resilience**: Fault isolation and graceful degradation of services

## System Architecture

The backend is organized into several key microservices, each with a specific responsibility:

```
                                           ┌────────────────────┐
                                           │                    │
                                           │   Frontend App     │
                                           │                    │
                                           └─────────┬──────────┘
                                                     │
                                                     │ WebSocket / HTTP
                                                     ▼
┌────────────────────┐                     ┌─────────────────────┐
│                    │                     │                     │
│   Hardware         │◄───────────────────►│   ROS Bridge        │
│   (Drones/Sensors) │    ROS/MAVLink     │   Service           │
│                    │                     │                     │
└────────────────────┘                     └─────────┬───────────┘
                                                     │
                                                     │ ROS Topics/Services
                                                     ▼
┌────────────────┐  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│                │  │                 │  │                   │  │                   │
│  Sensor        │  │  Mission        │  │  Data Processing  │  │  API Gateway      │
│  Services      │  │  Services       │  │  Services         │  │                   │
│                │  │                 │  │                   │  │                   │
└────────┬───────┘  └────────┬────────┘  └─────────┬─────────┘  └─────────┬─────────┘
         │                   │                     │                      │
         └───────────────────┴─────────────────────┼──────────────────────┘
                                                   │
                                                   ▼
                                           ┌─────────────────────┐
                                           │                     │
                                           │   Data Storage      │
                                           │                     │
                                           └─────────────────────┘
```

## Microservices Overview

### 1. ROS Bridge Service

The central communication hub connecting the frontend application with the ROS ecosystem.

**Responsibilities**:
- Run `rosbridge_server` to provide WebSocket connectivity to ROS
- Process messages between frontend and ROS ecosystem
- Handle connection management and authentication
- Provide protocol translation between ROS and non-ROS components

**Key Components**:
- **rosbridge_server**: Standard ROS package providing WebSocket server
- **Authentication Module**: Handles user authentication for ROS connections
- **Message Translator**: Converts between ROS messages and frontend-friendly formats
- **Connection Manager**: Monitors and manages client connections

**Implementation**:
```python
# rosbridge_service.py
import rospy
import rosbridge_server
from std_msgs.msg import String
from geometry_msgs.msg import PoseStamped

class ROSBridgeService:
    def __init__(self):
        rospy.init_node('rosbridge_service')
        
        # Set up subscribers for topics that need to be relayed to frontend
        self.pose_sub = rospy.Subscriber('/mavros/local_position/pose', 
                                         PoseStamped, 
                                         self.pose_callback)
        
        # Set up publishers for topics that will receive data from frontend
        self.command_pub = rospy.Publisher('/drone_commands', 
                                          String, 
                                          queue_size=10)
        
        # Initialize rosbridge server
        # This is typically done via launch file, but shown here for clarity
        rosbridge_server.launch_rosbridge()
        
    def pose_callback(self, pose_msg):
        # ROS Bridge will automatically relay messages to subscribed clients
        # This callback could be used for additional processing if needed
        pass
        
    def run(self):
        rospy.spin()

if __name__ == '__main__':
    service = ROSBridgeService()
    service.run()
```

### 2. Sensor Services

A collection of services that interface with physical hardware sensors.

**Responsibilities**:
- Communicate with hardware via SDKs or drivers
- Process and publish raw sensor data to ROS topics
- Handle sensor configuration and control
- Monitor sensor health and status

**Key Components**:
- **Phase One Camera Service**: Interfaces with Phase One camera SDK
- **Ouster LiDAR Service**: Interfaces with Ouster LiDAR SDK
- **Sony ILX Camera Service**: Interfaces with Sony Camera SDK

**Example Implementation (Phase One Camera)**:
```python
# phase_one_service.py
import rospy
import phase_one_sdk  # Hypothetical SDK
from sensor_msgs.msg import Image, CameraInfo
from std_msgs.msg import String
from std_srvs.srv import Trigger, TriggerResponse

class PhaseOneCameraService:
    def __init__(self):
        rospy.init_node('phase_one_camera_service')
        
        # Initialize camera connection
        self.camera = phase_one_sdk.Camera()
        self.camera.connect()
        
        # Set up publishers
        self.image_pub = rospy.Publisher('/phase_one/image_raw', 
                                         Image, 
                                         queue_size=1)
        self.camera_info_pub = rospy.Publisher('/phase_one/camera_info', 
                                              CameraInfo, 
                                              queue_size=1)
        self.status_pub = rospy.Publisher('/phase_one/status', 
                                         String, 
                                         queue_size=5)
        
        # Set up services
        self.capture_service = rospy.Service('/phase_one/capture', 
                                            Trigger, 
                                            self.trigger_capture)
        self.configure_service = rospy.Service('/phase_one/configure', 
                                              ConfigureCamera, 
                                              self.configure_camera)
        
        # Timer for status updates
        rospy.Timer(rospy.Duration(1.0), self.publish_status)
        
    def trigger_capture(self, request):
        try:
            image_data = self.camera.capture()
            
            # Convert to ROS Image message
            ros_image = self.convert_to_ros_image(image_data)
            self.image_pub.publish(ros_image)
            
            # Publish camera info
            camera_info = self.get_camera_info()
            self.camera_info_pub.publish(camera_info)
            
            return TriggerResponse(success=True, message="Image captured successfully")
        except Exception as e:
            rospy.logerr(f"Failed to capture image: {str(e)}")
            return TriggerResponse(success=False, message=str(e))
    
    def convert_to_ros_image(self, image_data):
        # Convert image from camera SDK format to ROS Image message
        # Implementation depends on camera SDK details
        pass
        
    def get_camera_info(self):
        # Generate camera info message with calibration data
        # Implementation depends on camera specifics
        pass
        
    def configure_camera(self, request):
        # Handle configuration requests
        # Update camera settings via SDK
        pass
        
    def publish_status(self, event):
        status = self.camera.get_status()
        self.status_pub.publish(String(data=status))
        
    def run(self):
        rospy.spin()

if __name__ == '__main__':
    service = PhaseOneCameraService()
    service.run()
```

### 3. Mission Services

Handles mission planning, execution, and monitoring.

**Responsibilities**:
- Store and manage mission definitions
- Execute mission plans on hardware
- Monitor mission progress and status
- Handle mission control commands (start, pause, abort)

**Key Components**:
- **Mission Repository**: Stores mission definitions and parameters
- **Mission Executor**: Converts missions to hardware commands
- **Mission Monitor**: Tracks progress and status of missions
- **Path Planning**: Algorithms for generating optimal paths

**Example Implementation**:
```python
# mission_execution_service.py
import rospy
import json
import numpy as np
from geometry_msgs.msg import PoseStamped
from mavros_msgs.msg import WaypointList, Waypoint
from std_msgs.msg import String, Bool
from std_srvs.srv import Trigger, TriggerResponse

class MissionExecutionService:
    def __init__(self):
        rospy.init_node('mission_execution_service')
        
        # Current mission state
        self.current_mission = None
        self.mission_status = "IDLE"  # IDLE, RUNNING, PAUSED, COMPLETED, ABORTED
        self.current_waypoint_index = 0
        
        # Publishers
        self.status_pub = rospy.Publisher('/mission/status', 
                                         String, 
                                         queue_size=5)
        self.waypoint_pub = rospy.Publisher('/mavros/mission/waypoints', 
                                           WaypointList, 
                                           queue_size=10)
        
        # Subscribers
        self.pose_sub = rospy.Subscriber('/mavros/local_position/pose', 
                                        PoseStamped, 
                                        self.pose_callback)
        self.reached_sub = rospy.Subscriber('/mavros/mission/reached', 
                                          String, 
                                          self.waypoint_reached_callback)
        
        # Services
        self.start_service = rospy.Service('/mission/start', 
                                          Trigger, 
                                          self.start_mission)
        self.pause_service = rospy.Service('/mission/pause', 
                                          Trigger, 
                                          self.pause_mission)
        self.abort_service = rospy.Service('/mission/abort', 
                                          Trigger, 
                                          self.abort_mission)
        self.load_service = rospy.Service('/mission/load', 
                                         LoadMission, 
                                         self.load_mission)
        
        # Timer for status updates
        rospy.Timer(rospy.Duration(1.0), self.publish_status)
        
    def load_mission(self, request):
        try:
            # Parse mission data from request
            mission_data = json.loads(request.mission_json)
            
            # Validate mission data
            if not self.validate_mission(mission_data):
                return LoadMissionResponse(success=False, 
                                          message="Invalid mission format")
            
            # Convert to hardware-specific waypoints
            waypoints = self.convert_to_waypoints(mission_data)
            
            # Store mission
            self.current_mission = {
                "id": mission_data["id"],
                "name": mission_data["name"],
                "waypoints": waypoints,
                "parameters": mission_data.get("parameters", {})
            }
            
            self.mission_status = "LOADED"
            self.current_waypoint_index = 0
            
            return LoadMissionResponse(success=True, 
                                      message=f"Mission {mission_data['id']} loaded")
                                      
        except Exception as e:
            rospy.logerr(f"Failed to load mission: {str(e)}")
            return LoadMissionResponse(success=False, message=str(e))
    
    def start_mission(self, request):
        if not self.current_mission:
            return TriggerResponse(success=False, message="No mission loaded")
            
        if self.mission_status in ["RUNNING", "COMPLETED"]:
            return TriggerResponse(success=False, 
                                  message=f"Cannot start mission in {self.mission_status} state")
        
        try:
            # Convert mission to waypoint list
            waypoint_list = self.create_waypoint_list()
            
            # Send to flight controller
            self.waypoint_pub.publish(waypoint_list)
            
            # Set mission to running
            self.mission_status = "RUNNING"
            
            return TriggerResponse(success=True, message="Mission started")
            
        except Exception as e:
            rospy.logerr(f"Failed to start mission: {str(e)}")
            return TriggerResponse(success=False, message=str(e))
    
    def convert_to_waypoints(self, mission_data):
        # Convert mission JSON to waypoints
        # Implementation depends on mission format
        pass
    
    def create_waypoint_list(self):
        # Create MAVLink waypoint list from current mission
        # Implementation depends on MAVLink specifics
        pass
        
    def pose_callback(self, pose_msg):
        # Update current drone position
        # Check if we're close to next waypoint
        pass
        
    def waypoint_reached_callback(self, msg):
        # Handle waypoint reached events
        # Update mission progress
        pass
        
    def pause_mission(self, request):
        # Pause mission execution
        pass
        
    def abort_mission(self, request):
        # Abort mission execution
        pass
        
    def publish_status(self, event):
        if self.current_mission:
            status = {
                "mission_id": self.current_mission["id"],
                "mission_name": self.current_mission["name"],
                "status": self.mission_status,
                "progress": {
                    "current_waypoint": self.current_waypoint_index,
                    "total_waypoints": len(self.current_mission["waypoints"]),
                    "percent_complete": (self.current_waypoint_index / 
                                        len(self.current_mission["waypoints"]) * 100)
                }
            }
            self.status_pub.publish(String(data=json.dumps(status)))
        else:
            self.status_pub.publish(String(data=json.dumps({"status": "IDLE"})))
        
    def run(self):
        rospy.spin()

if __name__ == '__main__':
    service = MissionExecutionService()
    service.run()
```

### 4. Data Processing Services

Handles processing of sensor data, computer vision, and 3D reconstruction.

**Responsibilities**:
- Process raw sensor data into useful information
- Perform computer vision and machine learning inference
- Generate 3D reconstructions from sensor data
- Detect anomalies and defects in captured data

**Key Components**:
- **SLAM Service**: Handles simultaneous localization and mapping
- **3D Reconstruction Service**: Generates 3D models from images and LiDAR
- **CV Inference Service**: Runs computer vision models for defect detection
- **Point Cloud Processing**: Processes and filters LiDAR point clouds

**Example Implementation (Simplified SLAM Service)**:
```python
# slam_service.py
import rospy
import numpy as np
import fast_livo2  # Hypothetical SLAM library
from sensor_msgs.msg import PointCloud2, Image
from nav_msgs.msg import Odometry
from geometry_msgs.msg import PoseStamped
from tf2_ros import TransformBroadcaster
from geometry_msgs.msg import TransformStamped

class SLAMService:
    def __init__(self):
        rospy.init_node('slam_service')
        
        # Initialize SLAM system
        self.slam = fast_livo2.SLAM()
        
        # Set up subscribers
        self.lidar_sub = rospy.Subscriber('/lidar/points', 
                                         PointCloud2, 
                                         self.lidar_callback)
        self.image_sub = rospy.Subscriber('/camera/image_raw', 
                                         Image, 
                                         self.image_callback)
        
        # Set up publishers
        self.pose_pub = rospy.Publisher('/slam/pose', 
                                       PoseStamped, 
                                       queue_size=5)
        self.map_pub = rospy.Publisher('/slam/map', 
                                      PointCloud2, 
                                      queue_size=1)
        self.odom_pub = rospy.Publisher('/slam/odometry', 
                                       Odometry, 
                                       queue_size=5)
        
        # Set up transform broadcaster for TF tree
        self.tf_broadcaster = TransformBroadcaster()
        
        # Initialize state variables
        self.current_pose = None
        self.current_map = None
        
        # Parameters
        self.map_publish_rate = rospy.get_param('~map_publish_rate', 1.0)  # Hz
        
        # Timer for publishing the map (which may be computationally expensive)
        rospy.Timer(rospy.Duration(1.0/self.map_publish_rate), self.publish_map)
        
    def lidar_callback(self, pointcloud_msg):
        # Convert ROS PointCloud2 to the format required by SLAM system
        pointcloud = self.convert_ros_pointcloud(pointcloud_msg)
        
        # Feed pointcloud to SLAM system
        if self.slam.is_initialized():
            self.slam.process_lidar(pointcloud, pointcloud_msg.header.stamp.to_sec())
            
            # Get updated pose
            self.current_pose = self.slam.get_current_pose()
            
            # Publish pose
            self.publish_pose()
            
    def image_callback(self, image_msg):
        # Convert ROS Image to the format required by SLAM system
        image = self.convert_ros_image(image_msg)
        
        # Feed image to SLAM system if needed
        if self.slam.is_initialized():
            self.slam.process_image(image, image_msg.header.stamp.to_sec())
    
    def convert_ros_pointcloud(self, pointcloud_msg):
        # Convert ROS PointCloud2 to numpy array
        # Implementation depends on point cloud format and library needs
        pass
        
    def convert_ros_image(self, image_msg):
        # Convert ROS Image to OpenCV/numpy image
        # Implementation depends on image format and library needs
        pass
        
    def publish_pose(self):
        if self.current_pose is None:
            return
            
        # Create PoseStamped message
        pose_msg = PoseStamped()
        pose_msg.header.stamp = rospy.Time.now()
        pose_msg.header.frame_id = "map"
        
        # Set position and orientation
        pose_msg.pose.position.x = self.current_pose.position[0]
        pose_msg.pose.position.y = self.current_pose.position[1]
        pose_msg.pose.position.z = self.current_pose.position[2]
        
        pose_msg.pose.orientation.x = self.current_pose.orientation[0]
        pose_msg.pose.orientation.y = self.current_pose.orientation[1]
        pose_msg.pose.orientation.z = self.current_pose.orientation[2]
        pose_msg.pose.orientation.w = self.current_pose.orientation[3]
        
        # Publish pose
        self.pose_pub.publish(pose_msg)
        
        # Publish transform
        self.publish_transform(pose_msg)
        
        # Create and publish odometry
        self.publish_odometry(pose_msg)
        
    def publish_transform(self, pose_msg):
        # Create transform message
        transform = TransformStamped()
        transform.header = pose_msg.header
        transform.child_frame_id = "base_link"
        
        # Set translation and rotation
        transform.transform.translation.x = pose_msg.pose.position.x
        transform.transform.translation.y = pose_msg.pose.position.y
        transform.transform.translation.z = pose_msg.pose.position.z
        
        transform.transform.rotation = pose_msg.pose.orientation
        
        # Broadcast transform
        self.tf_broadcaster.sendTransform(transform)
        
    def publish_odometry(self, pose_msg):
        # Create odometry message
        odom_msg = Odometry()
        odom_msg.header = pose_msg.header
        odom_msg.child_frame_id = "base_link"
        odom_msg.pose.pose = pose_msg.pose
        
        # Set velocity (if available from SLAM system)
        if hasattr(self.current_pose, 'velocity'):
            odom_msg.twist.twist.linear.x = self.current_pose.velocity[0]
            odom_msg.twist.twist.linear.y = self.current_pose.velocity[1]
            odom_msg.twist.twist.linear.z = self.current_pose.velocity[2]
        
        # Publish odometry
        self.odom_pub.publish(odom_msg)
        
    def publish_map(self, event):
        # Get current map from SLAM system
        if self.slam.is_initialized():
            self.current_map = self.slam.get_map()
            
            if self.current_map is not None:
                # Convert map to ROS PointCloud2
                map_msg = self.convert_to_ros_pointcloud(self.current_map)
                
                # Publish map
                self.map_pub.publish(map_msg)
    
    def convert_to_ros_pointcloud(self, map_data):
        # Convert map data to ROS PointCloud2
        # Implementation depends on map format and ROS needs
        pass
        
    def run(self):
        rospy.spin()

if __name__ == '__main__':
    service = SLAMService()
    service.run()
```

### 5. API Gateway

Provides REST/GraphQL endpoints for the frontend application to access non-real-time data.

**Responsibilities**:
- Expose REST/GraphQL API for frontend
- Handle authentication and authorization
- Route requests to appropriate services
- Aggregate data from multiple services when needed

**Key Components**:
- **FastAPI Application**: Core API framework
- **Authentication Middleware**: JWT-based authentication
- **Request Router**: Routes requests to appropriate services
- **Response Formatter**: Formats service responses for API consumers

**Example Implementation**:
```python
# api_gateway.py
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
from typing import List, Optional
from database import get_mission_repository, get_user_repository

# Initialize FastAPI app
app = FastAPI(title="OverWatch API Gateway")

# Authentication settings
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class Mission(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    waypoints: List[dict]
    parameters: dict

# Authentication functions
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user_repository = get_user_repository()
    user = user_repository.get_user(username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_repository = get_user_repository()
    user = user_repository.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/missions", response_model=List[Mission])
async def get_missions(current_user: User = Depends(get_current_active_user), 
                       skip: int = 0, limit: int = 100):
    mission_repository = get_mission_repository()
    missions = mission_repository.get_missions(skip=skip, limit=limit)
    return missions

@app.get("/missions/{mission_id}", response_model=Mission)
async def get_mission(mission_id: str, current_user: User = Depends(get_current_active_user)):
    mission_repository = get_mission_repository()
    mission = mission_repository.get_mission(mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

@app.post("/missions", response_model=Mission)
async def create_mission(mission: Mission, current_user: User = Depends(get_current_active_user)):
    mission_repository = get_mission_repository()
    new_mission = mission_repository.create_mission(mission)
    return new_mission

@app.put("/missions/{mission_id}", response_model=Mission)
async def update_mission(mission_id: str, mission: Mission, 
                         current_user: User = Depends(get_current_active_user)):
    mission_repository = get_mission_repository()
    updated_mission = mission_repository.update_mission(mission_id, mission)
    if updated_mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")
    return updated_mission

@app.delete("/missions/{mission_id}")
async def delete_mission(mission_id: str, current_user: User = Depends(get_current_active_user)):
    mission_repository = get_mission_repository()
    success = mission_repository.delete_mission(mission_id)
    if not success:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"status": "success", "message": f"Mission {mission_id} deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 6. Data Storage Service

Manages persistence of application data and sensor data.

**Responsibilities**:
- Store mission data in databases
- Store large sensor data (images, point clouds) in object storage
- Provide data retrieval interfaces
- Handle data lifecycle management

**Key Components**:
- **Database Access Layer**: Interfaces with PostgreSQL
- **Document Store Layer**: Interfaces with MongoDB
- **Object Storage Layer**: Interfaces with MinIO/S3
- **Data Lifecycle Manager**: Handles archiving and cleanup

## Inter-Service Communication

### 1. ROS Topics and Services

Services communicate with each other primarily through ROS topics and services:

```python
# Example Publisher
self.publisher = rospy.Publisher('/topic_name', MessageType, queue_size=10)
self.publisher.publish(message)

# Example Subscriber
def callback(message):
    # Process message
    pass
    
self.subscriber = rospy.Subscriber('/topic_name', MessageType, callback)

# Example Service Client
rospy.wait_for_service('/service_name')
try:
    service_proxy = rospy.ServiceProxy('/service_name', ServiceType)
    response = service_proxy(request)
    # Process response
except rospy.ServiceException as e:
    rospy.logerr(f"Service call failed: {e}")

# Example Service Server
def handle_service(request):
    # Process request
    return response
    
self.service = rospy.Service('/service_name', ServiceType, handle_service)
```

### 2. gRPC for High-Performance Services

For high-performance communication, particularly with the HPC service, gRPC is used:

```python
# Example gRPC Service Definition (proto file)
# hpc_service.proto
syntax = "proto3";

package hpc;

service HPCService {
  rpc ProcessPointCloud(PointCloudRequest) returns (ProcessingJob);
  rpc GetJobStatus(JobQuery) returns (JobStatus);
  rpc GetProcessedResult(JobQuery) returns (ProcessedData);
}

message PointCloudRequest {
  bytes point_cloud_data = 1;
  string format = 2;
  string processing_type = 3;
  map<string, string> parameters = 4;
}

message ProcessingJob {
  string job_id = 1;
  string status = 2;
  string created_at = 3;
}

message JobQuery {
  string job_id = 1;
}

message JobStatus {
  string job_id = 1;
  string status = 2;
  float progress = 3;
  string message = 4;
}

message ProcessedData {
  string job_id = 1;
  bytes result_data = 2;
  string format = 3;
  map<string, string> metadata = 4;
}
```

```python
# Example gRPC client
import grpc
import hpc_pb2
import hpc_pb2_grpc
import numpy as np

class HPCClient:
    def __init__(self, host='localhost', port=50051):
        self.channel = grpc.insecure_channel(f'{host}:{port}')
        self.stub = hpc_pb2_grpc.HPCServiceStub(self.channel)
        
    def process_point_cloud(self, point_cloud, format='pcd', processing_type='reconstruction'):
        # Convert point cloud to bytes
        if isinstance(point_cloud, np.ndarray):
            point_cloud_bytes = point_cloud.tobytes()
        else:
            point_cloud_bytes = point_cloud
            
        # Create request
        request = hpc_pb2.PointCloudRequest(
            point_cloud_data=point_cloud_bytes,
            format=format,
            processing_type=processing_type,
            parameters={
                'resolution': '0.1',
                'filter': 'voxel_grid'
            }
        )
        
        # Call RPC
        response = self.stub.ProcessPointCloud(request)
        return response
        
    def get_job_status(self, job_id):
        request = hpc_pb2.JobQuery(job_id=job_id)
        response = self.stub.GetJobStatus(request)
        return response
        
    def get_processed_result(self, job_id):
        request = hpc_pb2.JobQuery(job_id=job_id)
        response = self.stub.GetProcessedResult(request)
        return response
```

## Deployment Architecture

The backend services are designed to be deployed as Docker containers managed by Kubernetes:

```
┌────────────────────────────────────────────┐
│                Kubernetes                  │
│                                            │
│  ┌──────────────┐    ┌──────────────┐     │
│  │              │    │              │     │
│  │  ROS Bridge  │    │   API Gateway│     │
│  │  Service Pod │    │  Service Pod │     │
│  │              │    │              │     │
│  └──────────────┘    └──────────────┘     │
│                                            │
│  ┌──────────────┐    ┌──────────────┐     │
│  │              │    │              │     │
│  │   Sensor     │    │   Mission    │     │
│  │ Service Pods │    │ Service Pods │     │
│  │              │    │              │     │
│  └──────────────┘    └──────────────┘     │
│                                            │
│  ┌──────────────┐    ┌──────────────┐     │
│  │              │    │              │     │
│  │ Data Process │    │  Data Storage│     │
│  │ Service Pods │    │  Service Pods│     │
│  │              │    │              │     │
│  └──────────────┘    └──────────────┘     │
│                                            │
└────────────────────────────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│                    │    │                    │
│   ROS Master Node  │    │   Database Cluster │
│                    │    │                    │
└────────────────────┘    └────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│                    │    │                    │
│   Object Storage   │    │   HPC Cluster      │
│                    │    │                    │
└────────────────────┘    └────────────────────┘
```

## Data Flows

### 1. Image Capture and Processing

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│              │    │              │    │              │
│  PhaseOne    │ ──►│  ROS Bridge  │ ──►│  Frontend    │
│  Camera      │    │  Service     │    │  (Real-time  │
│  Service     │    │              │    │   preview)   │
│              │    │              │    │              │
└─────┬────────┘    └──────────────┘    └──────────────┘
      │
      │ Image Data                    ┌──────────────┐
      │                               │              │
      └─────────────────────────────► │ Data Storage │
                                      │ Service      │
                                      │              │
                                      └─────┬────────┘
                                            │
                                            │
                                      ┌─────▼────────┐
                                      │              │
                                      │ 3D Recon-    │
                                      │ struction    │
                                      │ Service      │
                                      │              │
                                      └─────┬────────┘
                                            │
                                            │ 3D Model
                                      ┌─────▼────────┐
                                      │              │
                                      │ API Gateway  │ ──► Frontend
                                      │ Service      │
                                      │              │
                                      └──────────────┘
```

### 2. Mission Execution

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│              │    │              │    │              │
│  Frontend    │ ──►│  API Gateway │ ──►│  Mission     │
│  (Mission    │    │  Service     │    │  Service     │
│   Planning)  │    │              │    │              │
│              │    │              │    │              │
└──────────────┘    └──────────────┘    └─────┬────────┘
                                              │
                                              │ Mission Commands
                                        ┌─────▼────────┐
                                        │              │
                                        │  ROS Bridge  │
                                        │  Service     │
                                        │              │
                                        └─────┬────────┘
                                              │
                                              │ MAVLink Commands
                                        ┌─────▼────────┐
                                        │              │
                                        │  Drone       │
                                        │  Hardware    │
                                        │              │
                                        └─────┬────────┘
                                              │
                                              │ Telemetry
                                        ┌─────▼────────┐
                                        │              │
                                        │  ROS Bridge  │ ──► Frontend
                                        │  Service     │    (Real-time
                                        │              │     monitoring)
                                        └──────────────┘
```

## Testing Strategy

The backend testing strategy includes:

1. **Unit Tests**: For individual service components and utilities
2. **Integration Tests**: For service interactions and ROS communication
3. **System Tests**: For end-to-end workflows and scenarios
4. **Performance Tests**: For data processing pipelines and real-time systems

## Monitoring and Observability

Comprehensive monitoring is implemented across all services:

1. **Metrics Collection**: Using Prometheus for system and application metrics
2. **Logging**: Structured logging with correlation IDs across services
3. **Distributed Tracing**: Using OpenTelemetry for request tracing
4. **Alerting**: Automated alerts for critical system conditions

## Deployment Strategy

Services are deployed using a CI/CD pipeline:

1. **Containerization**: All services packaged as Docker containers
2. **Orchestration**: Kubernetes for container orchestration
3. **Namespaces**: Separate namespaces for dev, staging, and production
4. **Configuration**: Environment-specific configuration via ConfigMaps and Secrets
5. **Rolling Updates**: Zero-downtime deployments with rolling updates
6. **Canary Deployments**: Gradual rollout of new versions to detect issues early

## Conclusion

This microservices architecture provides a robust, scalable, and maintainable backend for the OverWatch Mission Control application. The ROS-centric approach ensures seamless integration with hardware systems, while the service-oriented design supports independent scaling and development of various system components. 