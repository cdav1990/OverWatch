High-Resolution Drone Inspection Workflow and Architecture
Overview and Objectives
Ship maintenance demands extremely detailed inspections to catch early coating failures (e.g. paint delamination or rust). This architecture enables < 1 mm GSD (ground sample distance) photogrammetry of a ship’s surface and isolates coating damage in a high-resolution 3D model. The solution uses a tethered drone carrying high-end sensors, performing most flights with continuous power and a 10 GbE data link. A robust network and on-site computing stack process imagery in real-time, guiding inspectors to areas of concern. The workflow is designed for clarity and efficiency so both engineers and managers can understand the process.
Hardware and Network Architecture
Drone Platform (Sensors & Onboard Systems)
High-Resolution Cameras: The drone is mounted on a Phase One iXM-100 (100 MP medium-format) or Sony ILX-LR1 (61 MP full-frame) camera. These are interchangeable based on lens and distance requirements. The PhaseOne with an 80 mm lens can achieve ~1 mm per pixel GSD at ~10 m distance (3D Bridge Inspection | Achieve 1mm Pixel Detail with iXM-100), capturing a ~12 × 9 m area per shot (3D Bridge Inspection | Achieve 1mm Pixel Detail with iXM-100). This ultra-fine detail allows inspectors to zoom in on tiny coating defects. The Sony ILX, being lighter, can be used when the drone must maneuver in tighter spots or for closer-range imaging, albeit with slightly lower resolution.


LiDAR Scanner: An Ouster OS0-128 LiDAR provides 3D structure scanning. It offers a wide field-of-view, capturing millions of points per second of the ship’s geometry. The LiDAR data complements photogrammetry by giving accurate distance and shape information for areas that are hard to model by photos alone (like dark or textureless surfaces). It’s also used for navigation (terrain following, obstacle avoidance in confined ship areas).


Onboard Computer (Edge AI): An NVIDIA Jetson AGX Xavier (64 GB) module serves as the drone’s edge computer for real-time processing. It interfaces with the camera and LiDAR, performing initial computer vision (CV) inference and data management. For example, the Jetson can run a lightweight defect detection model on live video frames or downsampled images to flag obvious rust patches in real time. It can also compress and stream sensor data via the tether. Despite the high-resolution imagery, having onboard AI ensures some analytics occur even if bandwidth drops. (The Jetson AGX provides up to 32 TOPS of AI performance, enabling tasks like object detection or segmentation at the edge).


Flight Controller & Backup Power: A dedicated flight controller (autopilot) handles stabilization and navigation (running PX4 or ArduPilot, for instance). The drone has a battery onboard as a backup – primarily to safely fly the ~20% of the time it may be untethered or in case the tethered power is lost. This battery can power the drone for a short duration and is continuously charged during tethered flight. The flight controller and Jetson are integrated to execute high-level mission commands from the ground (e.g., waypoints or gimbal angles) autonomously. The tether interface on the drone connects to the flight controller and Jetson, routing both power and data.


Tether System (Power & Data Link)
For 80% of operations, the drone is tethered to a ground station. The tether is a reinforced cable supplying continuous power and a high-bandwidth data line (rugged fiber or cable supporting 10 GbE Ethernet). This enables virtually unlimited flight time and a real-time feed of full-resolution data. Tethered drones uniquely allow fast data transmission and continuous charging, while improving control and safety (Tethered Drone Power Management for Unlimited Flight Time | Vicor). The tether reel system on the ground manages cable slack as the drone moves.
Ground Systems (Networking & Control)
Tether Station and Switch: On the ground, the tether connects to a base station that provides power and breaks out a 10 Gigabit Ethernet link. This link goes into a rugged 10 GbE network switch, forming a local LAN at the inspection site. The switch also connects to a Wi-Fi 6E (6 GHz) mesh node or access point, enabling wireless connectivity for personnel devices.


OverWatch Mission Control: OverWatch is the central software platform (running on a rugged laptop or workstation) for mission planning, simulation, and real-time control. It interfaces with the drone via the tether network (using MAVLink or similar protocols over Ethernet) and provides the user interface for both the pilot and imaging technician. OverWatch displays the drone’s live position on a 3D model or map, shows telemetry, and integrates the video/feed from the drone’s cameras. It also runs a physics-based simulation mode pre-mission to validate the flight plan and can take over autonomous functions during flight (e.g., holding position, following a pre-set path).


