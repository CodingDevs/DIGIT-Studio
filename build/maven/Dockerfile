# Stage 1: Build the Go binary
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS build

ARG WORK_DIR
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

# Install git (sometimes required by Go modules)
RUN apk add --no-cache git

# Copy go.mod and go.sum, then download dependencies
COPY ${WORK_DIR}/go.mod ${WORK_DIR}/go.sum ./
RUN go mod download

# Copy source code
COPY ${WORK_DIR}/ ./

# Build the Go binary for the target platform
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o service-binary

# Stage 2: Create a minimal runtime image
FROM --platform=$TARGETOS/$TARGETARCH alpine:3.18

WORKDIR /opt/egov

# Copy the binary and start script
COPY --from=build /app/service-binary .
COPY build/maven/start.sh .

# Make start.sh executable
RUN chmod +x ./start.sh

# Optional: Print architecture inside container
RUN echo "Built for $(uname -m)"

CMD ["./start.sh"]
