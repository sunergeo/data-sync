# Publishing @sunergeo/data-sync Packages to npm

This guide provides step-by-step instructions for publishing the @sunergeo/data-sync packages to npm.

## Prerequisites

1. **npm Account**: You need an npm account with access to the @sunergeo organization.
2. **Authentication**: You need to be logged in to npm with the appropriate credentials.

## Authentication

Before publishing, you need to set up authentication with npm. There are two ways to do this:

### Option 1: Login with npm CLI

```bash
# Login to npm
npm login

# Verify you're logged in and have access to the @sunergeo organization
npm whoami
npm org ls @sunergeo
```

### Option 2: Use an npm token (recommended for CI/CD)

1. Generate an npm token:
   ```bash
   npm token create --read-only=false
   ```

2. Set the token as an environment variable:
   ```bash
   # For Linux/macOS
   export NPM_TOKEN=your-npm-token

   # For Windows Command Prompt
   set NPM_TOKEN=your-npm-token

   # For Windows PowerShell
   $env:NPM_TOKEN="your-npm-token"
   ```

3. Verify the token is set:
   ```bash
   echo $NPM_TOKEN
   ```

The project includes a `.npmrc` file that uses this environment variable for authentication.

## Versioning

Before publishing, you should update the version numbers in each package's package.json file. Follow semantic versioning:

- **Major version (1.0.0)**: Breaking changes
- **Minor version (0.1.0)**: New features, no breaking changes
- **Patch version (0.0.1)**: Bug fixes and minor changes

You can update the versions manually in each package.json file, or use npm version:

```bash
# In each package directory
cd packages/data-sync-client
npm version patch  # or minor, or major

cd ../data-sync-server
npm version patch

cd ../storage-adapters
npm version patch
```

## Building and Testing

Before publishing, make sure all packages build and pass tests:

```bash
# From the root directory
yarn build
yarn test
```

## Publishing

The root package.json includes scripts for publishing each package individually or all at once:

### Yarn-Specific Authentication

When using Yarn to publish packages, there are a few additional considerations:

1. Yarn uses its own configuration for npm registry authentication
2. Make sure your NPM_TOKEN environment variable is set before running any publish commands
3. Yarn 2+ (Berry) handles authentication differently than Yarn Classic

For Yarn 2+ (Berry), you may need to add the following to your `.yarnrc.yml` file:

```yaml
npmRegistries:
  "https://registry.npmjs.org":
    npmAuthToken: "${NPM_TOKEN}"
```

### Publishing Individual Packages

```bash
# Publish client package
yarn publish-client

# Publish server package
yarn publish-server

# Publish storage adapters package
yarn publish-storage-adapters
```

### Publishing All Packages

```bash
# Build, test, and publish all packages
yarn publish-all
```

### Publishing with npm Instead of Yarn

If you encounter persistent authentication issues with Yarn, you can use npm directly:

```bash
# Navigate to the package directory
cd packages/data-sync-client

# Publish with npm
npm publish --access public
```

## Handling Workspace Dependencies

The packages in this monorepo use Yarn workspace references (e.g., "workspace:*") for dependencies between packages. When publishing, Yarn will automatically replace these references with the actual version numbers.

## Troubleshooting

### Authentication Issues

If you encounter authentication issues:

1. Make sure you're logged in: `npm whoami`
2. Check that you have access to the @sunergeo organization: `npm org ls @sunergeo`
3. Try logging out and logging in again: `npm logout && npm login`

If you see the error "No authentication configured for request":

1. Check that your NPM_TOKEN environment variable is set correctly: `echo $NPM_TOKEN`
2. Verify that the .npmrc file exists in the project root and contains the correct configuration
3. Try setting the authentication token directly in the .npmrc file (not recommended for shared repositories):
   ```
   //registry.npmjs.org/:_authToken=your-npm-token
   @sunergeo:registry=https://registry.npmjs.org/
   ```
4. If using Yarn, try running with the `--verbose` flag to see more details about the authentication issue:
   ```bash
   yarn publish --verbose
   ```

### Version Conflicts

If npm refuses to publish because the version already exists:

1. Update the version in the package's package.json file
2. Rebuild the package: `yarn build`
3. Try publishing again

### Dependency Issues

If there are issues with dependencies:

1. Make sure all dependencies are correctly specified in the package.json files
2. Check that workspace dependencies are correctly resolved during publishing
3. If necessary, manually update the dependency versions in the package.json files

## After Publishing

After publishing, verify that the packages are available on npm:

```bash
npm view @sunergeo/data-sync-client
npm view @sunergeo/data-sync-server
npm view @sunergeo/data-sync-storage-adapters
```

You can also install the packages from npm to verify they work correctly:

```bash
# Create a test directory
mkdir test-install
cd test-install

# Initialize a new project
npm init -y

# Install the packages
npm install @sunergeo/data-sync-client @sunergeo/data-sync-server @sunergeo/data-sync-storage-adapters

# Verify the packages are installed correctly
ls node_modules/@sunergeo
```