Handheld Control Devices: Two portable controllers (for example, Steam Deck-like PCs or tablets running Linux/Windows) are used by the crew:


The Pilot’s Controller is focused on flight operations. It has joysticks or virtual controls for manual flight, and a UI (possibly via OverWatch or QGroundControl interface) showing basic telemetry. This connects to OverWatch over the Wi-Fi 6E network (when tethered) or via a direct radio link (when untethered).


The Imaging Technician’s Controller is focused on camera control and imagery. This device can adjust camera settings, trigger captures, and point the gimbal. It also displays live video or recent high-res images for review. In tethered mode, it communicates over the network to either OverWatch or directly to the camera control subsystem on the drone. Both controllers are networked so that control authority can be transferred or shared.


On-Site High-Performance Server: A mobile server (an AMD Threadripper/EPYC based machine with 1–2 TB RAM and multiple NVIDIA GPUs) is deployed on-site for heavy data processing. This server is connected to the 10 GbE switch. Its roles include:


Photogrammetry Processing: It ingests the flood of images and LiDAR data to construct the high-resolution 3D model of the ship. State-of-the-art techniques like Gaussian Splatting are used to rapidly turn images into a dense 3D representation (Gaussian splatting vs. photogrammetry vs. NeRFs – pros and cons | Teleport). This yields an initial textured model of the ship in near-real-time (even during the mission, for parts that have enough photos).


AI Defect Detection: The server runs deep learning models on the collected data to identify coating failures (rust, blistering, cracks in paint). This may involve both 2D analysis (running a CNN on each image) and 3D analysis (segmenting points or mesh areas that correspond to corrosion). Advanced 3D vision frameworks inspired by NVIDIA’s research (e.g. Francis Williams’ large-scale 3D segmentation tools) enable processing of huge point clouds or volumetric data in memory (Publications | Francis Williams). The server’s GPUs can thus perform semantic segmentation on the detailed 3D model to label areas of rust vs good paint, achieving detection of very fine defects (on the order of millimeters or even sub-millimeter if the image resolution supports it).


3D Visualization/Streaming: The reconstructed 3D model (and any overlay of defect annotations) can be streamed or made available to OverWatch and the controllers. The server might run a small local web service or use game-engine technology to allow the inspectors to explore the model interactively on their devices.


Local NAS Storage: A Network-Attached Storage (NAS) device with high capacity (e.g. several tens of TB, in RAID) is connected via 10 GbE. All raw images, LiDAR point clouds, and intermediate data are saved here in real-time. This provides data redundancy and fast access for post-mission analysis. The NAS ensures that the raw data is safely stored even if individual processing components fail. After the inspection, this NAS can be shipped or synced to a central repository for archiving.


(The figure below illustrates the architecture, showing data flows between the drone (sensors, Jetson, flight controller), the tether, and ground components (network, OverWatch, controllers, HPC server, and NAS).)
Mission Workflow (Start-of-Day to Inspection Report)
The operation follows a structured sequence to ensure efficiency and safety. Below is a wireframe-style flow from mission start to the final report:
Pre-Flight Planning & Simulation: The team uses OverWatch to plan the inspection early in the day. The ship’s CAD model or a prior scan is loaded, and inspection waypoints and camera angles are planned on this 3D model. OverWatch’s simulation mode allows the team to virtually fly the mission, verifying coverage of all surfaces and confirming the drone can maintain the needed standoff distance and angles for <1 mm GSD imagery. Any no-fly zones (e.g. mast areas, GPS-denied interiors) are accounted for. The mission plan (waypoints, altitudes, camera triggers) is finalized and uploaded to the drone’s autopilot.


Hardware Setup and Calibration: The drone is set up near the ship, and the tether cable is connected. The Phase One or Sony camera is mounted with the appropriate lens (e.g. 80 mm for PhaseOne to get ultra-high detail (3D Bridge Inspection | Achieve 1mm Pixel Detail with iXM-100)). Calibration routines are run: the gimbal is tested, IMU and compass calibrated (especially important due to large metal masses in a ship), and the LiDAR is initialized. OverWatch connects to the drone through the tether’s Ethernet; the Jetson streams a test feed to ensure all sensors are online. If using RTK GPS for precise geolocation, the base station is set up and the system is aligned.


