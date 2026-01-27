import requests
import json

base_url = "http://localhost:8080"
headers = {
    "apikey": "brenda123",
    "Content-Type": "application/json"
}

def test_endpoint(name, method, path, payload=None):
    print(f"Testing {name} ({method} {path})...")
    url = f"{base_url}{path}"
    try:
        if method == "POST":
            res = requests.post(url, headers=headers, json=payload, timeout=10)
        else:
            res = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:200]}")
        return res
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    # Test Root
    test_endpoint("Root", "GET", "/")
    
    # Test Create (This is what fails with 404/400 in browser/logs)
    test_endpoint("Create", "POST", "/instance/create", {
        "instanceName": "default",
        "token": "brenda123",
        "qrcode": True
    })
    
    # Test Status
    test_endpoint("Status", "GET", "/instance/connectionState/default")
