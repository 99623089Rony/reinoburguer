import requests
import json

base_url = "http://localhost:8080"
headers = {
    "apikey": "brenda123",
    "Content-Type": "application/json"
}

def test_create():
    print("Testing /instance/create...")
    payload = {"instanceName": "default", "token": "brenda123", "qrcode": True}
    res = requests.post(f"{base_url}/instance/create", headers=headers, json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")

def test_status():
    print("\nTesting /instance/connectionState/default...")
    res = requests.get(f"{base_url}/instance/connectionState/default", headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")

if __name__ == "__main__":
    try:
        test_status()
        test_create()
        test_status()
    except Exception as e:
        print(f"Error: {e}")