Tethered Flight Operation: The inspection flight begins with the drone under tethered, powered flight. The pilot uses the handheld controller to take off and position the drone near the first inspection area of the hull. At this point, the pilot can engage an “autonomous inspection” mode in OverWatch – the autopilot/OverWatch will carry the drone through the pre-planned waypoints around the ship’s structure. The tether system continuously feeds power, so the drone can take its time to get every required angle. The camera automatically captures images at each waypoint or interval, ensuring overlapping photos of every surface. The imaging technician monitors the live feed on their device, verifying image quality and coverage. If the lighting is suboptimal or if an area was missed, they can request the pilot (or autopilot via OverWatch) to redo a pass or adjust positioning. Throughout the flight, the Jetson edge computer is performing on-the-fly checks – e.g. running a corrosion detection model on downsampled images. If the Jetson’s CV inference flags a suspect area (for example, a patch of rust color), OverWatch immediately marks that location on the model, so the team can decide to get extra images there. The tether’s 10 GbE link easily handles streaming of the 100 MP images and LiDAR scans to the ground as they are captured.


Real-Time Data Processing & Feedback: While the drone is flying, the ground HPC server begins crunching data in parallel. As images arrive, a photogrammetric reconstruction process (optimized by GPU acceleration) starts aligning and meshing the photos into a 3D model. By the time the drone finishes a section of the ship, a preliminary 3D model of that section is available to view. (Using techniques like Gaussian Splatting helps achieve fast, incremental reconstruction suitable for real-time visualization (Gaussian splatting vs. photogrammetry vs. NeRFs – pros and cons | Teleport).) Simultaneously, the server runs a defect detection AI: it might use a convolutional neural network to scan each new image for rust-colored textures or surface anomalies, and/or use the partial 3D model to find irregularities. Detected issues are fed back to the OverWatch software live. For example, if rust is detected on a particular panel, that panel might turn red in the OverWatch’s 3D view, alerting the team. This real-time feedback allows the team to make on-the-spot decisions – they might choose to manually fly the drone closer to a suspicious spot to get additional detail photos. Real-time damage identification in this manner can drastically reduce inspection time, as demonstrated in similar AI drone inspection systems where even micron-level damage is detected via the drone’s AI-generated 3D images (Case Study: Designing an AI Driven Inspection Drone for Wind Farms - Connect Tech Inc.).


Adaptive Inspection (Dynamic Re-tasking): The mission plan is not rigid; using OverWatch, the crew can dynamically adapt. For instance, if the live model indicates a certain area didn’t get enough overlap (perhaps the photogrammetry software warns of low coverage) or if the AI flags an anomaly, the imaging tech can add a new waypoint or ask the pilot to hover at a specific spot. OverWatch allows updating the flight plan on the fly. Because the drone is tethered with high bandwidth, these changes (like sending a new waypoint or camera trigger command) happen with minimal latency. The dual-operator setup shines here: the pilot keeps the drone stable and safe, while the imaging specialist focuses on getting the diagnostic data.


Mission Completion and Data Wrap-up: After all areas are covered, the drone returns to the takeoff point and lands. The tether is disconnected and powered down. Immediately, the remaining data (if any wasn’t streamed) is offloaded from onboard storage. In this tethered scenario, most data is already on the ground – e.g., high-res images have been continuously saved to the NAS and the server’s storage. The team performs a quick data integrity check on the NAS to ensure no images are missing. Batteries (if used) are checked to gauge usage (ideally they stayed near full charge due to tether power). The hardware is inspected post-flight.


Post-Processing and Analysis: With the drone on ground, the heavy photogrammetry processing can be finalized. The HPC server now has the full dataset and can refine the 3D model to the highest resolution. Any gaps are filled using the LiDAR data (to ensure accurate geometry even on featureless surfaces). The result is a high-resolution 3D model of the entire ship, textured with the actual photos. Every inch of the ship’s coating can be examined virtually. The AI defect detection is then run on the complete dataset (if not already finished). This might involve detailed semantic segmentation of the 3D mesh or cloud to pinpoint all corrosion spots. The use of advanced frameworks (like NVIDIA’s fVDB for large-scale 3D data) allows handling this massive model efficiently (Publications | Francis Williams). The output is a map of the ship’s surface with each damaged or suspect area highlighted.


