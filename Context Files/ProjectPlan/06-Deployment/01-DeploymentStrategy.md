# Deployment Strategy

## Overview

This document outlines the deployment strategy for the OverWatch Mission Control application. It covers the deployment process across development, staging, and production environments, as well as the tools, configurations, and best practices to ensure reliable and consistent deployments.

## Deployment Environments

### Development Environment

**Purpose**: For ongoing development and testing.

**Characteristics**:
- Configured for rapid iteration
- Debug and development tools enabled
- Local or shared development cluster
- Automatic deployments from feature branches
- Mocked services for testing

**Resources**:
- Smaller resource allocation
- Ephemeral data storage
- Scaled-down instances

### Staging Environment

**Purpose**: Pre-production validation and testing.

**Characteristics**:
- Production-like configuration
- Isolated from development and production
- Used for integration testing
- Final testing ground before production
- Connected to test hardware systems

**Resources**:
- Similar to production but potentially scaled down
- Persistent data storage with regular cleanup
- Representative of production environment

### Production Environment

**Purpose**: Live environment for end-users.

**Characteristics**:
- Optimized for reliability and performance
- Strict access controls
- Comprehensive monitoring and alerting
- Connected to actual hardware systems
- High availability configuration

**Resources**:
- Full resource allocation
- Persistent and backed-up data storage
- Auto-scaling based on demand

## Containerization Strategy

The application is containerized using Docker to ensure consistency across environments.

### Frontend Container

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
```

### Backend Service Containers

```dockerfile
# Backend Service Dockerfile (e.g., ROS Bridge Service)
FROM ros:noetic

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Build any ROS packages
RUN /bin/bash -c "source /opt/ros/noetic/setup.bash && catkin_make"

# Source setup.bash in .bashrc
RUN echo "source /opt/ros/noetic/setup.bash" >> ~/.bashrc
RUN echo "source /app/devel/setup.bash" >> ~/.bashrc

