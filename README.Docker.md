# Running Data Sync with Docker Compose

This repository includes Docker support for easily running the Data Sync application using Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd data-sync
   ```

2. Start the application using Docker Compose:
   ```bash
   docker-compose up
   ```

   This will build the Docker image if it doesn't exist and start the server.

3. To run the application in the background:
   ```bash
   docker-compose up -d
   ```

4. To stop the application:
   ```bash
   docker-compose down
   ```

## Configuration

The Docker Compose configuration includes:

- **Port Mapping**: The server is accessible on port 3000 (http://localhost:3000)
- **Environment Variables**: 
  - `NODE_ENV=production`: Sets the Node.js environment to production
  - `PORT=3000`: Sets the port the server listens on
- **Package Manager**: 
  - The project uses Yarn 4.0.0 as specified in the `packageManager` field in package.json
  - Corepack is enabled in the Docker configuration to ensure the correct Yarn version is used

You can modify these settings in the `docker-compose.yml` file.

## Accessing the API

Once the server is running, you can access the API endpoints:

- Status: http://localhost:3000/status
- Sync: http://localhost:3000/sync (POST)
- Attachments: 
  - Upload: http://localhost:3000/attachments (POST)
  - Download: http://localhost:3000/attachments/:id (GET)

Remember to use the API key "demo-api-key" for authentication as specified in the example server.

## Development with Docker Compose

The Docker Compose configuration includes a dedicated development service (`data-sync-server-dev`) that is optimized for development with auto-restart functionality.

### Auto-Restart on Code Changes

To start the development service with auto-restart:

```bash
docker-compose up data-sync-server-dev
```

This service:
1. Mounts your local source code as volumes inside the container
2. Uses nodemon to watch for file changes
3. Automatically restarts the server whenever you modify any TypeScript file

### How It Works

The development service:
- Builds from the same Dockerfile but stops at the dependencies stage
- Mounts the source code directories as volumes
- Installs all project dependencies in the container
- Uses nodemon to watch for changes in the TypeScript files
- Runs the server using ts-node with tsconfig-paths for module resolution
- Configures TypeScript to properly resolve workspace packages
- Sets NODE_ENV to development

### Benefits

- No need to rebuild the Docker image after code changes
- Immediate feedback during development
- TypeScript files are compiled on-the-fly
- All changes are reflected instantly in the running container

## Troubleshooting

- **Container fails to start**: Check the logs with `docker-compose logs`
- **Cannot access the API**: Ensure the container is running with `docker-compose ps` and that no other service is using port 3000
- **Health check fails**: The container includes a health check that verifies the server is responding. If it fails, check the logs for errors.
- **Yarn version issues**: If you encounter errors related to Yarn version, ensure that Corepack is enabled in your Docker configuration. The project requires Yarn 4.0.0 as specified in the `packageManager` field in package.json.
- **TypeScript compilation errors**: If you encounter TypeScript errors about missing modules or type definitions, the development container has been configured to handle monorepo TypeScript projects by:
  - Installing all dependencies with `yarn install`
  - Using tsconfig-paths to resolve module paths in the monorepo
  - Configuring the TypeScript compiler to properly resolve workspace packages
  - Using the local tsconfig.json file with the correct paths mappings

  If you still encounter issues, check the logs with `docker-compose logs data-sync-server-dev` to see the specific errors.