Inspection Report Generation: OverWatch aggregates the results into an inspection report. The 3D model with annotations is made available in an interactive viewer for engineers to explore. Key findings (e.g., “Rust detected on 12 spots on starboard hull, largest patch ~5 cm, see Figure X”) are listed. Screenshots or short video fly-throughs of the 3D model focusing on these defects can be included for leadership review. Because the system achieved sub-millimeter imaging, the report might even allow zooming in to see very fine detail of the paint condition. The report also includes metadata like date/time of inspection, drone flight logs, and any areas that could not be inspected (though with this system’s flexibility, coverage should be near 100%). Finally, all data is backed up from the NAS to long-term storage. The mission is complete when the stakeholders have the detailed 3D model and the list of coating issues that need maintenance.


Data Flow and Real-Time Processing
The following describes how data moves through the system and how each component interacts, from image capture to analysis and feedback:
Image & LiDAR Capture: As the drone hovers and navigates around the ship, the PhaseOne/Sony camera captures high-resolution images at planned points. Each image (tens of MB in size) is immediately transmitted over the tether’s 10 GbE link down to the ground. The Jetson computer can act as a relay – it might perform a quick compression or format conversion, but given the tether bandwidth, it often sends the images in near raw form to minimize any onboard latency. Similarly, the Ouster OS0-128 LiDAR streams a continuous point cloud of distance measurements. The Jetson syncs these with timestamped frames and forwards the LiDAR data (often in packets) down the tether. In tethered mode, essentially all sensor data is available live on the ground. (The NAS writes incoming images to disk in real time for backup, and a separate thread on the HPC aggregates the LiDAR scans.)


Onboard Edge Inference: The Jetson doesn’t just pass data; it also analyzes it on the fly. For example, a neural network model (trained to recognize rust or blistered paint) runs on the Jetson using the live camera feed. Because the full 100 MP image is too large to process quickly onboard, the Jetson might use a scaled-down copy (like a 4K resolution version) or focus on regions of interest. If it detects a potential defect in an image, it flags that with metadata (e.g., bounding box coordinates or a heatmap) before or as it streams the data. This edge inference means the ground crew can get an initial heads-up on problems within seconds of a photo being taken, instead of waiting for full processing later.


Ground Ingestion and Storage: Arriving data flows into the ground systems via the 10 GbE switch. The HPC server is subscribed to the image feed; it might write images to its local fast SSD for processing. In parallel, the NAS captures everything as well, providing an immediate backup. The LiDAR stream is likewise logged. OverWatch, running on the GCS laptop, receives a lower-bandwidth telemetry and video feed. For example, the Jetson or a camera encoder might send a 1080p live video stream (for situational awareness) that OverWatch displays for the pilot – this is separate from the full-res images that go to the HPC. Telemetry (drone attitude, position, battery status, etc.) is sent at high rate to OverWatch over the tether link, so the ground operators see the drone’s status in real time.


Real-Time Photogrammetry Pipeline: The HPC server continuously runs a photogrammetry pipeline. Initially, it takes key images (for example, one every few seconds or at key waypoints) to start stitching together the scene. Features are detected in images and matched to build a sparse 3D point cloud (Structure-from-Motion). Thanks to the LiDAR providing an approximate structure, this process is accelerated (the LiDAR helps estimate camera poses in tricky situations). With a basic alignment of images, the HPC begins to generate a dense reconstruction. Gaussian Splatting is leveraged for quick visualization – as images come in, points (Gaussians) are added to a 3D canvas, allowing an immediate visual of surfaces without waiting for full meshing. This approach yields fast, real-time visualization by reducing computational requirements compared to traditional modeling (Gaussian splatting vs. photogrammetry vs. NeRFs – pros and cons | Teleport). The trade-off is that this preliminary model might be a bit noisy or less detailed than a full mesh, but it’s available live. OverWatch can display this partial 3D model, giving the team a sense of coverage (e.g., “we have the starboard side fully modeled except under that overhang – need more images there”). Once the drone finishes, the HPC refines this into a final high-detail mesh and texture.


AI Defect Detection Pipeline: In tandem with reconstruction, the HPC runs one or multiple AI inference pipelines:


2D Defect Detection: A deep CNN (possibly an ensemble for reliability) processes each full-resolution image or a tiled set of images. This model is trained on examples of coating failure (rust streaks, bubbling paint, exposed metal) and can classify image regions as “defect” or “okay.” Using the power of the on-site GPUs, the server can process images quickly after they arrive – e.g., within a few seconds per image. The results per image (like masks of rust areas) are then geo-referenced: because we know the camera pose from photogrammetry, a rust spot in an image can be mapped onto the 3D model’s coordinates.


