# Data Sync

This is a monorepo for the Data Sync project.

## Pushing to GitHub

The repository has been initialized with Git and the GitHub repository has been added as a remote. However, authentication is required to push to GitHub. Here are several methods to authenticate:

### Method 1: Use SSH instead of HTTPS

1. Generate an SSH key if you don't have one:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add the SSH key to your GitHub account:
   - Copy the public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub Settings > SSH and GPG keys > New SSH key
   - Paste the key and save

3. Change the remote URL to use SSH:
   ```bash
   git remote set-url origin git@github.com:sunergeo/data-sync.git
   ```

4. Push to GitHub:
   ```bash
   git push -u origin main
   ```

### Method 2: Use a Personal Access Token (PAT) with HTTPS

1. Create a Personal Access Token on GitHub:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token
   - Select the necessary scopes (at least `repo`)
   - Copy the generated token

2. Use the token when pushing:
   ```bash
   git push -u origin main
   ```
   When prompted for a password, use the personal access token instead.

3. Alternatively, store the credentials:
   ```bash
   git config credential.helper store
   ```
   Then push once and enter your credentials.

### Method 3: Use GitHub CLI

1. Install GitHub CLI: https://cli.github.com/
2. Authenticate with GitHub CLI:
   ```bash
   gh auth login
   ```
3. Push to GitHub:
   ```bash
   git push -u origin main
   ```

### Method 4: Use GitHub Desktop

1. Install GitHub Desktop: https://desktop.github.com/
2. Add the local repository to GitHub Desktop
3. Push to GitHub using the GUI

## Repository Structure

- `packages/data-sync-server`: Server-side SDK for data synchronization
- `packages/data-sync-client`: Client-side SDK for data synchronization
- `packages/storage-adapters`: Storage adapters for different backends
- `packages/examples`: Example implementations

## Docker Support

See [README.Docker.md](README.Docker.md) for information on running the application with Docker.