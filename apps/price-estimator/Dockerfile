FROM python:3.12-slim

WORKDIR /app

# Install git (required for fetching the github repo) and other basic dependencies
RUN apt-get update && apt-get install -y git wget gnupg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright system dependencies (required for camoufox headless browser)
# We use playwright install-deps which automatically installs missing X11/GTK libs
RUN playwright install-deps

# Pre-fetch camoufox browser binaries
RUN python -m camoufox fetch

COPY . .

# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
