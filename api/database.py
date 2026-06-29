"""
Snowflake connection manager for resolute-truenicks-api.
Auth: RSA key from SF_RSA_KEY_B64 env var (base64-encoded PEM).
"""

import asyncio
import base64
import logging
import os
from contextlib import contextmanager
from typing import Generator

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    load_pem_private_key,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# RSA key helper
# ---------------------------------------------------------------------------

def _load_rsa_private_key():
    """Decode SF_RSA_KEY_B64 and return a private key object."""
    raw_b64 = os.environ.get("SF_RSA_KEY_B64", "")
    if not raw_b64:
        raise RuntimeError("SF_RSA_KEY_B64 environment variable is not set")
    pem_bytes = base64.b64decode(raw_b64)
    private_key = load_pem_private_key(pem_bytes, password=None, backend=default_backend())
    return private_key


def _private_key_der_bytes() -> bytes:
    """Return the DER bytes of the RSA private key for the Snowflake connector."""
    private_key = _load_rsa_private_key()
    return private_key.private_bytes(
        encoding=Encoding.DER,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption(),
    )


# ---------------------------------------------------------------------------
# Connection factory
# ---------------------------------------------------------------------------

def get_connection() -> snowflake.connector.SnowflakeConnection:
    """Open and return a new Snowflake connection using RSA key auth."""
    account = os.environ.get("SF_ACCOUNT", "mvsgjpv-resolute")
    user = os.environ.get("SF_USER", "RESOLUTE_ADMIN")
    warehouse = os.environ.get("SF_WAREHOUSE", "RESOLUTE_AI_WH")
    database = os.environ.get("SF_DATABASE", "RESOLUTE_MIND")
    schema = os.environ.get("SF_SCHEMA", "RACING_DATA")

    conn = snowflake.connector.connect(
        account=account,
        user=user,
        private_key=_private_key_der_bytes(),
        warehouse=warehouse,
        database=database,
        schema=schema,
        # Network / session settings
        login_timeout=30,
        network_timeout=60,
        client_session_keep_alive=True,
    )
    return conn


@contextmanager
def db_cursor() -> Generator[snowflake.connector.cursor.SnowflakeCursor, None, None]:
    """
    Context manager that yields a dict cursor and auto-closes the connection.

    Usage::

        with db_cursor() as cur:
            cur.execute("SELECT 1")
            row = cur.fetchone()
    """
    conn = get_connection()
    try:
        cur = conn.cursor(snowflake.connector.DictCursor)
        try:
            yield cur
        finally:
            cur.close()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Health probe
# ---------------------------------------------------------------------------

def check_db_health() -> bool:
    """Return True if Snowflake is reachable, False otherwise."""
    try:
        with db_cursor() as cur:
            cur.execute("SELECT 1 AS alive")
            row = cur.fetchone()
            return bool(row and row.get("ALIVE") == 1)
    except Exception as exc:
        logger.warning("DB health check failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Background keep-warm task
# ---------------------------------------------------------------------------

async def _keep_warm_loop() -> None:
    """Ping Snowflake every 55 seconds to prevent warehouse suspension."""
    while True:
        await asyncio.sleep(55)
        try:
            alive = await asyncio.get_event_loop().run_in_executor(None, check_db_health)
            if alive:
                logger.debug("Keep-warm ping: OK")
            else:
                logger.warning("Keep-warm ping: FAILED")
        except Exception as exc:
            logger.warning("Keep-warm task error: %s", exc)


def start_keep_warm() -> asyncio.Task:
    """Schedule the keep-warm loop as a background asyncio task."""
    loop = asyncio.get_event_loop()
    task = loop.create_task(_keep_warm_loop())
    return task