3D Defect Mapping: As the 3D model builds, another approach is to work directly in 3D. The point cloud or mesh can be analyzed with algorithms to find anomalies in surface geometry (blistering might create slight bumps) or in texture consistency. Moreover, using frameworks for large-scale 3D data (such as NVIDIA’s fVDB library), the system can handle the entire ship point cloud in GPU memory and apply a 3D segmentation model (Publications | Francis Williams). For instance, a neural network might look at each point’s color and normal vector and decide if it’s corroded metal or painted surface. The combination of LiDAR geometry and photo texture improves accuracy – shiny metal might reflect differently in LiDAR intensity returns, giving another clue.


Threshold and QC Checks: Not all detection is AI-based; some simpler checks run too. For example, a color histogram analysis might flag any area with a sudden change in color (indicative of primer showing through). The system also checks image quality (blur, exposure) and notifies if any image is too low-quality (prompting a re-shoot).


Mission Feedback Loop: The key aspect of data flow is the feedback to the operators during the mission. Any defects or coverage issues detected by the above pipelines are sent to OverWatch promptly. OverWatch might pop up an alert (“Possible rust detected on Portside Frame 27”) and highlight that region on the 2D map or 3D model. The imaging technician can click that alert and see the image or model view of the suspect area. This tight loop allows the team to decide on additional data collection before wrapping up the flight. For example, if the AI isn’t confident (maybe it sees something that could be rust or just dirt), the team can pilot the drone closer to get a better look. In essence, the system behaves like a smart assistant, pointing out “hey, look here!” while humans make the judgment calls in real time.


Data Recording and Handover: All data flows culminate in a comprehensive dataset stored on the NAS and server. After processing, the final labeled 3D model and all annotated images are saved. OverWatch can package up these results (images with defect annotations, the 3D model file, etc.) for the report. The network architecture (10 GbE + WiFi) also allows sharing this data on-site; for instance, the team lead could connect a laptop to the network and immediately start reviewing results (even if not using OverWatch directly).


Computer Vision Inference Stack (Live Defect Detection)
To support live coating defect detection, the system uses a stack of specialized hardware and software:
Edge AI on Jetson: The Jetson AGX Xavier (64 GB) runs a trimmed version of the defect detection model for quick preliminary analysis. For example, a YOLOv5-based model (trained for rust spots) or a custom segmentation model (like an ERFNet or small U-Net variant) could run at a low resolution on each new frame. The Jetson’s GPU and CUDA acceleration make it possible to get, say, a 480p image analysis in real-time. This is used for immediate alerts and also to guide the camera (the system could autonomously decide to take a zoomed-in photo if it suspects a defect).


High-Performance GPUs for Full Analysis: The on-site server is equipped with top-end NVIDIA GPUs (such as RTX 6000 Ada generation or even an HGX class module). These provide the muscle for running heavy deep-learning models on the full data. The software stack here includes PyTorch for model execution, with frameworks like NVIDIA’s CV-CUDA or TensorRT to speed up inference on high-res images. The defect detection model on the server is more sophisticated than the edge model – for instance, it might be a Mask R-CNN or a transformer-based segmentation model that can take the 100 MP image (possibly split into tiles) and output pixel-level segmentation of problem areas. If any open-source or proprietary models exist specifically for corrosion detection, those would be integrated. (Many research efforts on surface defect detection can be leveraged – e.g., models used in automotive paint inspection or infrastructure crack detection are repurposed here).


3D Reconstruction & AI Integration: Photogrammetry uses software like RealityCapture or open-source alternatives, but it is enhanced with new techniques (NeRF or Gaussian Splatting modules). The pipeline might incorporate the recent research from NVIDIA (e.g., neural reconstruction as in Instant NeRF or SCube VoxSplat for large scenes) to speed up and improve the model (Publications | Francis Williams) (Publications | Francis Williams). This gives a visual model and can produce a consistent coordinate system for all sensor data. Once in this coordinate system, the CV stack can fuse insights: an AI that saw rust in Image #50 and one that saw it in Image #51 will combine those findings to mark a specific 3D location as rust.


