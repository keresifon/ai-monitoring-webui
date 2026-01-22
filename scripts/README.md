# Image Tag Update Script

This script automatically updates the image tag in `charts/values.yaml` when a new tag is created, preparing the chart for deployment.

## Usage

### Manual Update

```bash
# Check what the latest tag is (without updating)
python scripts/update-image-tag.py --check-only

# Update the values.yaml file to latest tag
python scripts/update-image-tag.py --update

# Update to a specific tag
python scripts/update-image-tag.py --update --tag v1.2.3

# Get just the latest tag value
python scripts/update-image-tag.py --get-latest
```

### With Custom Repository

```bash
python scripts/update-image-tag.py --repository ghcr.io/your-org/your-repo --update
```

### With GitHub Token (for private repos or rate limiting)

```bash
export GITHUB_TOKEN=your_token_here
python scripts/update-image-tag.py --update
```

## GitHub Actions Workflow

The `.github/workflows/update-image-tag.yml` workflow automatically updates `values.yaml` when:

1. **A new release is published** - Triggers on `release: published` or `release: created` events
2. **A new tag is pushed** - Triggers when tags matching `v*` or semantic version patterns are pushed
3. **Repository dispatch** - Can be triggered from another workflow (e.g., when image is built)
4. **Manual trigger** - Can be manually triggered with an optional tag input

The workflow will:
- Detect the new tag from the triggering event
- Update `charts/values.yaml` with the new tag
- Commit and push directly to the branch (or create a PR if push fails)

### Setup

1. **Update the repository path** in `charts/values.yaml`:
   ```yaml
   image:
     repository: ghcr.io/YOUR-ORG/YOUR-REPO
   ```

2. **For repository dispatch triggers** (from image build workflow):
   - Create a Personal Access Token with `repo` scope
   - Add it as a secret named `DEPLOY_REPO_TOKEN` in the repository that builds the image
   - Update `.github/workflows/example-image-build-trigger.yml` with your repository name

3. **Workflow permissions**: The workflow needs `contents: write` permission (already configured)

## How It Works

1. The script queries the GHCR API to get all available tags
2. It filters out the 'latest' tag and finds the most recent semantic version
3. It compares with the current tag in `values.yaml`
4. If different, it updates the file (or creates a PR in GitHub Actions)

## Requirements

- Python 3.7+
- `pyyaml` package
- `requests` package

Install dependencies:
```bash
pip install pyyaml requests
```
