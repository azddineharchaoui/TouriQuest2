"""
OAuth2 Service for Multiple Providers
Handles OAuth authentication with Google, Facebook, Apple, Twitter
"""
import json
from typing import Dict, Optional, Any
from datetime import datetime

import httpx
from fastapi import HTTPException

from ..models import OAuthProvider
from ..schemas import OAuthLoginRequest


class OAuthConfig:
    """OAuth configuration for different providers"""
    
    GOOGLE = {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "user_info_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"]
    }
    
    FACEBOOK = {
        "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "user_info_url": "https://graph.facebook.com/v18.0/me",
        "scopes": ["email", "public_profile"]
    }
    
    APPLE = {
        "auth_url": "https://appleid.apple.com/auth/authorize",
        "token_url": "https://appleid.apple.com/auth/token",
        "user_info_url": None,  # Apple uses JWT token for user info
        "scopes": ["name", "email"]
    }
    
    TWITTER = {
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "user_info_url": "https://api.twitter.com/2/users/me",
        "scopes": ["tweet.read", "users.read"]
    }


class OAuthService:
    """OAuth service for handling multiple providers"""
    
    def __init__(self, client_configs: Dict[str, Dict[str, str]]):
        """
        Initialize with client configurations
        client_configs format:
        {
            "google": {"client_id": "...", "client_secret": "..."},
            "facebook": {"client_id": "...", "client_secret": "..."},
            ...
        }
        """
        self.client_configs = client_configs
    
    def get_authorization_url(
        self, 
        provider: OAuthProvider, 
        redirect_uri: str, 
        state: Optional[str] = None
    ) -> str:
        """Generate OAuth authorization URL"""
        
        config = self._get_provider_config(provider)
        client_config = self.client_configs.get(provider.value)
        
        if not client_config:
            raise HTTPException(
                status_code=400, 
                detail=f"OAuth provider {provider.value} not configured"
            )
        
        params = {
            "client_id": client_config["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(config["scopes"])
        }
        
        if state:
            params["state"] = state
        
        # Provider-specific parameters
        if provider == OAuthProvider.GOOGLE:
            params["access_type"] = "offline"
            params["prompt"] = "consent"
        elif provider == OAuthProvider.APPLE:
            params["response_mode"] = "form_post"
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{config['auth_url']}?{query_string}"
    
    async def exchange_code_for_token(
        self, 
        provider: OAuthProvider, 
        code: str, 
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        
        config = self._get_provider_config(provider)
        client_config = self.client_configs.get(provider.value)
        
        if not client_config:
            raise HTTPException(
                status_code=400, 
                detail=f"OAuth provider {provider.value} not configured"
            )
        
        data = {
            "client_id": client_config["client_id"],
            "client_secret": client_config["client_secret"],
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(config["token_url"], data=data)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for token: {response.text}"
                )
            
            return response.json()
    
    async def get_user_info(
        self, 
        provider: OAuthProvider, 
        access_token: str
    ) -> Dict[str, Any]:
        """Get user information from OAuth provider"""
        
        config = self._get_provider_config(provider)
        
        if provider == OAuthProvider.APPLE:
            # Apple doesn't provide user info endpoint, user data comes in ID token
            return self._decode_apple_id_token(access_token)
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Provider-specific user info URL parameters
        params = {}
        if provider == OAuthProvider.FACEBOOK:
            params["fields"] = "id,name,email,first_name,last_name,picture"
        elif provider == OAuthProvider.TWITTER:
            params["user.fields"] = "id,name,username,profile_image_url"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                config["user_info_url"], 
                headers=headers, 
                params=params
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get user info: {response.text}"
                )
            
            user_data = response.json()
            return self._normalize_user_data(provider, user_data)
    
    def _get_provider_config(self, provider: OAuthProvider) -> Dict[str, Any]:
        """Get configuration for OAuth provider"""
        config_map = {
            OAuthProvider.GOOGLE: OAuthConfig.GOOGLE,
            OAuthProvider.FACEBOOK: OAuthConfig.FACEBOOK,
            OAuthProvider.APPLE: OAuthConfig.APPLE,
            OAuthProvider.TWITTER: OAuthConfig.TWITTER
        }
        
        return config_map.get(provider)
    
    def _normalize_user_data(
        self, 
        provider: OAuthProvider, 
        raw_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Normalize user data from different providers"""
        
        normalized = {
            "provider": provider.value,
            "provider_user_id": None,
            "email": None,
            "first_name": None,
            "last_name": None,
            "full_name": None,
            "avatar_url": None,
            "username": None,
            "raw_data": raw_data
        }
        
        if provider == OAuthProvider.GOOGLE:
            normalized.update({
                "provider_user_id": raw_data.get("id"),
                "email": raw_data.get("email"),
                "first_name": raw_data.get("given_name"),
                "last_name": raw_data.get("family_name"),
                "full_name": raw_data.get("name"),
                "avatar_url": raw_data.get("picture"),
                "username": raw_data.get("email")
            })
        
        elif provider == OAuthProvider.FACEBOOK:
            normalized.update({
                "provider_user_id": raw_data.get("id"),
                "email": raw_data.get("email"),
                "first_name": raw_data.get("first_name"),
                "last_name": raw_data.get("last_name"),
                "full_name": raw_data.get("name"),
                "avatar_url": raw_data.get("picture", {}).get("data", {}).get("url"),
                "username": raw_data.get("email")
            })
        
        elif provider == OAuthProvider.APPLE:
            # Apple user data comes from ID token
            normalized.update({
                "provider_user_id": raw_data.get("sub"),
                "email": raw_data.get("email"),
                "first_name": raw_data.get("given_name"),
                "last_name": raw_data.get("family_name"),
                "full_name": f"{raw_data.get('given_name', '')} {raw_data.get('family_name', '')}".strip(),
                "username": raw_data.get("email")
            })
        
        elif provider == OAuthProvider.TWITTER:
            data = raw_data.get("data", {})
            normalized.update({
                "provider_user_id": data.get("id"),
                "username": data.get("username"),
                "full_name": data.get("name"),
                "avatar_url": data.get("profile_image_url")
            })
        
        return normalized
    
    def _decode_apple_id_token(self, id_token: str) -> Dict[str, Any]:
        """Decode Apple ID token (simplified - in production use proper JWT verification)"""
        try:
            import jwt
            # In production, verify signature with Apple's public keys
            # For now, just decode without verification for demo
            decoded = jwt.decode(id_token, options={"verify_signature": False})
            return decoded
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decode Apple ID token: {str(e)}"
            )
    
    async def refresh_access_token(
        self, 
        provider: OAuthProvider, 
        refresh_token: str
    ) -> Dict[str, Any]:
        """Refresh OAuth access token"""
        
        config = self._get_provider_config(provider)
        client_config = self.client_configs.get(provider.value)
        
        if not client_config or not refresh_token:
            raise HTTPException(
                status_code=400, 
                detail="Cannot refresh token"
            )
        
        data = {
            "client_id": client_config["client_id"],
            "client_secret": client_config["client_secret"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(config["token_url"], data=data)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to refresh token: {response.text}"
                )
            
            return response.json()
    
    async def revoke_token(
        self, 
        provider: OAuthProvider, 
        token: str
    ) -> bool:
        """Revoke OAuth token"""
        
        # Provider-specific revocation endpoints
        revoke_urls = {
            OAuthProvider.GOOGLE: "https://oauth2.googleapis.com/revoke",
            OAuthProvider.FACEBOOK: "https://graph.facebook.com/me/permissions",
            # Apple and Twitter have different revocation mechanisms
        }
        
        revoke_url = revoke_urls.get(provider)
        if not revoke_url:
            return True  # Assume success if no revocation endpoint
        
        try:
            async with httpx.AsyncClient() as client:
                if provider == OAuthProvider.GOOGLE:
                    response = await client.post(revoke_url, data={"token": token})
                elif provider == OAuthProvider.FACEBOOK:
                    response = await client.delete(f"{revoke_url}?access_token={token}")
                
                return response.status_code == 200
        except Exception:
            return False