# Docker Support for Data Sync Server

This directory contains a Dockerfile that can be used to build and run the Data Sync Server in a containerized environment.

## Building the Docker Image

From the root of the repository, run:

```bash
docker build -t data-sync-server -f packages/data-sync-server/Dockerfile .
```

## Running the Docker Container

After building the image, you can run the container with:

```bash
docker run -p 3000:3000 data-sync-server
```

This will start the server and expose it on port 3000 on your host machine.

## Environment Variables

The server supports the following environment variables:

- `PORT`: The port on which the server will listen (default: 3000)

Example:

```bash
docker run -p 8080:8080 -e PORT=8080 data-sync-server
```

## Using a Custom Storage Adapter

The example server uses a MemoryAdapter for storage, which is suitable for demonstration purposes but not for production use. In a real-world scenario, you would want to use a persistent storage adapter.

To use a custom storage adapter, you would need to:

1. Create a new server implementation that uses your preferred storage adapter
2. Build a custom Docker image based on this Dockerfile

## Security Considerations

- The server uses a simple API key validation mechanism. In a production environment, you should implement a more robust authentication system.
- The Docker container runs as a non-root user for improved security.
- Consider using Docker secrets or environment variables to manage sensitive information like API keys and database credentials.

## Production Deployment

For production deployment, consider:

- Using a container orchestration system like Kubernetes or Docker Swarm
- Setting up proper monitoring and logging
- Implementing a more robust authentication system
- Using a persistent storage adapter
- Setting up HTTPS with a proper certificate