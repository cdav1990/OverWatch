# Deployment Workflow

This document outlines the process for deploying the OverWatch application to different environments.

## Environments

OverWatch supports three deployment environments:

1. **Development (dev)**: For ongoing development and testing
2. **Staging (staging)**: For pre-production testing
3. **Production (prod)**: Live environment for end users

## Prerequisites

Before deployment, ensure you have:

1. Access credentials for the target environment
2. Latest approved code from the main branch
3. Necessary environment variables
4. Required deployment tools installed

## Deployment Process

### 1. Prepare the Build

#### Frontend Build

1. Ensure you're on the correct branch (usually `main` for production)
2. Update the environment variables in `.env` for the target environment:

```bash
cd FrontEnd
cp .env.example .env.production
# Edit .env.production with the appropriate values
```

3. Install dependencies and build:

```bash
npm install
npm run build
```

This creates optimized production files in the `dist` directory.

#### Backend Build

1. Navigate to the backend directory:

```bash
cd ../BackEnd
```

2. Set up the environment variables:

```bash
cp .env.example .env.production
# Edit .env.production with the appropriate values
```

3. Install dependencies and build:

```bash
npm install
npm run build
```

### 2. Run Tests

Before deploying, run tests to ensure everything is working correctly:

```bash
# Frontend tests
cd ../FrontEnd
npm run test

# Backend tests
cd ../BackEnd
npm run test
```

### 3. Deploy to Environment

#### Development Deployment

Development deployment is handled automatically by the CI/CD pipeline when code is pushed to the `develop` branch.

#### Staging Deployment

1. Tag the release candidate:

```bash
git tag -a v1.2.3-rc.1 -m "Release candidate 1 for version 1.2.3"
git push origin v1.2.3-rc.1
```

2. The CI/CD pipeline will automatically deploy to staging.

3. Alternatively, manually deploy:

```bash
cd deployment
./deploy.sh staging
```

#### Production Deployment

1. Create a release tag:

```bash
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

2. The CI/CD pipeline will automatically deploy to production.

3. Alternatively, manually deploy:

```bash
cd deployment
./deploy.sh production
```

### 4. Post-Deployment Steps

After deployment, perform the following checks:

1. **Smoke Tests**: Verify basic functionality
2. **Database Migrations**: Ensure they ran successfully
3. **Monitoring**: Check logs for any errors
4. **Performance**: Verify the application performance

## Rollback Procedure

If issues occur after deployment, follow these steps to roll back:

1. Identify the last known good version
2. Deploy that version using the same deployment process
3. Verify the application is functional after rollback
4. Investigate the issue that caused the need for rollback

```bash
# Example rollback command
cd deployment
./rollback.sh production v1.2.2
```

## Environment-Specific Configurations

### Development Environment

- **URL**: https://dev.overwatch.com
- **Backend API**: https://dev-api.overwatch.com
- **Features**: All features, including experimental ones
- **Purpose**: Developer testing and integration

### Staging Environment

- **URL**: https://staging.overwatch.com
- **Backend API**: https://staging-api.overwatch.com
- **Features**: Same as production, no experimental features
- **Purpose**: Pre-production testing and stakeholder review

### Production Environment

- **URL**: https://overwatch.com
- **Backend API**: https://api.overwatch.com
- **Features**: Stable, approved features only
- **Purpose**: End-user access

## Deployment Schedule

- **Development**: Continuous, as needed
- **Staging**: Weekly releases (typically Thursdays)
- **Production**: Bi-weekly releases (typically every other Monday)

## Monitoring and Maintenance

After deployment, monitor the application using:

1. **Application Logs**: Check for errors and exceptions
2. **Performance Metrics**: Monitor response times and resource usage
3. **User Feedback**: Address any reported issues

## Deployment Commands Reference

| Command | Description |
|---------|-------------|
| `./deploy.sh dev` | Deploy to development environment |
| `./deploy.sh staging` | Deploy to staging environment |
| `./deploy.sh production` | Deploy to production environment |
| `./rollback.sh [env] [version]` | Rollback to previous version |
| `./status.sh [env]` | Check deployment status |

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check database credentials in environment variables
   - Verify network connectivity to the database

2. **Missing Environment Variables**
   - Ensure all required variables are set in the environment file
   - Check for typos in variable names

3. **Build Failures**
   - Check npm errors
   - Verify dependencies are up to date

4. **Permission Issues**
   - Ensure deployment user has correct permissions
   - Check file ownership in deployment directories

## Conclusion

Following this deployment workflow ensures smooth and reliable updates to the OverWatch application. Always test thoroughly before deploying to production, and be prepared to roll back if issues occur. 