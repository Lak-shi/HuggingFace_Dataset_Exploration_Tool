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

## Local Setup & Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dataset-explorer.git
cd dataset-explorer
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# (Optional) Set HuggingFace API token for private dataset access
export HUGGINGFACE_API_TOKEN=your_token_here
uvicorn main:app --reload
```
- The backend will run at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd ../
npm install
npm start
```
- The frontend will run at `http://localhost:3000`.

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
- For production, use a process manager (e.g., systemd, supervisor) and a reverse proxy (e.g., Nginx).

### Frontend (React)

**Build for production:**
```bash
npm run build
```
- This creates a `build/` directory with static files.
- Serve with a static file server (e.g., Nginx, serve, or as part of a Docker container).

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
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)

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

---

## Contribution

Pull requests are welcome! Please open an issue first to discuss major changes.

---

## License

MIT

---

## Acknowledgements

- [HuggingFace Datasets](https://huggingface.co/datasets)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/) 