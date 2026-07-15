# Code runner with the language toolchains the "Run" button needs.
# Node is the base; add C/C++ (build-essential → gcc/g++/cc/c++), Python 3, and a JDK.
FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        default-jdk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# The runner is pure Node (no npm dependencies), so just copy the server.
COPY server.js ./

ENV RUNNER_PORT=5055
ENV RUNNER_DATA_DIR=/data

EXPOSE 5055

# Non-root user (defence in depth). /data holds the persisted test cases and is
# owned by that user so the mounted volume inherits writable ownership.
RUN useradd -m runner \
    && mkdir -p /data \
    && chown -R runner:runner /app /data
USER runner

CMD ["node", "server.js"]
