"""
Load testing configuration for TouriQuest API
"""
import random
import json
from locust import HttpUser, task, between


class TouriQuestUser(HttpUser):
    """
    Simulates a typical TouriQuest user workflow
    """
    wait_time = between(1, 5)
    
    def on_start(self):
        """Login user and get authentication token"""
        self.login()
    
    def login(self):
        """Authenticate user"""
        response = self.client.post("/api/v1/auth/login", json={
            "email": f"test-user-{random.randint(1, 1000)}@example.com",
            "password": "test-password"
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    @task(3)
    def search_properties(self):
        """Search for properties"""
        params = {
            "location": random.choice(["Marrakech", "Casablanca", "Fez", "Rabat"]),
            "check_in": "2024-12-01",
            "check_out": "2024-12-05",
            "guests": random.randint(1, 4),
            "max_price": random.randint(100, 500)
        }
        
        with self.client.get("/api/v1/properties/search", 
                           params=params, 
                           catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "properties" in data:
                    response.success()
                else:
                    response.failure("No properties in response")
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(2)
    def discover_pois(self):
        """Discover points of interest"""
        params = {
            "location": random.choice(["Marrakech", "Casablanca", "Fez"]),
            "category": random.choice(["museums", "restaurants", "attractions", "nature"]),
            "radius": random.randint(5, 20)
        }
        
        self.client.get("/api/v1/pois/discover", params=params)
    
    @task(1)
    def search_experiences(self):
        """Search for experiences"""
        params = {
            "location": random.choice(["Marrakech", "Casablanca", "Fez"]),
            "category": random.choice(["cultural", "adventure", "food", "wellness"]),
            "date": "2024-12-01"
        }
        
        self.client.get("/api/v1/experiences/search", params=params)
    
    @task(1)
    def ai_chat(self):
        """Interact with AI assistant"""
        messages = [
            "What are the best places to visit in Morocco?",
            "Can you recommend a good restaurant in Marrakech?",
            "I'm looking for adventure activities in Atlas Mountains",
            "What's the weather like in Casablanca?",
            "Help me plan a 3-day itinerary for Fez"
        ]
        
        self.client.post("/api/v1/ai/chat", json={
            "message": random.choice(messages),
            "context": {"location": "Morocco"}
        })
    
    @task(1)
    def get_recommendations(self):
        """Get personalized recommendations"""
        self.client.get("/api/v1/recommendations/properties")
    
    @task(1)
    def view_property_details(self):
        """View property details"""
        # Simulate viewing a property
        property_id = random.randint(1, 1000)
        self.client.get(f"/api/v1/properties/{property_id}")
    
    @task(1)
    def check_notifications(self):
        """Check user notifications"""
        self.client.get("/api/v1/notifications")


class AdminUser(HttpUser):
    """
    Simulates admin user workflows
    """
    wait_time = between(2, 8)
    weight = 1  # Lower weight compared to regular users
    
    def on_start(self):
        """Login admin user"""
        response = self.client.post("/api/v1/auth/login", json={
            "email": "admin@touriquest.com",
            "password": "admin-password"
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    @task(3)
    def view_dashboard(self):
        """View admin dashboard"""
        self.client.get("/api/v1/admin/dashboard")
    
    @task(2)
    def view_analytics(self):
        """View analytics data"""
        params = {
            "start_date": "2024-11-01",
            "end_date": "2024-11-30",
            "metric": random.choice(["revenue", "bookings", "users", "properties"])
        }
        self.client.get("/api/v1/admin/analytics", params=params)
    
    @task(1)
    def moderate_content(self):
        """Content moderation tasks"""
        self.client.get("/api/v1/admin/moderate/pending")
    
    @task(1)
    def view_system_health(self):
        """Check system health"""
        self.client.get("/api/v1/admin/health")


class HighLoadUser(HttpUser):
    """
    Simulates high-load scenarios for stress testing
    """
    wait_time = between(0.1, 0.5)  # Very short wait times
    weight = 1  # Can be increased for stress testing
    
    def on_start(self):
        """Quick login"""
        self.client.verify = False  # Skip SSL verification for faster requests
    
    @task(5)
    def rapid_search(self):
        """Rapid property searches"""
        params = {
            "location": "Marrakech",
            "check_in": "2024-12-01",
            "check_out": "2024-12-02",
            "guests": 2
        }
        self.client.get("/api/v1/properties/search", params=params)
    
    @task(3)
    def rapid_poi_requests(self):
        """Rapid POI requests"""
        self.client.get("/api/v1/pois/discover?location=Marrakech&radius=10")
    
    @task(2)
    def health_checks(self):
        """Health check endpoints"""
        self.client.get("/health")
        self.client.get("/api/v1/health")


# Load testing scenarios
class NormalTrafficScenario(TouriQuestUser):
    """Normal traffic simulation"""
    weight = 70  # 70% of traffic


class PeakTrafficScenario(TouriQuestUser):
    """Peak traffic simulation"""
    weight = 20  # 20% of traffic
    wait_time = between(0.5, 2)  # Faster interactions during peak


class AdminTrafficScenario(AdminUser):
    """Admin traffic simulation"""
    weight = 5  # 5% of traffic


class StressTestScenario(HighLoadUser):
    """Stress testing simulation"""
    weight = 5  # 5% of traffic for stress testing