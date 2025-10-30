from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed

seed()  # ensure DB and sample data
client = TestClient(app)


def test_list_items_has_rating_summary():
    r = client.get("/api/items?limit=5")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert {"avg_rating", "ratings_count"} <= data[0].keys()


def test_item_detail_and_reviews_flow():
    # fetch first item
    lst = client.get("/api/items?limit=1").json()
    item_id = lst[0]["id"]

    # list reviews
    r = client.get(f"/api/items/{item_id}/reviews")
    assert r.status_code == 200
    before_cnt = len(r.json())

    # add or update a review as user 999
    r = client.post(
        f"/api/items/{item_id}/reviews",
        headers={"X-User-Id": "999"},
        json={"rating": 5, "title": "Nice", "body": "Very good quality"},
    )
    assert r.status_code == 201

    # verify count increased or stayed same if we updated
    r2 = client.get(f"/api/items/{item_id}/reviews")
    assert r2.status_code == 200
    after_cnt = len(r2.json())
    assert after_cnt >= before_cnt

    # list view shows a ratings_count integer
    r3 = client.get("/api/items?limit=1")
    assert r3.json()[0]["ratings_count"] >= 1
