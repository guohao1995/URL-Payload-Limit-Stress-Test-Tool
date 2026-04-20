# URL & Payload Limit Stress Test Tool

A URL & Payload Limit Stress Test Tool designed to find the breaking points of server URL path lengths and request payload size limits.

## Overview

When building APIs that accept collections of IDs — such as batch lookups, bulk operations, or filtered queries — developers often encounter two cryptic HTTP errors:

- **HTTP 413 (Payload Too Large)** — The request **body** exceeds the server's or infrastructure's configured size limit. This can be triggered by Express `json({ limit })`, Nginx `client_max_body_size`, Azure Container Apps ingress, or any reverse proxy in the request chain.
- **HTTP 431 (Request Header Fields Too Large)** — The **URL path** or request headers exceed the allowed length. Stuffing thousands of IDs into the URL (e.g., `/data/1001,1002,...,9999/details`) quickly hits Node.js's default 16KB header limit, proxy URL caps, or browser maximums.

These errors are especially tricky because they can originate from **any layer** in the stack — your application code, a reverse proxy, a load balancer, or a cloud platform's ingress controller — and the error responses often provide little indication of which layer rejected the request.

This tool provides a hands-on way to reproduce and diagnose both errors. It uses a **mock dataset of 3,000 fake pet hospital IDs** (randomly generated 4–5 digit numbers with no relation to any real entities) to simulate increasingly large requests. By selecting different numbers of hospitals and toggling between URL-path and body-based payloads, you can pinpoint the exact thresholds where each layer breaks — and verify your fix across the entire chain.

<img width="3570" height="1919" alt="image" src="https://github.com/user-attachments/assets/bd029c75-8466-43c0-a50f-33c9dca98925" />

## 📁 Project Structure

```
ACA-file-limit/
├── ui-app/                    # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── HospitalStressTest.tsx   # Main stress test component
│   │   └── data/
│   │       └── hospitals.ts             # 3000 mock pet hospitals
│   ├── Dockerfile
│   └── package.json
│
└── server-app/                # Express Backend
    ├── server.js              # Mock API server
    ├── Dockerfile
    └── package.json
```

---

## 🖥️ UI App (React/TypeScript)

**Purpose:** Provides an interactive interface to select hospitals and trigger API requests with varying payload sizes.

### Features:
- **3000 Mock Pet Hospitals** with random 4-5 digit IDs
- **Quick Select Buttons:** Select first 100, 500, 1000, 1050...2000 hospitals
- **Custom Number Input:** Enter any number to select
- **Real-time Stats Dashboard:**
  - URL Length (characters)
  - Path Length (characters)  
  - Selected Count
  - Estimated Header Size (bytes)
- **Auto-send Requests:** Toggle automatic request on selection change
- **Request History:** View last 10 requests with status

### Request Format:
```
POST http://localhost:3001/hospitals/v1/data/{ids}/details
Content-Type: application/json

{
  "hospitalIds": [1234, 5678, 9012, ...]
}
```

---

## 🔧 Server App (Node.js/Express)

**Purpose:** Mock API server with configurable body size limits to simulate 413 errors.

### Configuration:
```javascript
// server.js - Line 12
app.use(express.json({ limit: '10kb' }));  // Adjust to trigger 413
```

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hospitals/v1/data/:ids/details` | Accepts hospitalIds in body |
| GET | `/hospitals/v1/data/:ids/details` | IDs in URL path |

---

## 🚀 Quick Start

### Local Development (npm)

```bash
# Terminal 1: Start server
cd server-app
npm install
node server.js

# Terminal 2: Start UI
cd ui-app
npm install
npm start
```

- UI: http://localhost:3000
- Server: http://localhost:3001

### Docker

```bash
# Build images
cd ui-app && docker build -t stress-test-ui .
cd server-app && docker build -t stress-test-server .

# Run containers
docker run -d -p 80:80 --name stress-test-ui stress-test-ui
docker run -d -p 3001:3001 --name stress-test-server stress-test-server
```

---

## 🔴 413 Error Analysis

### What is 413?

**HTTP 413 Payload Too Large** - The server refuses to process a request because the request body exceeds the server's configured limit.

### 413 vs 431 Comparison

| Error Code | Name | Cause |
|------------|------|-------|
| **413** | Payload Too Large | Request **body** exceeds limit |
| **431** | Request Header Fields Too Large | URL path or **headers** exceed limit |

### Where Does 413 Come From?

```
Browser
    ↓ POST request
Load Balancer / Reverse Proxy (Nginx, Azure Front Door)  ← Can reject here
    ↓
Ingress Controller (Kubernetes, Azure Container Apps)    ← Can reject here
    ↓
Application Server (Express, Spring Boot, etc.)          ← Can reject here
    ↓
Your Application Code
```

**How to identify the source:**
| Response | Source |
|----------|--------|
| Empty body, no JSON | Proxy/Gateway/Infrastructure |
| Custom JSON error message | Your application code |

---

## 🛠️ Solutions by Platform

### Node.js / Express
```javascript
app.use(express.json({ limit: '50mb' }));
```

### Java / Spring Boot
```properties
# application.properties
server.tomcat.max-http-form-post-size=52428800
spring.servlet.multipart.max-request-size=50MB
```

### Python / Flask
```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
```

### .NET / ASP.NET Core
```csharp
builder.WebHost.ConfigureKestrel(o => 
    o.Limits.MaxRequestBodySize = 52428800);
```

### Nginx (Reverse Proxy)
```nginx
client_max_body_size 50M;
```

### Azure Container Apps
```bash
az containerapp ingress update \
  --name your-app \
  --resource-group your-rg \
  --max-request-body-bytes 52428800
```

---

## 📊 Known Limits Reference

| Component | Default Limit |
|-----------|---------------|
| Node.js HTTP Headers | 16KB |
| Express JSON Body | 100KB |
| Nginx client_max_body_size | 1MB |
| Azure Container Apps Ingress | 4MB |
| AWS Lambda | 6MB (sync) |
| Chrome URL | ~2MB |
| IIS maxUrl | 16KB |

---

## ✅ Best Practices

1. **Use POST instead of GET** for large data sets
2. **Implement pagination** - batch requests in chunks
3. **Use compression** (gzip) to reduce payload size
4. **Send filter criteria** instead of all IDs
5. **Check ALL layers** - app server AND proxy limits
6. **Set reasonable limits** - 10-50MB covers most use cases

---

## 📝 Test Results Summary

Using this tool, you can determine:
- At what point your server returns 413
- Whether 413 comes from your app or infrastructure
- The exact payload/URL size limits for your environment

Example findings:
- **~150-200 hospitals** with 10KB limit → triggers 413
- **~2600+ hospitals** in URL path → triggers 431 (header too large)