# Command to run on container start
CMD ["/bin/bash", "-c", "source /opt/ros/noetic/setup.bash && source /app/devel/setup.bash && roslaunch ros_bridge_service ros_bridge.launch"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD rostopic list | grep /rosbridge_websocket/connected_clients || exit 1
```

## Kubernetes Deployment

The application is deployed on Kubernetes for orchestration and management.

### Namespace Strategy

```
overwatch-dev      # Development environment
overwatch-staging  # Staging environment
overwatch-prod     # Production environment
```

### Frontend Deployment

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overwatch-frontend
  namespace: overwatch-${ENVIRONMENT}
  labels:
    app: overwatch
    tier: frontend
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: overwatch
      tier: frontend
  template:
    metadata:
      labels:
        app: overwatch
        tier: frontend
    spec:
      containers:
      - name: frontend
        image: ${REGISTRY}/overwatch-frontend:${TAG}
        ports:
        - containerPort: 80
        env:
        - name: API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: overwatch-config
              key: api_base_url
        - name: ROSBRIDGE_URL
          valueFrom:
            configMapKeyRef:
              name: overwatch-config
              key: rosbridge_url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Backend Service Deployment

```yaml
# rosbridge-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overwatch-rosbridge
  namespace: overwatch-${ENVIRONMENT}
  labels:
    app: overwatch
    tier: backend
    service: rosbridge
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: overwatch
      tier: backend
      service: rosbridge
  template:
    metadata:
      labels:
        app: overwatch
        tier: backend
        service: rosbridge
    spec:
      containers:
      - name: rosbridge
        image: ${REGISTRY}/overwatch-rosbridge:${TAG}
        ports:
        - containerPort: 9090
        env:
        - name: ROS_MASTER_URI
          valueFrom:
            configMapKeyRef:
              name: overwatch-config
              key: ros_master_uri
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: overwatch-config
              key: log_level
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - /bin/bash
            - -c
            - "rostopic list | grep /rosbridge_websocket/connected_clients"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/bash
            - -c
            - "rostopic list | grep /rosbridge_websocket/connected_clients"
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service Definitions

```yaml
# frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: overwatch-frontend
  namespace: overwatch-${ENVIRONMENT}
spec:
  selector:
    app: overwatch
    tier: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```yaml
# rosbridge-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: overwatch-rosbridge
  namespace: overwatch-${ENVIRONMENT}
spec:
  selector:
    app: overwatch
    tier: backend
    service: rosbridge
  ports:
  - port: 9090
    targetPort: 9090
  type: ClusterIP
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: overwatch-ingress
  namespace: overwatch-${ENVIRONMENT}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "1800"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "1800"
spec:
  tls:
  - hosts:
    - ${ENVIRONMENT}.overwatch.example.com
    secretName: overwatch-tls-${ENVIRONMENT}
  rules:
  - host: ${ENVIRONMENT}.overwatch.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: overwatch-frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: overwatch-api-gateway
            port:
              number: 8000
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: overwatch-rosbridge
            port:
              number: 9090
```

### ConfigMaps and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: overwatch-config
  namespace: overwatch-${ENVIRONMENT}
data:
  api_base_url: "https://${ENVIRONMENT}.overwatch.example.com/api"
  rosbridge_url: "wss://${ENVIRONMENT}.overwatch.example.com/ws"
  ros_master_uri: "http://ros-master:11311"
  log_level: "${LOG_LEVEL}"
```

```yaml
# secrets.yaml (Do not store in version control, use Kubernetes secrets management)
apiVersion: v1
kind: Secret
metadata:
  name: overwatch-secrets
  namespace: overwatch-${ENVIRONMENT}
type: Opaque
data:
  db_password: ${BASE64_DB_PASSWORD}
  jwt_secret: ${BASE64_JWT_SECRET}
  rosbridge_auth_key: ${BASE64_ROSBRIDGE_AUTH_KEY}
```

## CI/CD Pipeline

The continuous integration and continuous deployment pipeline automates the build, test, and deployment process.

### Github Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies - Frontend
        run: |
          cd FrontEnd
          npm ci

      - name: Lint and Test - Frontend
        run: |
          cd FrontEnd
          npm run lint
          npm run test

      - name: Build - Frontend
        run: |
          cd FrontEnd
          npm run build

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies - Backend
        run: |
          cd BackEnd
          pip install -r requirements.txt

      - name: Lint and Test - Backend
        run: |
          cd BackEnd
          pytest

  build-and-push-images:
    needs: build-and-test
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Log in to the Container registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set environment and tag
        id: vars
        run: |
          if [[ ${{ github.ref }} == 'refs/heads/main' ]]; then
            echo "ENVIRONMENT=prod" >> $GITHUB_ENV
            echo "TAG=$(git describe --tags --always)" >> $GITHUB_ENV
          else
            echo "ENVIRONMENT=dev" >> $GITHUB_ENV
            echo "TAG=dev-$(git rev-parse --short HEAD)" >> $GITHUB_ENV
          fi

      - name: Build and push Frontend image
        uses: docker/build-push-action@v4
        with:
          context: ./FrontEnd
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ env.TAG }}

      - name: Build and push ROS Bridge image
        uses: docker/build-push-action@v4
        with:
          context: ./BackEnd/ros_bridge_service
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-rosbridge:${{ env.TAG }}

      - name: Build and push API Gateway image
        uses: docker/build-push-action@v4
        with:
          context: ./BackEnd/api_gateway
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-api-gateway:${{ env.TAG }}

  deploy:
    needs: build-and-push-images
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set environment and tag
        id: vars
        run: |
          if [[ ${{ github.ref }} == 'refs/heads/main' ]]; then
            echo "ENVIRONMENT=prod" >> $GITHUB_ENV
            echo "TAG=$(git describe --tags --always)" >> $GITHUB_ENV
            echo "REPLICAS=3" >> $GITHUB_ENV
          else
            echo "ENVIRONMENT=dev" >> $GITHUB_ENV
            echo "TAG=dev-$(git rev-parse --short HEAD)" >> $GITHUB_ENV
            echo "REPLICAS=1" >> $GITHUB_ENV
          fi

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v1
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Deploy to Kubernetes
        env:
          REGISTRY: ${{ env.REGISTRY }}
          IMAGE_NAME: ${{ env.IMAGE_NAME }}
          TAG: ${{ env.TAG }}
          ENVIRONMENT: ${{ env.ENVIRONMENT }}
          REPLICAS: ${{ env.REPLICAS }}
          LOG_LEVEL: ${{ env.ENVIRONMENT == 'prod' ? 'info' : 'debug' }}
        run: |
          # Replace variables in manifest files
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${REGISTRY}/$REGISTRY/g" {} \;
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${IMAGE_NAME}/$IMAGE_NAME/g" {} \;
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${TAG}/$TAG/g" {} \;
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${ENVIRONMENT}/$ENVIRONMENT/g" {} \;
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${REPLICAS}/$REPLICAS/g" {} \;
          find ./k8s -type f -name "*.yaml" -exec sed -i "s/\${LOG_LEVEL}/$LOG_LEVEL/g" {} \;
          
          # Apply manifests
          kubectl apply -f ./k8s/namespace.yaml
          kubectl apply -f ./k8s/configmap.yaml
          kubectl apply -f ./k8s/secrets.yaml
          kubectl apply -f ./k8s/deployments/
          kubectl apply -f ./k8s/services/
          kubectl apply -f ./k8s/ingress.yaml
