import httpx
import os

class D1Wrapper:
    def __init__(self):
        self.account_id = os.getenv("CF_ACCOUNT_ID")
        self.database_id = os.getenv("CF_DATABASE_ID")
        self.api_token = os.getenv("CF_API_TOKEN")
        if not all([self.account_id, self.database_id, self.api_token]):
            raise ValueError("Missing Cloudflare D1 environment variables")
        self.url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    async def query(self, sql: str, params: list = None):
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"sql": sql, "params": params or []}
            resp = await client.post(self.url, headers=self.headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                errors = data.get("errors", [{"message": "Unknown D1 error"}])
                raise Exception(errors[0]["message"])
            return data["result"][0]["results"] if data.get("result") else []