Frameworks from fwilliams.info and Others: (Francis Williams’ work is relevant here.) The NVIDIA fVDB framework (Publications | Francis Williams) is an example of technology that allows deep learning on massive sparse 3D data – perfect for a full ship point cloud. Using such a framework, the stack can perform tasks like point cloud semantic segmentation or apply Neural Radiance Fields for parts of the scene to verify surface material properties. The system might use Point Cloud Utils (another fwilliams project) or similar libraries to filter and process the point clouds efficiently. All this ensures the defect detection isn’t just image-by-image but rather holistic using the 3D context.


Continuous Learning and Simulation: OverWatch includes a simulation environment that can generate synthetic defects on a model of the ship (for example, simulating rust patches) to validate the CV pipeline. This way, before actual deployment, the team can test if the inference stack would catch certain types of defects. Data collected from real inspections can be fed back into training to improve the models over time (on separate training rigs, likely back at headquarters, not on-site).


Output for Inspectors: The final output of the CV stack highlights coating failures for the human inspectors. This could be in the form of:


Colored overlays on the 3D model (e.g., all detected rust in red).


Auto-generated callouts in the OverWatch UI (clickable markers at defect locations).


A prioritized list of findings (with confidence levels) for review in the field.


Importantly, the system is designed to assist, not replace, the inspector’s judgment. The live detection helps ensure nothing is missed, and speeds up the workflow, but the team can verify each flagged spot via the high-res imagery on their OverWatch interface.


Operational Modes: Tethered vs. Untethered
Flexibility is built in to handle scenarios when the tether cannot be used:
Primary Tethered Mode (80% of operation): In most cases (especially exterior hull inspection in open dock), the drone remains tethered. This mode provides continuous power and reliable high-bandwidth data. The drone can carry the heavier PhaseOne camera without flight time concerns because power is unlimited. Data transfer is instantaneous – thousands of images can stream down live. Control is robust via Ethernet (low latency, no RF interference issues from the metal ship). Tethered mode is also a safety boon: the drone is physically constrained to the site and can have an emergency kill power from the ground if needed. The drawback is limited range (the tether length) and a need to avoid entanglement with ship structures, but careful planning and an on-board tether tension monitor mitigate these issues. Throughout tethered flight, the onboard battery stays charged via the tether; it is essentially in hot standby.


Backup Untethered Mode (up to 20%): Some parts of a ship might require the drone to go where the tether can’t – for example, deep inside a compartment or to the far side of a large vessel if the tether reel is not mid-ship. In these cases, the drone can detach from the tether (or the mission may start without ta ether if known in advance). In untethered mode, the drone relies on battery power and wireless communication:


Power: The drone’s battery (fully charged from tether or pre-flight) might allow, say, 20-30 minutes of flight. This is sufficient to handle a focused inspection of a small area. Non-tether mode is used judiciously to get data in hard-to-reach spots and then return to tether.


Data Link: Without tether, the 10 GbE link is lost, so the system falls back to a wireless link. The drone is equipped with a high-speed radio, potentially a 6 GHz Wi-Fi client or a 5 GHz MIMO data link. This can still provide a few hundred Mbps at short range. OverWatch will automatically switch to using this link for telemetry and video. However, sending every 100 MP image over Wi-Fi is not practical in real-time. Instead, the Jetson intelligently buffers and manages data: critical data (like a lower-res video feed, or thumbnails of images as they’re taken) are sent live, whereas the raw full-res images are recorded to onboard storage. The Jetson might save images to an internal SSD or NVMe. LiDAR data could be throttled or summarized (e.g., keyframes or subsets) for live transmission. The pilot and imaging tech still receive enough data to monitor the mission (perhaps a 4K feed or a subset of images), but the bulk will be retrieved later.


Control: In untethered mode, the drone is controlled via an RF link. The ground controllers and/or OverWatch switch to a paired radio system (could be a standard 2.4 GHz control link or a custom high-bandwidth link). MAVLink commands can go over this RF link. The system has a seamless failover – for instance, if the tether connection is lost unexpectedly, the drone’s autopilot will immediately revert to the failsafe radio control to ensure continued command and control. This redundancy prevents losing the drone if, say, the tether cable is severed or communication through it fails.


Mission Continuity: The operators might plan an untethered segment deliberately. For example, after doing the hull on tether, they land, disconnect tether, then fly up and over a mast to inspect an enclosed antenna area. OverWatch will note “Switching to untethered mode” and possibly limit some functions (like it might warn that live model updates will be slower). The crew conducts that segment, then brings the drone back to re-tether (or simply lands to manually reconnect the tether).