```

## Deployment Workflow

### Development Deployment

1. Developer commits code to feature branch
2. Pull request opened against `develop` branch
3. CI/CD pipeline builds and tests code
4. Upon merge to `develop`:
   - Docker images built and tagged with commit hash
   - Images pushed to container registry
   - Automatically deployed to development environment
5. Developers test on development environment

### Staging Deployment

1. Release candidate created from `develop` branch
2. CI/CD pipeline builds and tests code
3. Docker images built and tagged with release candidate version
4. Images pushed to container registry
5. Manually triggered deployment to staging environment
6. QA team performs testing on staging environment

### Production Deployment

1. Release branch merged to `main` after staging validation
2. CI/CD pipeline builds and tests code
3. Docker images built and tagged with release version
4. Images pushed to container registry
5. Manually approved deployment to production environment
6. Post-deployment smoke tests performed

## Rollback Strategy

### Immediate Rollback Process

In case of failed deployment or critical issues:

1. **Identify Issue**: Determine the nature and severity of the problem
2. **Decision to Rollback**: Made by the release manager or on-call engineer
3. **Execute Rollback**:
   ```bash
   # Rollback to previous deployment
   kubectl rollout undo deployment/overwatch-frontend -n overwatch-${ENVIRONMENT}
   kubectl rollout undo deployment/overwatch-rosbridge -n overwatch-${ENVIRONMENT}
   kubectl rollout undo deployment/overwatch-api-gateway -n overwatch-${ENVIRONMENT}
   ```
4. **Verify Rollback**: Confirm system is functioning correctly
5. **Post-Mortem**: Conduct analysis to prevent similar issues

### Version-Specific Rollback

For rolling back to a specific previous version:

```bash
# Rollback to specific version
kubectl set image deployment/overwatch-frontend \
  frontend=${REGISTRY}/${IMAGE_NAME}-frontend:${PREVIOUS_TAG} \
  -n overwatch-${ENVIRONMENT}

kubectl set image deployment/overwatch-rosbridge \
  rosbridge=${REGISTRY}/${IMAGE_NAME}-rosbridge:${PREVIOUS_TAG} \
  -n overwatch-${ENVIRONMENT}

