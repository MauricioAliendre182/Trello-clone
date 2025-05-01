# Use the official Golang image
FROM golang:1.24.2-alpine

# Add git for go mod download
RUN apk add --no-cache git

# Set working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download Go dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the Go application
RUN go build -o main .

# Expose the port the app runs on
EXPOSE 8090

# Run the application
CMD ["/app/main"]