Data Sync After Flight: Once the drone is back on tether or landed, all data stored onboard is transferred to the ground systems. This could happen via reconnecting the tether 10 GbE or, if landing first, plugging the drone’s storage into the server. OverWatch then integrates those images into the photogrammetry project, and the defect detection runs on them as well. Thanks to precise drone positioning from the autopilot, even offline-collected images can be accurately placed into the global model.


Fail-safes and Safety: In either mode, safety features are in place. If the tether is providing power and it fails, the drone automatically falls back on the battery and alerts the pilot. If communications drop (in any mode), the drone’s flight controller will enter a hover or return-to-home state. The tether reel has a quick release in case of emergencies (to avoid dragging the drone). And importantly, the entire system is tested to handle transitions gracefully – e.g., if the tether gets snagged mid-mission and the operator needs to release it, the drone should smoothly continue on battery and not lose link (the RF takes over). All of this ensures that flexibility in operation doesn’t compromise reliability.


In summary, tethered mode is the default for the majority of the work, exploiting unlimited power and data, while untethered mode is a strategic option for special cases. The system’s design allows switching between these modes with minimal interruption.
Multi-Operator Control and Role Handoff
Efficient inspection requires two skilled operators – one focusing on flying the drone and another focusing on capturing quality data. The architecture supports dual operators with easy handoff of controls:
Dual Operator Setup: The system is configured for two-person control from the start. As is common in professional drone operations, the pilot concentrates on navigation, and a camera operator handles the imaging (Single Operator vs Dual Operator Drone - Aerialworx). The pilot’s handheld shows flight telemetry, while the imaging tech’s device shows camera view and settings. Both are connected to the OverWatch software, which synchronizes their inputs.


Gimbal and Camera Control: The imaging operator normally has exclusive control of the gimbal (camera pan/tilt) and camera trigger. They can line up shots independent of the drone’s orientation, while the pilot maintains a stable hover. This division of labor ensures that the camera can always be aimed optimally at the inspection surface, without overloading a single operator.


Control Authority Handoff: The system allows dynamic handoff of the drone’s movement control between the two controllers if needed. For example, if the pilot wants the imaging tech (who might have a better view on their screen) to fine-tune the drone position near a structure, the pilot can initiate a “handover” in OverWatch. With a confirmation, the imaging tech’s controller becomes the primary flight controller. They might use this to make small lateral adjustments or approach the structure closer for detail shots. Once done, they can hand control back to the pilot for relocating to the next area. This handoff mechanism is designed to be seamless – much like DJI’s dual remote feature where control can be passed without hiccups in flight. OverWatch manages the arbitration so that at any given time only one control input is commanding the drone’s flight, avoiding conflict.


Collaborative Workflow: During the mission, there may be moments where one operator has to take over both roles briefly (for instance, if the imaging tech is troubleshooting a camera setting, the pilot might also trigger the camera). OverWatch’s interface supports this: either controller can pull up both flight and camera controls in an emergency. Generally, however, they operate in tandem – “pilot in command” and “payload operator” roles. Voice communication between the two is continuous (usually via headset) to coordinate maneuvers and image capture (“Move 2 meters left… hold there – capturing… okay, got it.”).


Ground Control Station (OverWatch) Oversight: The OverWatch application itself can be used by a supervisor to see the bigger picture. For instance, a mission commander on a laptop can observe the mission progress and even step in to take control if necessary. This means roles are not just limited to those two handhelds – control is effectively network-based. Any authorized device on the mesh network running OverWatch could request control. This is useful for training (an instructor could override a student pilot) or for safety (if one controller fails, another device can send a halt command).


Interface Customization: The handheld controllers (like Steam Decks) are configured with profiles: a “Flight Ops” profile and an “Imaging” profile. At any time, an operator can switch profile if they need to swap roles. The physical controls (buttons, joysticks) remap accordingly. For example, the imaging tech’s device might normally map the joysticks to gimbal movement; if they take over the drone, the joysticks remap to drone roll/pitch. The UI on OverWatch will highlight clearly who has control – e.g., an indicator “Flight Control: Operator 1 (Pilot)” or after handoff “Flight Control: Operator 2 (Imaging Tech)”.


