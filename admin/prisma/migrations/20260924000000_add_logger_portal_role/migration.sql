-- Adds LOGGER to the shared PortalRole enum (customer-portal staff role
-- for package-details editing + scan-to-locate). Purely additive — no
-- existing row uses this value yet, so unlike the earlier Role enum split
-- this doesn't need the create-new-type/remap/rename dance.
ALTER TYPE "PortalRole" ADD VALUE 'LOGGER';
