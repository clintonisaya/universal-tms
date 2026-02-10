import requests
import sys

# specific to the user's environment, adjust if necessary (e.g., port)
BASE_URL = "http://localhost:8000"

def check_endpoint():
    url = f"{BASE_URL}/api/v1/maintenance"
    print(f"Testing URL: {url}")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success! Endpoint is reachable.")
            # print("Response preview:", response.json())
        elif response.status_code == 404:
            print("Error: 404 Not Found. The endpoint URL might be incorrect or the server is misconfigured.")
        else:
            print(f"Error: Unexpected status code {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is it running on localhost:8000?")

if __name__ == "__main__":
    check_endpoint()