Handoff in Untethered Scenarios: In tethered mode, all control goes through the network (low latency). In untethered mode, typically the pilot’s RC link is primary. If the imaging operator needs to control during untethered flight, their controller either must also have an RC link to the drone or the pilot physically hands them the primary controller. To avoid hardware swaps, the system could employ a dual-band RC system where both controllers are linked to the drone (one as master, one as secondary). Then a handoff in software would switch which one is master. This is similar to how some enterprise drones allow a second controller to take over beyond a certain range. Our system anticipates this and ensures both controllers remain synced whether on IP network or direct RF.


Safety and Authorization: Only authenticated controllers can connect to OverWatch and control the drone. This prevents any rogue takeover. OverWatch logs every handoff and control input, which is useful for post-mission debriefing or if any incident occurs.


Role Flexibility: While typically, the pilot and imaging tech are distinct persons, the architecture doesn’t hard-code that. In a pinch, a single operator could use OverWatch on a laptop to do both flying and imaging (especially if the mission is mostly autonomous). Alternatively, more than two operators can be involved – e.g., one pilot, one camera, and another specialist monitoring the live 3D model and AI outputs to direct attention. The networked nature of control allows a team-centric operation. For leadership observing, OverWatch can be put on a large screen where they watch the inspection progress in real-time, seeing what the drone sees and what the AI finds. This keeps everyone, from engineers to managers, in the loop live.


Conclusion and Key Benefits
By integrating a tethered drone platform with high-end sensors and an advanced computing pipeline, this architecture enables unprecedented detail in ship inspections. The <1 mm GSD imagery achieved with the Phase One camera means even hairline cracks or the start of rust blisters can be visualized (3D Bridge Inspection | Achieve 1mm Pixel Detail with iXM-100). Combining that with LiDAR yields accurate 3D models of the ship’s surface. The on-site HPC with modern photogrammetry (e.g. Gaussian Splatting) produces a 3D digital twin of the vessel in near real-time, and the AI-driven analysis (inspired by frameworks like fwilliams’ fVDB for large-scale data) pinpoints defects automatically.
Throughout the mission, the OverWatch software harmonizes the efforts of the pilot and imaging technician, aided by the robust tethered network. The result is a smooth workflow from start (mission planning, simulation) to finish (interactive 3D inspection report). Importantly, the system provides immediate feedback – real-time damage identification helps the team focus on critical spots during the flight, not after (Case Study: Designing an AI Driven Inspection Drone for Wind Farms - Connect Tech Inc.). The tethered operation guarantees flight endurance and data throughput, while the ability to go untethered adds versatility for hard-to-reach areas. Multi-operator control with easy handoff ensures that the experts can apply their skills exactly when and where needed, without stepping on each other’s toes.
In summary, this architecture offers a comprehensive, state-of-the-art solution for ship coating inspections:
It captures extremely high-resolution data safely and efficiently.


It processes that data on the fly to guide inspection in real-time.


It leverages powerful compute for deep analysis (identifying coating failures with high confidence).


It supports collaborative operation and adaptable mission profiles (tethered/untethered).


It delivers a rich 3D output that both engineering teams and leadership can utilize for maintenance planning.


By following the structured workflow and using the hardware/software stack described, inspection teams can significantly reduce inspection time and costs while improving the quality and accuracy of findings. This means earlier detection of coating issues, better maintenance decisions, and ultimately, longer ship longevity with fewer unexpected failures.
Sources: The approach builds on proven concepts in high-res aerial inspection and AI. For instance, Phase One’s iXM-100 has been used to achieve ~1 mm detail in infrastructure inspections (3D Bridge Inspection | Achieve 1mm Pixel Detail with iXM-100), and real-world AI drones have shown that even microscopic damage can be detected via 3D AI modeling (Case Study: Designing an AI Driven Inspection Drone for Wind Farms - Connect Tech Inc.). Tethered drones are known to provide fast data links and continuous power for unlimited flight time (Tethered Drone Power Management for Unlimited Flight Time | Vicor). New 3D vision methods (NeRFs, Gaussian splatting) make real-time large-scale reconstruction feasible (Gaussian splatting vs. photogrammetry vs. NeRFs – pros and cons | Teleport). NVIDIA’s research into large-scale 3D deep learning (Publications | Francis Williams) inspires the defect detection pipeline for pinpointing rust on expansive structures. Finally, dual-operator and handoff control practices (Single Operator vs Dual Operator Drone - Aerialworx) ensure that this advanced technology is operable in the field by a well-coordinated crew. The result is a cutting-edge yet field-tested inspection system ready for the most demanding ship survey missions.

