import requests
import json

base_url = "http://localhost:8080"
headers = {
    "apikey": "brenda123",
    "Content-Type": "application/json"
}

def create_instance():
    print("Creating 'default' instance...")
    payload = {
        "instanceName": "default",
        "token": "brenda123",
        "integration": "WHATSAPP-BAILEYS",
        "qrcode": True
    }
    try:
        res = requests.post(f"{base_url}/instance/create", headers=headers, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_instance()