kubectl set image deployment/overwatch-api-gateway \
  api-gateway=${REGISTRY}/${IMAGE_NAME}-api-gateway:${PREVIOUS_TAG} \
  -n overwatch-${ENVIRONMENT}
```

## Blue-Green Deployment (Production)

For zero-downtime updates in production:

```yaml
# blue-green-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overwatch-frontend-${COLOR}
  namespace: overwatch-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: overwatch
      tier: frontend
      color: ${COLOR}
  template:
    metadata:
      labels:
        app: overwatch
        tier: frontend
        color: ${COLOR}
    spec:
      containers:
      - name: frontend
        image: ${REGISTRY}/${IMAGE_NAME}-frontend:${TAG}
        # ... other configuration ...
```

```yaml
# service-switcher.yaml
apiVersion: v1
kind: Service
metadata:
  name: overwatch-frontend
  namespace: overwatch-prod
spec:
  selector:
    app: overwatch
    tier: frontend
    color: ${ACTIVE_COLOR}  # blue or green
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

Blue-green deployment process:
1. Deploy new version with inactive color (`blue` or `green`)
2. Run tests against new deployment
3. Switch traffic to new deployment by updating service selector
4. Monitor for issues
5. If successful, decommission old deployment
6. If issues, switch traffic back to old deployment

## Monitoring and Observability

### Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing
- **Alertmanager**: Alerts and notifications

### Health Checks and Readiness

All services implement:
- **Liveness Probes**: To detect if a service is running
- **Readiness Probes**: To detect if a service is ready to accept traffic

### Logging Strategy

- Structured JSON logging
- Log levels appropriate to environment
- Correlation IDs across services
- Centralized log collection and analysis

### Key Metrics

- **Application Metrics**:
  - Request rates and latencies
  - Error rates
  - Worker queue depths
  - Active connections

- **System Metrics**:
  - CPU and memory usage
  - Network I/O
  - Disk usage and I/O
  - Container health

### Alerting

Critical alerts are sent to:
- Slack channels
- Email for on-call team
- SMS for urgent issues

## Backup and Disaster Recovery

### Database Backups

- **Frequency**: 
  - Hourly incremental backups
  - Daily full backups
  - Weekly offsite backups

- **Retention Policy**:
  - Hourly backups: 24 hours
  - Daily backups: 30 days
  - Weekly backups: 3 months

### Disaster Recovery

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Disaster Recovery Plan**:
  1. Restore latest backup to secondary region
  2. Verify data integrity
  3. Switch DNS to point to secondary region
  4. Validate system functionality

## Security Considerations

### Image Scanning

All container images are scanned for vulnerabilities using:
- GitHub Advanced Security
- Trivy for container scanning

### Network Security

- All communications secured with TLS
- Network policies restrict pod-to-pod communication
- Service mesh (optional) for mTLS between services

### Secrets Management

- Kubernetes secrets for sensitive information
- Never check secrets into version control
- Rotate secrets regularly

### Access Control

- RBAC for Kubernetes resources
- Limited production access
- Audit logging for all access

## Environment-Specific Configurations

| Configuration | Development | Staging | Production |
|---------------|------------|---------|------------|
| Replicas | 1 | 2 | 3+ |
| Resources | Minimal | Medium | Full allocation |
| Logging | Debug | Info | Warning/Error |
| Features | All (incl. experimental) | Release candidate | Stable only |
| TLS | Self-signed | Let's Encrypt Staging | Let's Encrypt Prod |
| Monitoring | Basic | Full | Full with alerting |
| Backups | None | Daily | Hourly + DR |

## Conclusion

This deployment strategy ensures reliable, secure, and consistent deployment of the OverWatch Mission Control application across all environments. By leveraging containerization, Kubernetes orchestration, and automated CI/CD pipelines, the system maintains high availability and provides a smooth path from development to production. 