# Dataset Explorer

A full-stack web application for exploring public datasets from [HuggingFace](https://huggingface.co/datasets), with user authentication, dataset following, combination, and impact assessment.

---

## Features

- **User Authentication:** Register and sign in with email/password.
- **Public Dataset Browsing:** View, search, and paginate HuggingFace datasets.
- **Dataset Details:** View dataset info and commit history.
- **Follow/Unfollow:** Track datasets you care about.
- **Combine Datasets:** Select and combine datasets, with impact assessment.
- **Impact Assessment:** 
  - *Naive*: Based on total size.
  - *Advanced*: Based on semantic clustering of descriptions.
- **Modern UI:** Responsive, user-friendly React frontend.

---

## Tech Stack

- **Backend:** FastAPI (Python), SQLAlchemy, JWT Auth
- **Frontend:** React (JavaScript)
- **Database:** SQLite (default, can be swapped)
- **Testing:** pytest (backend), Jest + React Testing Library (frontend)

---

## Project Structure

### Backend Structure (/backend)

- **__init__.py:** Makes backend a Python package.
- **database.py:** Sets up the database connection using SQLAlchemy.
- **main.py:** FastAPI application and endpoints.
- **models.py:** SQLAlchemy ORM models for database tables.
- **schemas.py:** Pydantic schemas for data validation.
- **security.py:** Authentication and JWT handling.
- **huggingface.py:** HuggingFace API client and impact assessment.
- **users.db:** SQLite database file.

### Frontend Structure (/src)

- **components/AuthForm.js:** Handles user authentication.
- **components/Dashboard.js:** User's home page.
- **components/DatasetList.js:** List of datasets.
- **components/DatasetDetail.js:** Dataset details page.
- **components/FollowedDatasets.js:** User's followed datasets.
- **components/CombineDatasets.js:** Dataset combination form.
- **components/CombinedDatasets.js:** List of user's combined datasets.
- **components/CombinedDatasetDetail.js:** Combined dataset details.
- **components/Navbar.js:** Navigation bar.
- **App.css:** Global styles.
- **App.js:** Main React component with routes.
- **index.css:** Basic CSS reset.
- **index.js:** Entry point.
- **reportWebVitals.js:** Performance monitoring.
- **setupTests.js:** Testing configuration.

---

## Clustering Explanation

The application uses clustering for advanced impact assessment of combined datasets. Here's how it works:

- **Semantic Clustering:** The backend uses the `sentence-transformers` library to generate embeddings for dataset descriptions.
- **KMeans Clustering:** The `scikit-learn` library's KMeans algorithm is used to cluster these embeddings.
- **Impact Assessment:** The number of unique clusters determines the impact level:
  - **Low Impact:** Descriptions are semantically similar (single cluster).
  - **Medium Impact:** Descriptions form two distinct semantic clusters.
  - **High Impact:** Descriptions are diverse and form multiple semantic clusters.

---

## Installation Instructions

### Backend Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/dataset-explorer.git
   cd dataset-explorer
   ```

2. **Set Up Virtual Environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Backend:**
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. **Install Dependencies:**
   ```bash
   cd ../
   npm install
   ```

2. **Run the Frontend:**
   ```bash
   npm start
   ```

---

## Production Deployment

### Backend (FastAPI)

**Recommended: Use Gunicorn with Uvicorn workers**
```bash
cd backend
pip install gunicorn uvicorn
export HUGGINGFACE_API_TOKEN=your_token_here
gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (React)

**Build for production:**
```bash
npm run build
```

---

## Docker & Docker Compose

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --upgrade pip && pip install -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)
```dockerfile
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
    environment:
      - HUGGINGFACE_API_TOKEN=${HUGGINGFACE_API_TOKEN}
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
```

### How to Run with Docker Compose
```bash
# In project root (where docker-compose.yml is)
export HUGGINGFACE_API_TOKEN=your_token_here
docker-compose up --build
```

---

