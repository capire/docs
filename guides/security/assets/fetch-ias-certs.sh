#!/bin/bash
# filepath: ./fetch-ias-certs.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <service-instance> [cert-file] [key-file]"
  exit 1
fi

SERVICE_INSTANCE="$1"
CERT_FILE="${2:-cert.pem}"
KEY_FILE="${3:-key.pem}"
SERVICE_KEY="${SERVICE_INSTANCE}-key"

# Check if cf CLI is logged in
if ! cf target > /dev/null 2>&1; then
  echo "Error: Not logged in to Cloud Foundry. Please run 'cf login' and try again."
  exit 1
fi

# Check if service key exists
if ! cf service-key "$SERVICE_INSTANCE" "$SERVICE_KEY" > /dev/null 2>&1; then
  cf create-service-key "$SERVICE_INSTANCE" "$SERVICE_KEY" -c '{"credential-type": "X509_GENERATED"}'
else
  echo "Service key $SERVICE_KEY already exists."
fi


# Extract service key JSON
SERVICE_KEY_JSON=$(cf service-key "$SERVICE_INSTANCE" "$SERVICE_KEY" 2>&1 | awk '/^{/ {found=1} found' )

# Extract and convert certificate
echo "$SERVICE_KEY_JSON" | jq -r 'if has("credentials") then .credentials.certificate else .certificate end' | sed 's/\\n/\n/g' > "$CERT_FILE"
echo "Certificate written to $CERT_FILE"

# Extract and convert key
echo "$SERVICE_KEY_JSON" | jq -r 'if has("credentials") then .credentials.key else .key end' | sed 's/\\n/\n/g' > "$KEY_FILE"
echo "Key written to $KEY_FILE"

echo "DON'T SHARE GERNERATED CERTIFICATE FILES!"
