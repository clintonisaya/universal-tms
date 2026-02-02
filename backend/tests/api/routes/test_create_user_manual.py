import requests
import sys

def test_create_user():
    try:
        # 1. Login
        login_resp = requests.post(
            'http://localhost:8000/api/v1/login/access-token', 
            data={'username':'admin', 'password':'changethis'}
        )
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.text}")
            return

        token = login_resp.json()['access_token']
        print(f"Got token: {token[:10]}...")

        # 2. Create User
        user_data = {
            'username': 'testuser_manual@example.com', 
            'password': 'password123', 
            'full_name': 'Test User Manual', 
            'role': 'manager'
        }
        create_resp = requests.post(
            'http://localhost:8000/api/v1/users/', 
            json=user_data, 
            headers={'Authorization': f'Bearer {token}'}
        )
        
        print(f"Create User Response Code: {create_resp.status_code}")
        print(f"Create User Response Body: {create_resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_create_user()
