"""
tests/test_marketplace.py
--------------------------
Integration tests for the Dexaview Marketplace API.

These tests use an in-memory SQLite database so no external MySQL instance is
required to run the test suite. Each test function gets a freshly created set
of tables to guarantee isolation.

Run with:
    pytest tests/ -v
"""

import decimal
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import Base, get_db
from app.models import User
from app.routers.auth import hash_password
from main import app

# ---------------------------------------------------------------------------
# Test database (SQLite in-memory – no MySQL required)
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Override the database dependency before any request is made
app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Creates all tables before each test and drops them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Returns an async TestClient bound to the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def creator_token(client):
    """
    Registers a creator account and returns its JWT token.
    This is the fixture to use when testing endpoints that require a creator.
    """
    await client.post(
        "/api/auth/register",
        json={
            "email": "creator@test.com",
            "username": "testcreator",
            "password": "securepass123",
            "is_creator": True,
        },
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": "creator@test.com", "password": "securepass123"},
    )
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def buyer_token(client):
    """Registers a consumer account and returns its JWT token."""
    await client.post(
        "/api/auth/register",
        json={
            "email": "buyer@test.com",
            "username": "testbuyer",
            "password": "securepass123",
            "is_creator": False,
        },
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": "buyer@test.com", "password": "securepass123"},
    )
    return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# Tests – Authentication
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_and_login(client):
    """A new user can register and then log in to receive a JWT token."""
    reg = await client.post(
        "/api/auth/register",
        json={
            "email": "user@example.com",
            "username": "exampleuser",
            "password": "password123",
        },
    )
    assert reg.status_code == 201
    assert reg.json()["username"] == "exampleuser"

    login = await client.post(
        "/api/auth/login",
        data={"username": "user@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login fails with 401 when the password is incorrect."""
    await client.post(
        "/api/auth/register",
        json={"email": "a@a.com", "username": "auser", "password": "correctpass"},
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": "a@a.com", "password": "wrongpass"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Tests – Marketplace
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_asset(client, creator_token):
    """A creator can list a new asset and the response contains the expected fields."""
    resp = await client.post(
        "/api/marketplace/assets",
        json={
            "title": "Offshore Drilling Rig",
            "description": "High-fidelity GLB model of a semi-submersible rig.",
            "glb_url": "https://cdn.example.com/rig.glb",
            "industry": "oil_gas",
            "price_usd": "9.99",
        },
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Offshore Drilling Rig"
    assert data["industry"] == "oil_gas"
    assert float(data["price_usd"]) == 9.99


@pytest.mark.asyncio
async def test_non_creator_cannot_list_asset(client, buyer_token):
    """A non-creator account should receive 403 when attempting to list an asset."""
    resp = await client.post(
        "/api/marketplace/assets",
        json={
            "title": "Fake Asset",
            "glb_url": "https://cdn.example.com/fake.glb",
            "industry": "oil_gas",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_purchase_asset_credits_creator(client, creator_token, buyer_token):
    """
    After a buyer purchases an asset, the creator's balance should increase by
    the correct post-fee amount and the purchase record should be returned.
    """
    # Creator lists a $10 asset
    create_resp = await client.post(
        "/api/marketplace/assets",
        json={
            "title": "Server Farm Module",
            "glb_url": "https://cdn.example.com/server.glb",
            "industry": "data_center",
            "price_usd": "10.00",
        },
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    asset_id = create_resp.json()["id"]

    # Buyer purchases the asset
    buy_resp = await client.post(
        f"/api/marketplace/assets/{asset_id}/buy",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert buy_resp.status_code == 200
    data = buy_resp.json()

    # Platform takes 10%, so creator earns $9.00
    assert decimal.Decimal(str(data["creator_earnings"])) == decimal.Decimal("9.00")
    assert decimal.Decimal(str(data["amount_paid"])) == decimal.Decimal("10.00")
    assert "glb_url" in data


@pytest.mark.asyncio
async def test_duplicate_purchase_rejected(client, creator_token, buyer_token):
    """A buyer cannot purchase the same asset twice."""
    create_resp = await client.post(
        "/api/marketplace/assets",
        json={
            "title": "Dup Asset",
            "glb_url": "https://cdn.example.com/dup.glb",
            "industry": "oil_gas",
            "price_usd": "5.00",
        },
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    asset_id = create_resp.json()["id"]

    await client.post(
        f"/api/marketplace/assets/{asset_id}/buy",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    second = await client.post(
        f"/api/marketplace/assets/{asset_id}/buy",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert second.status_code == 409


# ---------------------------------------------------------------------------
# Tests – Analytics (Watch-time)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_record_watch_event(client, creator_token):
    """A watch event should be recorded and return the correct earnings."""
    # Get creator's user ID from /me
    me = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {creator_token}"}
    )
    creator_id = me.json()["id"]

    resp = await client.post(
        "/api/analytics/watch-event",
        json={
            "video_id": "abc123xyz00",
            "creator_user_id": creator_id,
            "seconds_watched": 600,  # 10 minutes
            "locale": "en-US",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["seconds_watched"] == 600
    # 10 minutes × $0.002/min = $0.02
    assert decimal.Decimal(str(data["creator_earnings_usd"])) == decimal.Decimal("0.0200")