## Running Tests

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
npm test
```

---

## Troubleshooting

- **CORS errors:** Ensure both frontend (`localhost:3000`) and backend (`localhost:8000`) are running.
- **ModuleNotFoundError:** Run `pip install -r requirements.txt` in the backend directory.
- **HuggingFace API issues:** Make sure your API token is valid and set as an environment variable if needed.

---

## Advanced System Design

### 1. Deployment Strategies
- **Blue-Green Deployment:** Deploy new versions alongside the old, switch traffic when ready, and roll back instantly if issues arise.
- **Rolling Deployment:** Gradually replace old instances with new ones, minimizing downtime.
- **Canary Releases:** Release new features to a small subset of users before full rollout.
- **Containerization:** Use Docker for consistent environments and easy orchestration.
- **Orchestration:** Use Kubernetes or Docker Compose for managing containers, scaling, and self-healing.
- **Best Practice:** Automate deployments with CI/CD pipelines (e.g., GitHub Actions, GitLab CI, Jenkins).

### 2. API Scaling Strategies
- **Horizontal Scaling:** Deploy multiple instances of the backend behind a load balancer (e.g., Nginx, AWS ELB, GCP Load Balancer).
- **Stateless Services:** Ensure API servers are stateless; use external storage (DB, cache) for state.
- **Caching:** Use CDN and HTTP caching for static assets and public dataset responses. Use Redis or Memcached for frequently accessed data (e.g., user sessions, popular datasets).
- **Rate Limiting & Throttling:** Protect APIs from abuse and ensure fair usage (e.g., with API gateways or middleware).
- **Asynchronous Processing:** Offload heavy or long-running tasks (e.g., impact assessment, clustering) to background workers (Celery, RQ, Sidekiq).
- **API Gateway:** Use an API gateway for authentication, routing, and monitoring.
- **Industry Example:** Netflix, Twitter, and other large-scale services use stateless microservices, load balancing, and aggressive caching.

### 3. Database Scaling
- **Vertical Scaling:** Start by increasing resources (CPU, RAM, SSD) on the DB server.
- **Read Replicas:** Add read replicas to distribute read-heavy workloads.
- **Sharding:** Partition data across multiple databases (e.g., by user ID or region) to avoid single-node bottlenecks.
- **Connection Pooling:** Use connection pools (e.g., SQLAlchemy's pool, PgBouncer) to efficiently manage DB connections.
- **NoSQL for Unstructured Data:** For large, unstructured, or high-throughput data, consider NoSQL solutions (e.g., MongoDB, Cassandra).
- **Best Practice:** Regularly back up data and test restore procedures.

### 4. Monitoring & Debugging
- **Application Monitoring:** Use tools like Prometheus, Grafana, Datadog, or New Relic to monitor API latency, error rates, and resource usage.
- **Logging:** Centralize logs with ELK Stack (Elasticsearch, Logstash, Kibana), Loki, or cloud logging solutions.
- **Tracing:** Use distributed tracing (e.g., Jaeger, Zipkin, OpenTelemetry) to follow requests across services.
- **Alerting:** Set up alerts for error spikes, high latency, or resource exhaustion.
- **Health Checks:** Implement `/health` endpoints for readiness and liveness probes (used by load balancers and orchestrators).
- **Debugging:** Enable detailed error logs in staging, use correlation IDs for tracing requests, and capture stack traces for exceptions.

### 5. Database Query Optimization
- **Indexing:** Add indexes to columns used in WHERE, JOIN, and ORDER BY clauses (e.g., user email, dataset IDs).
- **Query Profiling:** Use `EXPLAIN` to analyze and optimize slow queries.
- **Batching:** Batch writes and reads to reduce round-trips (e.g., bulk inserts, `IN` queries).
- **Avoid N+1 Queries:** Use eager loading (e.g., SQLAlchemy's `joinedload`) to fetch related data in fewer queries.
- **Caching:** Cache expensive query results in Redis or Memcached.
- **Connection Pooling:** Reuse DB connections to reduce overhead.
- **Best Practice:** Regularly review slow query logs and refactor as needed.

### 6. Summary Table

| Concern                | Best Practice / Solution                                      |
|------------------------|--------------------------------------------------------------|
| Deployment             | Blue-Green, Rolling, Canary, Docker, CI/CD                   |
| API Scaling            | Load Balancing, Statelessness, Caching, Rate Limiting        |
| DB Scaling             | Read Replicas, Sharding, Connection Pooling, NoSQL           |
| Monitoring/Debugging   | Prometheus, Grafana, ELK, Tracing, Health Checks             |
| Query Optimization     | Indexing, Profiling, Batching, Avoid N+1, Caching            |

