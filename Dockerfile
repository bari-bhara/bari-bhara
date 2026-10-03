FROM node:24-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12.6.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install scripts only fetch the Supabase CLI binary and lint tooling; the build needs neither.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
# NEXT_PUBLIC_* values are built into the client bundle.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
